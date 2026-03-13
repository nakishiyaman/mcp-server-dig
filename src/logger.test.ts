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

  it("DIG_LOG_LEVEL環境変数で有効なレベルを設定できる", () => {
    const original = process.env.DIG_LOG_LEVEL;
    try {
      process.env.DIG_LOG_LEVEL = "debug";
      const logger = new Logger();
      logger.debug("env-test");
      expect(stderrSpy).toHaveBeenCalledOnce();
    } finally {
      if (original === undefined) {
        delete process.env.DIG_LOG_LEVEL;
      } else {
        process.env.DIG_LOG_LEVEL = original;
      }
    }
  });

  describe("MCP Logging Protocol", () => {
    it("server設定時にsendLoggingMessageを呼び出す", () => {
      const logger = new Logger("info");
      const mockServer = {
        sendLoggingMessage: vi.fn().mockResolvedValue(undefined),
      };
      logger.setServer(mockServer as never);

      logger.info("mcp log test");

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: "info",
        data: "mcp log test",
      });
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it("warnレベルをMCPのwarningにマッピングする", () => {
      const logger = new Logger("info");
      const mockServer = {
        sendLoggingMessage: vi.fn().mockResolvedValue(undefined),
      };
      logger.setServer(mockServer as never);

      logger.warn("warning test");

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: "warning",
        data: "warning test",
      });
    });

    it("context付きの場合はdataをオブジェクトで送信する", () => {
      const logger = new Logger("info");
      const mockServer = {
        sendLoggingMessage: vi.fn().mockResolvedValue(undefined),
      };
      logger.setServer(mockServer as never);

      logger.info("with context", { tool: "git_blame" });

      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: "info",
        data: { msg: "with context", context: { tool: "git_blame" } },
      });
    });

    it("sendLoggingMessage失敗時にstderrにフォールバックする", async () => {
      const logger = new Logger("info");
      const mockServer = {
        sendLoggingMessage: vi.fn().mockRejectedValue(new Error("not connected")),
      };
      logger.setServer(mockServer as never);

      logger.error("fallback test");

      // Wait for the promise rejection to be handled
      await vi.waitFor(() => {
        expect(stderrSpy).toHaveBeenCalledOnce();
      });
      const output = JSON.parse(stderrSpy.mock.calls[0][0] as string);
      expect(output.level).toBe("error");
      expect(output.msg).toBe("fallback test");
    });

    it("server未設定時はstderrに出力する", () => {
      const logger = new Logger("info");
      logger.info("no server");

      expect(stderrSpy).toHaveBeenCalledOnce();
      const output = JSON.parse(stderrSpy.mock.calls[0][0] as string);
      expect(output.msg).toBe("no server");
    });
  });
});
