import {program} from "commander"

import "./utils/globals.js"
import {logger, LogLevel} from "./utils/logger.js"
import {Engine} from "./engine.js"
import {Workload} from "./workload.js"

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
    .description("Generate a benchmark for one engine and one workload")
    .summary("generate a benchmark")
    .argument("<engine>", "the engine to use")
    .argument("<workload>", "the workload to run")
    .action(actionWrapper(async (engineId, workloadId) => {
        const engine = new Engine(engineId)
        const workload = new Workload(workloadId)

        await engine.run(workload)
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
    .action(actionWrapper(async (engineId) => new Engine(engineId).setup()))


const workloadCmd = program
    .command("workload").alias("wl")
    .description("Manage workloads")
    .summary("manage workloads")

workloadCmd
    .command("list")
    .description("List all available workloads")
    .summary("list available workloads")
    .action(actionWrapper(async () => logger.table(await Workload.listAll())))

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
