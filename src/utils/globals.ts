import {dirname, resolve} from "path"
import {fileURLToPath} from "url"
import {readFileSync} from "fs"

declare global {
    var PKG_ROOT: string
    var PKG_VERSION: string
    var IN_CONTAINER: boolean
}

globalThis.PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

const pkgBuffer = readFileSync(resolve(PKG_ROOT, "package.json"))
globalThis.PKG_VERSION = JSON.parse(pkgBuffer.toString()).version

// set to true if running inside docker
globalThis.IN_CONTAINER = !!process.env.MOUNT_SRC
