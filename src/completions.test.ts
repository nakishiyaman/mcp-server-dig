import { describe, it, expect } from "vitest";
import { PROMPT_NAMES, completeRepoPath } from "./completions.js";
import path from "node:path";

describe("Completions", () => {
  describe("PROMPT_NAMES", () => {
    it("8つのプロンプト名を含む", () => {
      expect(PROMPT_NAMES).toHaveLength(8);
    });

    it("フィルタリングが機能する", () => {
      const filtered = PROMPT_NAMES.filter((name) => name.startsWith("onboard"));
      expect(filtered).toEqual(["onboard-codebase", "onboard-area"]);
    });

    it("空文字列で全プロンプトを返す", () => {
      const filtered = PROMPT_NAMES.filter((name) => name.startsWith(""));
      expect(filtered).toHaveLength(8);
    });
  });

  describe("completeRepoPath", () => {
    it("カレントディレクトリがgitリポジトリなら結果を返す", async () => {
      const results = await completeRepoPath("");
      expect(results.length).toBeGreaterThan(0);
      // Should return an absolute path
      expect(path.isAbsolute(results[0])).toBe(true);
    });

    it("無効なパスでは空配列を返す", async () => {
      const results = await completeRepoPath("/nonexistent/path/to/nowhere");
      expect(results).toEqual([]);
    });
  });
});
