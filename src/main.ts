import "./utils/globals.js"
import {Engine} from "./engine.js"
import {logger, LogLevel} from "./utils/logger.js"

try {
    if (process.argv.length < 3)
        throw new Error("usage: mjsuite <engine> [--debug]")

    if (process.argv[3] === "--debug")
        logger.logLevel = LogLevel.DEBUG

    const engine = new Engine(process.argv[2])
    logger.info(`Running engine ${engine.name}...`)
    await engine.run()

} catch (error: any) {
    logger.error("An error occurred!")
    logger.error(error.message)
    process.exit(1)
}
