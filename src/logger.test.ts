import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "./logger.js";

describe("Logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("JSON形式でstderrに出力する", () => {
    const logger = new Logger("info");
    logger.info("test message");

    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(output.level).toBe("info");
    expect(output.msg).toBe("test message");
    expect(output.ts).toBeDefined();
  });

  it("contextオブジェクトを含む", () => {
    const logger = new Logger("info");
    logger.info("with context", { tool: "git_hotspots", duration: 42 });

    const output = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(output.context).toEqual({ tool: "git_hotspots", duration: 42 });
  });

  it("レベル以下のログは出力しない", () => {
    const logger = new Logger("warn");
    logger.debug("debug msg");
    logger.info("info msg");
    logger.warn("warn msg");
    logger.error("error msg");

    expect(stderrSpy).toHaveBeenCalledTimes(2);
    const levels = stderrSpy.mock.calls.map(
      (call: [string, ...unknown[]]) => JSON.parse(call[0] as string).level,
    );
    expect(levels).toEqual(["warn", "error"]);
  });

  it("debugレベルで全ログが出力される", () => {
    const logger = new Logger("debug");
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(stderrSpy).toHaveBeenCalledTimes(4);
  });

  it("contextなしの場合はcontextフィールドが省略される", () => {
    const logger = new Logger("info");
    logger.info("no context");

    const output = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(output.context).toBeUndefined();
  });
});
