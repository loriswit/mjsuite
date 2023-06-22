import {writeFile} from "fs/promises"
import {createReadStream, createWriteStream} from "fs"
import {Decompressor} from "lzma-native"
import tar from "tar"

/**
 * Converts a string to PascalCase. Example: "array-sort" -> "arraySort"
 * @param str The input string
 */
export function toPascalCase(str: string): string {
    return str.replaceAll(/-(\w)/g, (_, x) => x.toUpperCase())
}

/**
 * Returns the current time and date formatted as 'YYYY-MM-DD_HH-MM-SS'.
 */
export function timestamp(): string {
    return new Date().toISOString()
        .replaceAll(":", "-")
        .replace("T", "_")
        .replace(/\..*/, "")
}

/**
 * Downloads a file from the Internet.
 * @param url The target URL
 * @param outFile The output file path
 */
export async function download(url: string, outFile: string) {
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    await writeFile(outFile, Buffer.from(data))
}

/**
 * Extracts an archive stored as a file. Supported formats: tar, tar.gz, tar.xz
 * @param file The archive file
 * @param outDir The directory in which the archive will be extracted
 */
export async function extractArchive(file: string, outDir: string) {
    if (file.endsWith("xz")) {
        const inStream = createReadStream(file)
        file = file.replace(/\.xz$/, "")
        const outStream = createWriteStream(file)
        const stream = inStream.pipe(Decompressor()).pipe(outStream)
        await new Promise((resolve, reject) => stream.on("finish", resolve).on("error", reject))
    }

    await tar.extract({file, cwd: outDir})
}
