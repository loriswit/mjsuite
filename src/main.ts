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

program.on("option:verbose", () => logger.logLevel = LogLevel.DEBUG)

program.parse()

function actionWrapper(action: (...args: any[]) => void | Promise<void>) {
    return async (...args: any[]) => {
        try {
            await action(...args)
        } catch (error: any) {
            logger.error("An error occurred!")
            logger.error(error.message)
            logger.debug(error.stack)
            process.exit(1)
        }
    }
}
