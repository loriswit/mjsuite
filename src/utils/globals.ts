import {dirname, resolve} from "path"
import {fileURLToPath} from "url"

declare global {
    var PKG_ROOT: string;
}

globalThis.PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
