import {existsSync, readFileSync} from "fs"
import {resolve} from "path"
import {github, GitRef} from "../services/github.js"
import {docker} from "../services/docker.js"
import {mkdir, readdir, readFile, rename, rm} from "fs/promises"
import tar from "tar"
import {logger} from "../utils/logger.js"

const CACHE_PATH = resolve(PKG_ROOT, "engines", "cache")

export type EngineId = string

export interface EngineConfig {
    name: string
    repository: string
    version: string
    clone?: boolean
}

export class Engine {
    public readonly id: EngineId
    public readonly imageName: string

    private readonly config: EngineConfig
    private ref: GitRef | undefined

    public constructor(id: EngineId) {
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

    public get name() {
        return this.config.name
    }

    public static async getAllIds(): Promise<EngineId[]> {
        const enginesRoot = resolve(PKG_ROOT, "engines")
        return (await readdir(enginesRoot))
            .filter(id => existsSync(resolve(enginesRoot, id, "manifest.json")))
            .sort((a, b) => a.localeCompare(b))
    }

    public static async listAll(): Promise<{ id: string, version: string, status: string }[]> {
        const ids = await Engine.getAllIds()

        return await Promise.all(ids.map(async id => {
            const manifest = resolve(PKG_ROOT, "engines", id, "manifest.json")
            const config = JSON.parse((await readFile(manifest)).toString())

            const imageName = `mjsuite/${id}:${config.version}`
            const ready = await docker.imageExists(imageName)

            return {
                id,
                version: config.version,
                status: ready ? `✔️ ready` : "🛠️ requires setup",
            }
        }))
    }

    public async setup() {
        logger.info(`Setting up engine: ${this.config.name} (${this.config.version})`)

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
     * Starts the engine.
     */
    public async run() {
        logger.info(`Running engine ${this.name}`)

        const [{StatusCode: exitCode}] = await docker.run(this.imageName, [],
            [logger.stream.info, logger.stream.error],
            {Tty: false, HostConfig: {AutoRemove: true, SecurityOpt: ["seccomp=unconfined"]}})

        if (exitCode !== 0)
            throw new Error("Failed to run engine")
    }

    private async fetchRef() {
        logger.info("> Fetching repository")
        return await github.getRef(this.config.repository, {tags: this.config.version})
    }
}
