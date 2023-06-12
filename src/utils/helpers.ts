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
