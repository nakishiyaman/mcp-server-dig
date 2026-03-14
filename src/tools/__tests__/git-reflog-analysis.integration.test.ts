import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_reflog_analysis (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("reflogエントリを取得する", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Reflog analysis for HEAD");
    expect(text).toContain("Total entries:");
    expect(text).toContain("Action summary:");
  });

  it("ref指定でブランチのreflogを取得する", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: getRepoDir(),
        ref: "main",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Reflog analysis for main");
    expect(text).toContain("Total entries:");
  });

  it("action_filterでエントリをフィルタする", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: getRepoDir(),
        action_filter: "commit",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Reflog analysis for HEAD");
    // All visible entries should have commit action
    expect(text).toContain("commit:");
  });

  it("max_entriesで取得件数を制限する", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: getRepoDir(),
        max_entries: 3,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Reflog analysis for HEAD");
    // Total entries should be at most 3
    expect(text).toMatch(/Total entries: [1-3]/);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("ref", "HEAD");
    expect(data).toHaveProperty("totalEntries");
    expect(data).toHaveProperty("actionSummary");
    expect(data).toHaveProperty("entries");
    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.entries[0]).toHaveProperty("hash");
    expect(data.entries[0]).toHaveProperty("action");
    expect(data.entries[0]).toHaveProperty("date");
  });

  it("action_filterで一致なしの場合メッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: getRepoDir(),
        action_filter: "nonexistent-action-xyz",
      },
    });
    const text = getToolText(result);

    expect(result.isError).toBeFalsy();
    expect(text).toContain("No reflog entries matching action");
    expect(text).toContain("nonexistent-action-xyz");
  });

  it("resetアクションがreflogに記録されている", async () => {
    const result = await client.callTool({
      name: "git_reflog_analysis",
      arguments: {
        repo_path: getRepoDir(),
        max_entries: 200,
        action_filter: "reset",
      },
    });
    const text = getToolText(result);

    // global-setup creates a reset --soft operation
    expect(text).toContain("reset:");
  });
});
