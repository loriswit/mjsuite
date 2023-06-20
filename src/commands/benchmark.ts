import {Engine, EngineId} from "./engine.js"
import {Workload, WorkloadId} from "./workload.js"
import {docker} from "../services/docker.js"
import {logger} from "../utils/logger.js"
import {dirname, resolve} from "path"
import {mkdir, unlink, writeFile} from "fs/promises"
import {Writable} from "stream"
import {toPascalCase} from "../utils/helpers.js"

export type EventId = string
export type PerfStat = Record<EventId, number>
export type Stats = Record<WorkloadId, Record<EngineId, PerfStat>>

export class Benchmark {
    private readonly workloads: Workload[]
    private readonly engines: Engine[]

    public constructor(workload: Workload | Workload[], engine: Engine | Engine[]) {
        this.workloads = Array.isArray(workload) ? workload : [workload]
        this.engines = Array.isArray(engine) ? engine : [engine]
    }

    /**
     * Runs all provided workloads with all provided engines.
     */
    public async run(): Promise<Stats> {
        const stats: Stats = {}
        for (const workload of this.workloads) {
            const workloadKey = toPascalCase(workload.id)
            stats[workloadKey] = {}
            for (const engine of this.engines) {
                if (this.workloads.length > 1 || this.engines.length > 1)
                    logger.debug("\n====================\n")
                const engineKey = toPascalCase(engine.id)
                stats[workloadKey][engineKey] = await gatherStats(workload, engine)
            }
        }
        return stats
    }
}

async function gatherStats(workload: Workload, engine: Engine): Promise<PerfStat> {
    if (!await docker.imageExists(engine.imageName))
        await engine.setup()

    logger.info(`Running workload '${workload.id}' with engine ${engine.name}`)

    const filename = `${workload.id}__${engine.id}__${new Date().getTime()}.tmp.js`
    const workloadFile = resolve(PKG_ROOT, "workloads", "tmp", filename)
    await mkdir(dirname(workloadFile), {recursive: true})
    await writeFile(workloadFile, workload.compile(engine))

    // if μJSuite is running inside Docker, use host path as mount source
    const mountSourcePath = process.env.MOUNT_SRC
        ? workloadFile.replace(PKG_ROOT, process.env.MOUNT_SRC)
        : workloadFile

    try {
        logger.info("> Gathering performance stats")
        let output = await runCommand(["perf", "stat", "-x,"], engine, mountSourcePath)

        const perfLines = output.split(/\n(?=\S)/).slice(-8) // get last 8 lines
        const stats = Object.fromEntries(perfLines.map(line => {
            const cells = line.split(",")
            const value = parseFloat(cells[0].replace(/^>?/, "")) // remove trailing prompt
            const eventName = toPascalCase(cells[2].replace(/:.*$/, ""))
            return [eventName, value]
        }))
        stats.runTime = parseInt(perfLines[0].split(",")[3])

        logger.info("> Gathering memory usage")
        output = await runCommand(["time", "-v"], engine, mountSourcePath)

        const maxMemory = output.match(/^\s*Maximum resident set size \(kbytes\): (\d+)/m)?.[1]
        if (!maxMemory) throw new Error("Failed to measure max memory usage")
        stats.maxMemory = parseInt(maxMemory) * 1000

        return stats

    } finally {
        await unlink(workloadFile)
    }
}

async function runCommand(command: string[], engine: Engine, workloadFile: string): Promise<string> {
    let output = ""
    const containerStream = new Writable({
        write: (chunk: Buffer, _, next) => {
            logger.debug(chunk, {raw: true})
            output += chunk.toString()
            next()
        },
    })

    const [{StatusCode: exitCode}] = (await docker.run(
        engine.imageName,
        ["/mjsuite/workload.js"],
        containerStream,
        {
            Entrypoint: [...command, engine.entrypoint],
            HostConfig: {
                Mounts: [{
                    Type: "bind",
                    Source: workloadFile,
                    Target: "/mjsuite/workload.js",
                }],
                AutoRemove: true,
                SecurityOpt: ["seccomp=unconfined"],
            },
        }))

    if (exitCode !== 0)
        throw new Error(`Failed to run engine (exit code: ${exitCode})`)

    return output
}
