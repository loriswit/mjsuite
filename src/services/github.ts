import {docker} from "./docker.js"
import {resolve} from "path"
import {writeFile} from "fs/promises"
import {logger} from "../utils/logger.js"

const GITHUB_API_ROOT = "https://api.github.com"
const GIT_IMAGE = "alpine/git"

export type GitOptions = Record<string, string | boolean | number>
export type GitRef = { object: { sha: string } }
export type GitRefQuery = { heads: string } | { tags: string }

export class GitHub {
    public async clone(repository: string, options: GitOptions = {}, destinationPath = process.cwd()): Promise<void> {
        if (!await docker.imageExists(GIT_IMAGE)) {
            const pullStream = await docker.pull(GIT_IMAGE)
            await new Promise((resolve, reject) =>
                docker.modem.followProgress(pullStream, (err, res) => err ? reject(err) : resolve(res)))
        }

        const url = `https://github.com/${repository}.git`
        const cmd = ["clone", ...this.formatOptions(options), url]
        const [output, container] = await docker.run("alpine/git", cmd, logger.stream.debug,
            {HostConfig: {Mounts: [{Type: "bind", Source: destinationPath, Target: "/git"}]}})

        await container.remove
        if (output.StatusCode !== 0)
            throw new Error("Failed to clone source code")
    }

    public async downloadTarball(repository: string, ref: GitRef, destinationPath = process.cwd()): Promise<string> {
        const response = await fetch(`https://api.github.com/repos/${repository}/tarball/${ref.object.sha}`)
        const data = await response.arrayBuffer()

        const filename = resolve(destinationPath, `${ref.object.sha}.tar.gz`)
        await writeFile(filename, Buffer.from(data))
        return filename
    }

    public async getRef(repository: string, ref: GitRefQuery): Promise<GitRef> {
        const refStr = Object.entries(ref)[0].join("/")
        const response = await fetch(`${GITHUB_API_ROOT}/repos/${repository}/git/ref/${refStr}`)
        return response.json()
    }

    private formatOptions(options: GitOptions): string[] {
        return Object.entries(options)
            .map(([key, val]) => (["--" + key, val.toString()]))
            .flat()
    }
}

export const github = new GitHub()
