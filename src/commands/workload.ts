import {existsSync, readFileSync} from "fs"
import {readdir, readFile} from "fs/promises"
import {resolve} from "path"
import {Engine} from "./engine.js"
import {logger} from "../utils/logger.js"

export type WorkloadId = string

export class Workload {
    public readonly id: WorkloadId
    private readonly sourceCode: string

    public constructor(id: WorkloadId) {
        try {
            this.sourceCode = readFileSync(resolve(PKG_ROOT, "workloads", `${id}.js`), "utf-8")
        } catch (e: any) {
            throw new Error(`Invalid workload '${id}' (${e.message})`)
        }

        this.id = id
    }

    /**
     * Compiles the source code for a specific engine and returns the generated source code.
     * If no engine is provided, returns the source code as is.
     * @param engine The target JavaScript engine
     */
    public compile(engine?: Engine): string {
        if (!engine) return this.sourceCode

        const templateFile = resolve(PKG_ROOT, "engines", engine.id, "template.js")
        if (!existsSync(templateFile)) {
            logger.debug(`No workload template found for ${engine.id}\n> ${templateFile}`)
            return this.sourceCode
        }

        const template = readFileSync(templateFile, "utf-8")
        return template.replace(/\$\{\s*workload\s*}/, this.sourceCode)
    }

    public static async getAllIds(): Promise<WorkloadId[]> {
        const workloadsRoot = resolve(PKG_ROOT, "workloads")
        return (await readdir(workloadsRoot))
            .filter(filename => filename.endsWith(".js"))
            .map(filename => filename.replace(/\.js$/, ""))
            .sort((a, b) => a.localeCompare(b))
    }

    public static async listAll(): Promise<{ id: string, lines: number }[]> {
        const ids = await Workload.getAllIds()

        return await Promise.all(ids.map(async id => {
            const buf = await readFile(resolve(PKG_ROOT, "workloads", id + ".js"))
            const lines = buf.toString().split("\n").length
            return {id, lines}
        }))
    }
}
