import "./utils/globals.js"
import {Engine} from "./engine.js"
import {logger, LogLevel} from "./utils/logger.js"
import {Workload} from "./workload.js";

try {
    if (process.argv.length < 4)
        throw new Error("usage: mjsuite <engine> <workload> [--debug]")

    const args = process.argv.filter(arg => !arg.startsWith("-"))
    const engineId = args[2]
    const workloadId = args[3]

    const options = process.argv
        .filter(arg => arg.startsWith("-"))
        .map(option => option.replace(/^--?/, ""))

    if (options.includes("debug"))
        logger.logLevel = LogLevel.DEBUG

    const engine = new Engine(engineId)
    const workload = new Workload(workloadId)

    await engine.run(workload)

} catch (error: any) {
    logger.error("An error occurred!")
    logger.error(error.message)
    logger.debug(error.stack)
    process.exit(1)
}
