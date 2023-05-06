import {existsSync, readFileSync} from "fs"
import {resolve} from "path"
import {github, GitRef} from "./services/github.js"
import {docker} from "./services/docker.js"
import {mkdir, readdir, rename, rm} from "fs/promises"
import tar from "tar"

function clearLine() {
    process.stdout.write(`\r${" ".repeat(process.stdout.columns)}\r`)
}

const CACHE_PATH = resolve(PKG_ROOT, "engines", "cache")

export interface EngineConfig {
    name: string
    repository: string
    version: string
    clone?: boolean
}

export class Engine {
    private readonly id: string
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
        console.log(`Setting up new engine: ${this.config.name} (${this.config.version})`)

        if(!this.ref) this.ref = await this.fetchRef()
        const enginePath = resolve(CACHE_PATH, this.ref.object.sha)

        // download source code if not available
        if (existsSync(enginePath))
            console.log("> Source code found in cache")
        else
            await this.download()

        // build Docker image
        await this.build()

        console.log(`Engine ${this.config.name} has been setup successfully`)
    }

    public async download() {
        if(!this.ref) this.ref = await this.fetchRef()

        // create cache folders if they don't exist yet
        const tmpPath = resolve(CACHE_PATH, "tmp")
        const downloadPath = resolve(tmpPath, this.ref.object.sha)
        const destinationPath = resolve(CACHE_PATH, this.ref.object.sha)
        await mkdir(downloadPath, {recursive: true})

        if (this.config.clone) {
            console.log("> Cloning source code")
            await github.clone(this.config.repository, {branch: this.config.version, depth: 1}, downloadPath)

        } else {
            console.log("> Downloading source code")
            const file = await github.downloadTarball(this.config.repository, this.ref, tmpPath)
            console.log("> Extracting source code")
            await tar.extract({file, cwd: downloadPath})
        }

        // move source code out of tmp folder
        const srcDir = (await readdir(downloadPath))[0]
        await rename(resolve(downloadPath, srcDir), destinationPath)
        await rm(tmpPath, {recursive: true})
    }

    public async build() {
        if(!this.ref) this.ref = await this.fetchRef()

        console.log("> Building image (this may take a while)")
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
                        clearLine()
                        resolve(res)
                    }
                },
                obj => {
                    if (obj.stream) {
                        const match = obj.stream.match(/^Step (\d+)\/(\d+)/)
                        if (match) {
                            clearLine()
                            process.stdout.write("  > " + obj.stream.trim())
                        }
                    } else if (obj.error) {
                        clearLine()
                        console.error(obj.error)
                        console.error(obj.errorDetail)
                        reject(obj.error)
                    }
                })
        })

        console.log("> Removing build cache")
        await docker.pruneImages({dangling: true})
    }

    public async run() {
        if (!await docker.imageExists(this.imageName))
            await this.setup()

        const [output, container] = await docker.run(this.imageName, [], process.stdout)
        await container.remove()

        if (output.StatusCode !== 0)
            throw new Error("Failed to run engine")
    }

    public get name() {
        return this.config.name
    }

    private async fetchRef() {
        console.log("> Fetching repository")
        return await github.getRef(this.config.repository, {tags: this.config.version})
    }
}
