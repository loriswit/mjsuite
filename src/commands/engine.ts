import {existsSync, readFileSync} from "fs"
import {resolve} from "path"
import {github, GitRef} from "../services/github.js"
import {docker} from "../services/docker.js"
import {mkdir, readdir, rename, rm} from "fs/promises"
import {logger} from "../utils/logger.js"
import {download, extractArchive} from "../utils/helpers.js"

const CACHE_PATH = resolve(PKG_ROOT, "engines", "cache")

export type EngineId = string

export interface EngineConfig {
    name: string
    repository: string
    version: string
    sha?: string
    clone?: boolean
    source?: string
}

export class Engine {
    public readonly id: EngineId
    public readonly imageName: string
    public readonly entrypoint: string

    private readonly config: EngineConfig
    private readonly buildFromSource: boolean
    private ref: GitRef | undefined

    public constructor(id: EngineId) {
        try {
            let buffer = readFileSync(resolve(PKG_ROOT, "engines", id, "manifest.json"), "utf-8")
            this.config = JSON.parse(buffer)
            if (!this.config.name || !this.config.repository || !this.config.version)
                throw new Error("bad manifest")

            // extract entrypoint from Dockerfile
            buffer = readFileSync(resolve(PKG_ROOT, "engines", id, "Dockerfile"), "utf-8")
            const match = buffer.match(/^\s*ENTRYPOINT \["(\w+)"]/m)
            if (!match) throw new Error("bad ENTRYPOINT in Dockerfile")
            this.entrypoint = match[1]

            // determine if the engine is being built from its source code
            this.buildFromSource = /^\s*ARG\s+srcPath\s*$/m.test(buffer)

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
            const engine = new Engine(id)
            const ready = await docker.imageExists(engine.imageName)

            logger.debug({
                id,
                config: engine.config,
                imageName: engine.imageName,
                entrypoint: engine.entrypoint,
                ready,
            })

            return {
                id,
                version: engine.config.version,
                status: ready ? `✔️ ready` : "🛠️ requires setup",
            }
        }))
    }

    public async setup() {
        logger.info(`Setting up engine: ${this.config.name} (${this.config.version})`)

        if (this.buildFromSource) {
            if (!this.ref) this.ref = await this.fetchRef()
            const enginePath = resolve(CACHE_PATH, this.ref.object.sha)

            // download source code if not available
            if (existsSync(enginePath))
                logger.info("> Source code found in cache")
            else
                await this.download()
        }

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

        try {
            if (this.config.clone) {
                logger.info("> Cloning source code")
                await github.clone(this.config.repository, {branch: this.config.version, depth: 1}, downloadPath)

            } else {
                logger.info("> Downloading source code")
                let file: string
                if (this.config.source) {
                    file = resolve(tmpPath, this.config.source.split("/").pop() as string)
                    await download(this.config.source, file)
                } else
                    file = await github.downloadTarball(this.config.repository, this.ref, tmpPath)

                logger.info("> Extracting source code")
                await extractArchive(file, downloadPath)
            }

            // move source code out of tmp folder
            const srcDir = (await readdir(downloadPath))[0]
            await rename(resolve(downloadPath, srcDir), destinationPath)

        } finally {
            await rm(tmpPath, {recursive: true})
        }
    }

    public async build() {
        if (!this.ref) this.ref = await this.fetchRef()

        logger.info("> Building image (this may take a while)")
        const srcPath = `cache/${this.ref.object.sha}`
        const dockerfile = `${this.id}/Dockerfile`
        const buildStream = await docker.buildImage({
            context: resolve(PKG_ROOT, "engines"),
            src: this.buildFromSource ? [dockerfile, srcPath] : [dockerfile],
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
        if (this.config.sha)
            return {object: {sha: this.config.sha}}

        logger.info("> Fetching repository")
        const ref = await github.getRef(this.config.repository, {tags: this.config.version})
        if (!ref.object?.sha)
            throw new Error(`Invalid git tag: ${this.config.version} (use the 'sha' property to override tag)`)
        return ref
    }
}
