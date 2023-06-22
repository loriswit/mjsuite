import {OptionValues, program} from "commander"
import {readFile, writeFile} from "fs/promises"

import "./utils/globals.js"
import {logger, LogLevel} from "./utils/logger.js"
import {Engine, EngineId} from "./commands/engine.js"
import {Workload, WorkloadId} from "./commands/workload.js"
import {Benchmark} from "./commands/benchmark.js"
import {Plot} from "./commands/plot.js"
import {timestamp} from "./utils/helpers.js"

program
    .name("mjsuite")
    .description("μJSuite is a tool to benchmark IoT-friendly JavaScript engines")
    .version(PKG_VERSION)
    .option("-v, --verbose", "print additional details for debugging purpose")
    .configureOutput({
        writeOut: str => logger.info(str),
        writeErr: str => logger.error(str),
    })

program
    .command("benchmark").alias("bm")
    .description("Generate a benchmark for all workloads and all engines and store results in a JSON file.\n" +
        "You can also specify which workloads and engines to run.")
    .summary("generate a benchmark")
    .option("-w, --workload <workloads...>", "the workload(s) to run (default: all)")
    .option("-e, --engine <engines...>", "the engine(s) to use (default: all)")
    .option("-o, --output <filename>", "the output file that will store the results")
    .option("-p, --plot", "displays plots once the benchmark is generated")
    .action(actionWrapper(async (options: OptionValues) => {
        const engineIds = options.engine ?? await Engine.getAllIds()
        const engines = engineIds.map((id: EngineId) => new Engine(id))

        const workloadIds = options.workload ?? await Workload.getAllIds()
        const workloads = workloadIds.map((id: WorkloadId) => new Workload(id))

        const benchmark = new Benchmark(workloads, engines)
        const results = await benchmark.run()

        const filename = `benchmark_${timestamp()}.json`
        const data = JSON.stringify(results, null, 4)
        await writeFile(filename, data)
        logger.info("Saved results to " + filename)

        if (options.plot) {
            logger.info("-------------------------------")
            new Plot(results).show()
        }
    }))

const engineCmd = program
    .command("engine")
    .description("Manage JavaScript engines")
    .summary("manage engines")

engineCmd
    .command("list")
    .description("List all available JavaScript engines")
    .summary("list available engines")
    .action(actionWrapper(async () => logger.table(await Engine.listAll())))

engineCmd
    .command("setup")
    .description("Download and build (or rebuild) one of the available JavaScript engines")
    .summary("setup an engine")
    .argument("<engine>", "the engine to setup")
    .action(actionWrapper(async engineId => new Engine(engineId).setup()))


const workloadCmd = program
    .command("workload").alias("wl")
    .description("Manage workloads")
    .summary("manage workloads")

workloadCmd
    .command("list")
    .description("List all available workloads")
    .summary("list available workloads")
    .action(actionWrapper(async () => logger.table(await Workload.listAll())))

program
    .command("plot")
    .description("Generate and display plots for a benchmark.")
    .summary("draw plots")
    .argument("<benchmark>", "a benchmark JSON file")
    .action(actionWrapper(async benchmarkFile => {
        const json = await readFile(benchmarkFile, "utf-8")
        const benchmark = JSON.parse(json)
        new Plot(benchmark).show()
    }))

program.on("option:verbose", () => logger.logLevel = LogLevel.DEBUG)

program.parse()

function actionWrapper(action: (...args: any[]) => void | Promise<void>) {
    return async (...args: any[]) => {
        try {
            await action(...args)
        } catch (error: any) {
            if (error.code === "ENOENT" && error.syscall === "connect")
                logger.error("Connection to Docker Engine failed")
            else {
                logger.error("An error occurred!")
                logger.error(error.message)
            }
            logger.debug(error)
            logger.debug(error.stack)
            process.exit(1)
        }
    }
}
