import {logger} from "./logger.js"

/**
 * Wraps a command action so that errors can be caught.
 * @param action The command action
 */
export function actionWrapper(action: (...args: any[]) => void | Promise<void>) {
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

/**
 * Parse list of filtered engines/workloads.
 * @param items The provided values
 * @param all All possible values
 */
export function parseFilter<T extends string>(items: T[] | undefined, all: T[]) {
    if (items) {
        const included = items
            .filter((id: T) => !id.startsWith("!"))
        const excluded = items
            .filter((id: T) => id.startsWith("!"))
            .map((id: T) => id.slice(1))

        if (excluded.length)
            return [...new Set([...included, ...all.filter(id => !excluded.includes(id))])]
        else
            return included
    }
    else
        return all
}
