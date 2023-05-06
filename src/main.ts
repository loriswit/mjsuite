import "./utils/globals.js"
import {Engine} from "./engine.js"

try {
    if (process.argv.length < 3)
        throw new Error("usage: mjsuite <engine>")

    const engine = new Engine(process.argv[2])

    console.log(`Running engine ${engine.name}...`)
    await engine.run()

} catch (error: any) {
    console.error("An error occurred!")
    console.error(error.message)
    process.exit(1)
}
