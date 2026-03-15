import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_refactor_candidates (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("リポジトリ全体のリファクタリング候補をランキングする", async () => {
    const result = await client.callTool({
      name: "git_refactor_candidates",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Refactoring candidates");
    expect(text).toContain("Score:");
    expect(text).toContain("Change freq:");
    expect(text).toContain("Code churn:");
    expect(text).toContain("Knowledge:");
    expect(text).toContain("Coupling:");
    expect(text).toContain("Staleness:");
  });

  it("top_nで返却件数を制限する", async () => {
    const result = await client.callTool({
      name: "git_refactor_candidates",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 3,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Refactoring candidates");
    // Should have at most 3 numbered entries
    const entries = text.match(/#\d+ /g) ?? [];
    expect(entries.length).toBeLessThanOrEqual(3);
  });

  it("path_patternでファイルを絞り込む", async () => {
    const result = await client.callTool({
      name: "git_refactor_candidates",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Refactoring candidates");
    // When filtering to a single file, should only show that file or none
    if (text.includes("#1")) {
      expect(text).toContain("src/index.ts");
    }
  });

  it("未来のsinceで候補なしを返す", async () => {
    const result = await client.callTool({
      name: "git_refactor_candidates",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No refactoring candidates found");
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_refactor_candidates",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("candidates");
    expect(data).toHaveProperty("totalAnalyzed");
    expect(Array.isArray(data.candidates)).toBe(true);
    if (data.candidates.length > 0) {
      expect(data.candidates[0]).toHaveProperty("filePath");
      expect(data.candidates[0]).toHaveProperty("score");
      expect(data.candidates[0]).toHaveProperty("overallRisk");
      expect(data.candidates[0]).toHaveProperty("dimensions");
    }
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_refactor_candidates",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
