import { describe, it, expect } from "vitest";
import { resolveTransportMode, resolveHttpPort } from "./transports.js";

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
