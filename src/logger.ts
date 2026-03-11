/**
 * Structured JSON logger for mcp-server-dig.
 * Outputs to stderr (stdin/stdout are reserved for MCP JSON-RPC).
 * Log level controlled by DIG_LOG_LEVEL environment variable.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function parseLogLevel(value: string | undefined): LogLevel {
  if (value && value in LEVEL_PRIORITY) {
    return value as LogLevel;
  }
  return "info";
}

export class Logger {
  private readonly minLevel: number;

  constructor(level?: LogLevel) {
    const effectiveLevel = level ?? parseLogLevel(process.env.DIG_LOG_LEVEL);
    this.minLevel = LEVEL_PRIORITY[effectiveLevel];
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    this.log("debug", msg, context);
  }

  info(msg: string, context?: Record<string, unknown>): void {
    this.log("info", msg, context);
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    this.log("warn", msg, context);
  }

  error(msg: string, context?: Record<string, unknown>): void {
    this.log("error", msg, context);
  }

  private log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < this.minLevel) return;

    const entry: Record<string, unknown> = {
      level,
      ts: new Date().toISOString(),
      msg,
    };

    if (context) {
      entry.context = context;
    }

    console.error(JSON.stringify(entry));
  }
}

/** Singleton logger instance. */
export const logger = new Logger();
