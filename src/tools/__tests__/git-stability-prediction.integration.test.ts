import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_stability_prediction (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("デフォルト設定で安定性予測を返す", async () => {
    const result = await client.callTool({
      name: "git_stability_prediction",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Stability prediction");
    expect(text).toContain("Files analyzed");
    expect(text).toContain("Score:");
  });

  it("path_patternで特定パスに限定する", async () => {
    const result = await client.callTool({
      name: "git_stability_prediction",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Scope: src/");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_stability_prediction",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(parsed.totalFilesAnalyzed).toBeGreaterThan(0);
    expect(Array.isArray(parsed.files)).toBe(true);
    expect(parsed.files[0]).toHaveProperty("score");
    expect(parsed.files[0]).toHaveProperty("riskLevel");
    expect(parsed.files[0]).toHaveProperty("penalties");
    expect(parsed.files[0]).toHaveProperty("dimensions");
  });

  it("top_nで返す件数を制限する", async () => {
    const result = await client.callTool({
      name: "git_stability_prediction",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 3,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(parsed.files.length).toBeLessThanOrEqual(3);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_stability_prediction",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("スコアが0-100の範囲内である", async () => {
    const result = await client.callTool({
      name: "git_stability_prediction",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    for (const file of parsed.files) {
      expect(file.score).toBeGreaterThanOrEqual(0);
      expect(file.score).toBeLessThanOrEqual(100);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(file.riskLevel);
    }
  });
});
