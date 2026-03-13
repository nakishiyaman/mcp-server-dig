/**
 * Transport selection for mcp-server-dig.
 * Defaults to stdio; HTTP mode via --http flag or DIG_TRANSPORT=http.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger.js";

export type TransportMode = "stdio" | "http";

export function resolveTransportMode(argv: string[], env: Record<string, string | undefined>): TransportMode {
  if (argv.includes("--http") || env.DIG_TRANSPORT === "http") {
    return "http";
  }
  return "stdio";
}

export function resolveHttpPort(env: Record<string, string | undefined>): number {
  const portStr = env.DIG_PORT;
  if (portStr) {
    const port = parseInt(portStr, 10);
    if (!Number.isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }
  return 3000;
}

export async function startTransport(server: McpServer, mode: TransportMode, port: number): Promise<void> {
  if (mode === "http") {
    const { StreamableHTTPServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/streamableHttp.js"
    );
    const { createServer: createHttpServer } = await import("node:http");
    const { randomUUID } = await import("node:crypto");

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const httpServer = createHttpServer((req, res) => {
      if (req.url === "/mcp") {
        transport.handleRequest(req, res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    await server.connect(transport);

    await new Promise<void>((resolve) => {
      httpServer.listen(port, "127.0.0.1", () => {
        logger.info("mcp-server-dig running on HTTP", {
          endpoint: `http://127.0.0.1:${port}/mcp`,
        });
        resolve();
      });
    });
  } else {
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("mcp-server-dig running on stdio");
  }
}
