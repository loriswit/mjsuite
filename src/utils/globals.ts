import {dirname, resolve} from "path"
import {fileURLToPath} from "url"
import {readFileSync} from "fs"

declare global {
    var PKG_ROOT: string;
    var PKG_VERSION: string;
}

globalThis.PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

const pkgBuffer = readFileSync(resolve(PKG_ROOT, "package.json"))
globalThis.PKG_VERSION = JSON.parse(pkgBuffer.toString()).version
