import {existsSync, readFileSync} from "fs"
import {readdir, readFile} from "fs/promises"
import {resolve} from "path"
import {Engine} from "./engine.js"
import {logger} from "./utils/logger.js"

export class Workload {
    public readonly id: string
    private readonly sourceCode: string

    public constructor(id: string) {
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

    public static async listAll(): Promise<{ id: string, lines: number }[]> {
        const workloadsRoot = resolve(PKG_ROOT, "workloads")
        const workloadFiles = (await readdir(workloadsRoot)).filter(id => id.endsWith(".js"))
        workloadFiles.sort((a, b) => a.localeCompare(b))

        return await Promise.all(workloadFiles.map(async id => {
            const buf = await readFile(resolve(workloadsRoot, id))
            return {
                id: id.replace(/\.js$/, ""),
                lines: buf.toString().split("\n").length,
            }
        }))
    }
}
