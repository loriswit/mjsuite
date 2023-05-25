import {Writable} from "stream"

export interface LoggerOptions {
    raw?: boolean
    clearLine?: boolean
    color?: LogColor
}

export type LogFunctions = "debug" | "info" | "warn" | "error"

export type LoggerStreams = Record<LogFunctions, Writable>

export type LogMessage = string | number | boolean | object | undefined

export enum LogColor {
    BLACK = 30,
    RED = 31,
    GREEN = 32,
    YELLOW = 33,
    BLUE = 34,
    MAGENTA = 35,
    CYAN = 36,
    WHITE = 37,
    BRIGHT_BLACK = 90,
    BRIGHT_RED = 91,
    BRIGHT_GREEN = 92,
    BRIGHT_YELLOW = 93,
    BRIGHT_BLUE = 94,
    BRIGHT_MAGENTA = 95,
    BRIGHT_CYAN = 96,
    BRIGHT_WHITE = 97,
}

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

export class Logger {
    public logLevel: LogLevel

    constructor(logLevel: LogLevel) {
        this.logLevel = logLevel
    }

    public debug(msg: LogMessage, options: LoggerOptions = {}) {
        if (this.logLevel <= LogLevel.DEBUG)
            this.write(process.stdout, msg, options, LogColor.BRIGHT_BLACK)
    }

    public info(msg: LogMessage, options: LoggerOptions = {}) {
        if (this.logLevel <= LogLevel.INFO)
            this.write(process.stdout, msg, options)
    }

    public warn(msg: LogMessage, options: LoggerOptions = {}) {
        if (this.logLevel <= LogLevel.WARN)
            this.write(process.stdout, msg, options, LogColor.YELLOW)
    }

    public error(msg: LogMessage, options: LoggerOptions = {}) {
        if (this.logLevel <= LogLevel.ERROR)
            this.write(process.stderr, msg, options, LogColor.RED)
    }

    public clearLine(stream = process.stdout) {
        stream.write(`\r${" ".repeat(process.stdout.columns)}\r`)
    }

    private write(stream: NodeJS.WriteStream, msg: LogMessage, options: LoggerOptions, color?: number) {
        if (options.clearLine) this.clearLine()

        if (options.color) stream.write(`\x1b[${options.color}m`)
        else if (color) stream.write(`\x1b[${color}m`)
        else stream.write(`\x1b[0m`)

        try {
            let msgStr: string
            if (msg === null) msgStr = "null"
            else if (typeof msg === "undefined") msgStr = "undefined"
            else if (msg.constructor == Buffer) msgStr = msg.toString()
            else if (typeof msg === "object") msgStr = JSON.stringify(msg)
            else msgStr = msg.toString()

            if (options.raw)
                stream.write(msgStr)
            else
                stream.write(msgStr + "\n")

        } finally {
            if (color) stream.write("\x1b[0m")
        }
    }

    public get stream(): LoggerStreams {
        return this.streams
    }

    private readonly streams: LoggerStreams = {
        debug: this.newStream("debug"),
        info: this.newStream("info"),
        warn: this.newStream("warn"),
        error: this.newStream("error"),
    }

    private newStream(fct: "debug" | "info" | "warn" | "error"): Writable {
        return new Writable({
            write: (chunk, _, next) => {
                this[fct](chunk, {raw: true})
                next()
            },
        })
    }
}

let logLevel: LogLevel
switch (process.env.LOG_LEVEL?.toLowerCase()) {
    case "debug":
        logLevel = LogLevel.DEBUG
        break
    case "info":
        logLevel = LogLevel.INFO
        break
    case "warn":
        logLevel = LogLevel.WARN
        break
    case "error":
        logLevel = LogLevel.ERROR
        break
    default:
        logLevel = LogLevel.INFO
        break
}

export const logger = new Logger(logLevel)
