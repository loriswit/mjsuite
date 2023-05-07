#!/usr/bin/env node

import { spawnSync } from "child_process"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

const log = (...data) => console.log(`\x1b[94m${data.join(" ")}\x1b[0m`)
const debug = (...data) => console.log(`\x1b[90m${data.join(" ")}\x1b[0m`)
const error = (...data) => console.log(`\x1b[31m${data.join(" ")}\x1b[0m`)

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

log("Welcome to μJSuite!")
log("Performing first-time setup")

try {
    log("> Installing dependencies")
    runNpm("ci")

    log("> Compiling source code")
    runNpm("run", "build")

    log("> Removing build cache")
    runNpm("prune", "--production")

    log("Setup complete\n")

} catch(e) {
    error(`An error occurred: ${e.message}`)
    process.exit(1)
}

function runNpm(...args) {
    const cmd = process.platform === "win32" ? "npm.cmd" : "npm"
    const {stdout, stderr, status} = spawnSync(cmd, args, {cwd: PKG_ROOT})
    if (process.argv.includes("--debug")) debug(stdout.toString())
    if (status !== 0) throw new Error(stderr.toString())
}
