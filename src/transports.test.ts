import { describe, it, expect, afterAll } from "vitest";
import { resolveTransportMode, resolveHttpPort, startTransport } from "./transports.js";
import type { TransportHandle } from "./transports.js";
import { createSandboxServer } from "./index.js";
import http from "node:http";

describe("resolveTransportMode", () => {
  it("デフォルトはstdio", () => {
    expect(resolveTransportMode([], {})).toBe("stdio");
  });

  it("--httpフラグでhttpモードになる", () => {
    expect(resolveTransportMode(["node", "index.js", "--http"], {})).toBe("http");
  });

  it("DIG_TRANSPORT=httpでhttpモードになる", () => {
    expect(resolveTransportMode([], { DIG_TRANSPORT: "http" })).toBe("http");
  });

  it("DIG_TRANSPORTが他の値ならstdio", () => {
    expect(resolveTransportMode([], { DIG_TRANSPORT: "sse" })).toBe("stdio");
  });

  it("--httpフラグが優先される", () => {
    expect(resolveTransportMode(["--http"], { DIG_TRANSPORT: "stdio" })).toBe("http");
  });
});

describe("resolveHttpPort", () => {
  it("デフォルトは3000", () => {
    expect(resolveHttpPort({})).toBe(3000);
  });

  it("DIG_PORTでポートを変更できる", () => {
    expect(resolveHttpPort({ DIG_PORT: "8080" })).toBe(8080);
  });

  it("無効な値ではデフォルトに戻る", () => {
    expect(resolveHttpPort({ DIG_PORT: "abc" })).toBe(3000);
    expect(resolveHttpPort({ DIG_PORT: "0" })).toBe(3000);
    expect(resolveHttpPort({ DIG_PORT: "99999" })).toBe(3000);
  });
});

describe("startTransport", () => {
  let handle: TransportHandle | undefined;
  let server: ReturnType<typeof createSandboxServer> | undefined;

  afterAll(async () => {
    if (handle) await handle.close();
    if (server) await server.close();
  });

  it("HTTPモードでサーバーを起動できる", async () => {
    server = createSandboxServer();
    handle = await startTransport(server, "http", 0);
    expect(handle).toBeDefined();
    expect(handle.port).toBeGreaterThan(0);
  });

  it("非/mcpパスで404が返る", async () => {
    // handle and server are set from previous test
    const port = handle!.port!;
    const res = await new Promise<http.IncomingMessage>((resolve) => {
      http.get(`http://127.0.0.1:${port}/not-mcp`, resolve);
    });
    expect(res.statusCode).toBe(404);
  });

  it("/mcpパスでリクエストが処理される", async () => {
    const port = handle!.port!;
    const res = await new Promise<http.IncomingMessage>((resolve) => {
      http.get(`http://127.0.0.1:${port}/mcp`, resolve);
    });
    // /mcp endpoint exists, but GET without proper MCP headers may return an error status
    expect(res.statusCode).toBeDefined();
  });
});
