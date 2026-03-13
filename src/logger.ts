/**
 * Structured JSON logger for mcp-server-dig.
 * Supports MCP Logging Protocol when server is available, falls back to stderr.
 * Log level controlled by DIG_LOG_LEVEL environment variable.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type LogLevel = "debug" | "info" | "warn" | "error";

/** MCP logging protocol level names */
type McpLogLevel = "debug" | "info" | "warning" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_TO_MCP: Record<LogLevel, McpLogLevel> = {
  debug: "debug",
  info: "info",
  warn: "warning",
  error: "error",
};

function parseLogLevel(value: string | undefined): LogLevel {
  if (value && value in LEVEL_PRIORITY) {
    return value as LogLevel;
  }
  return "info";
}

export class Logger {
  private readonly minLevel: number;
  private mcpServer: McpServer | undefined;

  constructor(level?: LogLevel) {
    const effectiveLevel = level ?? parseLogLevel(process.env.DIG_LOG_LEVEL);
    this.minLevel = LEVEL_PRIORITY[effectiveLevel];
  }

  setServer(server: McpServer): void {
    this.mcpServer = server;
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

    // Try MCP logging protocol first
    if (this.mcpServer) {
      const data = context ? { msg, context } : msg;
      this.mcpServer.sendLoggingMessage({
        level: LOG_TO_MCP[level],
        data,
      }).catch(() => {
        // If MCP send fails (e.g. not connected yet), fall through to stderr
        this.stderrFallback(level, msg, context);
      });
      return;
    }

    this.stderrFallback(level, msg, context);
  }

  private stderrFallback(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
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
