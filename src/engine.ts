import {existsSync, readFileSync} from "fs"
import {dirname, resolve} from "path"
import {github, GitRef} from "./services/github.js"
import {docker} from "./services/docker.js"
import {mkdir, readdir, rename, rm, unlink, writeFile} from "fs/promises"
import tar from "tar"
import {logger} from "./utils/logger.js"
import {Workload} from "./workload.js"
import {Writable} from "stream"

const CACHE_PATH = resolve(PKG_ROOT, "engines", "cache")

export interface EngineConfig {
    name: string
    repository: string
    version: string
    clone?: boolean
}

export class Engine {
    public readonly id: string

    private readonly imageName: string
    private readonly config: EngineConfig
    private ref: GitRef | undefined

    public constructor(id: string) {
        try {
            const data = readFileSync(resolve(PKG_ROOT, "engines", id, "manifest.json"), "utf-8")
            this.config = JSON.parse(data)
            if (!this.config.name || !this.config.repository || !this.config.version)
                throw new Error("bad manifest")

        } catch (e: any) {
            throw new Error(`Invalid engine '${id}' (${e.message})`)
        }

        this.id = id
        this.imageName = `mjsuite/${id}:${this.config.version}`
    }

    public async setup() {
        logger.info(`Setting up new engine: ${this.config.name} (${this.config.version})`)

        if (!this.ref) this.ref = await this.fetchRef()
        const enginePath = resolve(CACHE_PATH, this.ref.object.sha)

        // download source code if not available
        if (existsSync(enginePath))
            logger.info("> Source code found in cache")
        else
            await this.download()

        // build Docker image
        await this.build()

        logger.info(`Engine ${this.config.name} has been setup successfully`)
    }

    public async download() {
        if (!this.ref) this.ref = await this.fetchRef()

        // create cache folders if they don't exist yet
        const tmpPath = resolve(CACHE_PATH, "tmp")
        const downloadPath = resolve(tmpPath, this.ref.object.sha)
        const destinationPath = resolve(CACHE_PATH, this.ref.object.sha)
        await mkdir(downloadPath, {recursive: true})

        if (this.config.clone) {
            logger.info("> Cloning source code")
            await github.clone(this.config.repository, {branch: this.config.version, depth: 1}, downloadPath)

        } else {
            logger.info("> Downloading source code")
            const file = await github.downloadTarball(this.config.repository, this.ref, tmpPath)
            logger.info("> Extracting source code")
            await tar.extract({file, cwd: downloadPath})
        }

        // move source code out of tmp folder
        const srcDir = (await readdir(downloadPath))[0]
        await rename(resolve(downloadPath, srcDir), destinationPath)
        await rm(tmpPath, {recursive: true})
    }

    public async build() {
        if (!this.ref) this.ref = await this.fetchRef()

        logger.info("> Building image (this may take a while)")
        const srcPath = `cache/${this.ref.object.sha}`
        const dockerfile = `${this.id}/Dockerfile`
        const buildStream = await docker.buildImage({
            context: resolve(PKG_ROOT, "engines"),
            src: [dockerfile, srcPath],
        }, {
            t: this.imageName,
            buildargs: {srcPath},
            dockerfile,
        })

        await new Promise((resolve, reject) => {
            docker.modem.followProgress(buildStream,
                (err, res) => {
                    if (err) reject(err)
                    else {
                        logger.clearLine()
                        resolve(res)
                    }
                },
                progress => {
                    if (progress.stream) {
                        const match = progress.stream.match(/^Step (\d+)\/(\d+)/)
                        if (match) {
                            logger.info("  > " + progress.stream.trim(), {raw: true, clearLine: true})
                        } else
                            logger.debug("  > " + progress.stream, {raw: true})
                    } else if (progress.error) {
                        logger.clearLine()
                        logger.error(progress.error)
                        logger.error(progress.errorDetail)
                        reject(progress.error)
                    } else
                        logger.debug(progress)
                })
        })

        logger.info("> Removing build cache", {clearLine: true})
        await docker.pruneImages({dangling: true})
    }

    /**
     * Starts the engine and executes a workload, if provided.
     * @param workload The workload to run
     */
    public async run(workload?: Workload) {
        if (!await docker.imageExists(this.imageName))
            await this.setup()

        let exitCode: number

        if (workload) {
            logger.info(`Running workload '${workload.id}' with engine ${this.name}`)

            const filename = `${workload.id}__${this.id}__${new Date().getTime()}.tmp.js`
            const workloadFile = resolve(PKG_ROOT, "workloads", "tmp", filename)
            await mkdir(dirname(workloadFile), {recursive: true})
            await writeFile(workloadFile, workload.compile(this))

            let output = ""
            const containerStream = new Writable({
                write: (chunk: Buffer, _, next) => {
                    logger.debug(chunk, {raw: true})
                    output += chunk.toString()
                    next()
                },
            })

            // if μJSuite is running inside Docker, use host path as mount source
            const mountSourcePath = process.env.MOUNT_SRC
                ? workloadFile.replace(PKG_ROOT, process.env.MOUNT_SRC)
                : workloadFile

            ;[{StatusCode: exitCode}] = (await docker.run(
                this.imageName,
                ["/mjsuite/workload.js"],
                containerStream,
                {
                    HostConfig: {
                        Mounts: [{
                            Type: "bind",
                            Source: mountSourcePath,
                            Target: "/mjsuite/workload.js",
                        }],
                        AutoRemove: true,
                        SecurityOpt: ["seccomp=unconfined"],
                    },
                }))

            await unlink(workloadFile)

            const perfStat = output.split(/\n(?=\S)/).pop() // get last line
            const taskClock = perfStat?.split(",")[3]
            if (taskClock) {
                const result = Number.parseInt(taskClock) / 1000000
                logger.info(`> Workload finished in ${result} ms`)
            } else
                throw new Error("Failed to measure task duration")

        } else {
            logger.info(`Running engine ${this.name}`)

            ;[{StatusCode: exitCode}] = await docker.run(this.imageName, [],
                [logger.stream.info, logger.stream.error],
                {Tty: false, HostConfig: {AutoRemove: true}})
        }

        if (exitCode !== 0)
            throw new Error("Failed to run engine")
    }

    public get name() {
        return this.config.name
    }

    private async fetchRef() {
        logger.info("> Fetching repository")
        return await github.getRef(this.config.repository, {tags: this.config.version})
    }
}
