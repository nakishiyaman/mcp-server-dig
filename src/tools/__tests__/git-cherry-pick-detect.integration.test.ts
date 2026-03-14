import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_cherry_pick_detect (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("cherry-pick済みコミットを検出する", async () => {
    const result = await client.callTool({
      name: "git_cherry_pick_detect",
      arguments: {
        repo_path: getRepoDir(),
        upstream: "main",
        head: "feature-branch",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Cherry-pick detection:");
    expect(text).toContain("Total commits:");
    // The feature-branch commit was cherry-picked to main, so it should show as equivalent
    expect(text).toContain("Equivalent");
  });

  it("equivalent/not-appliedステータスを表示する", async () => {
    const result = await client.callTool({
      name: "git_cherry_pick_detect",
      arguments: {
        repo_path: getRepoDir(),
        upstream: "main",
        head: "feature-branch",
      },
    });
    const text = getToolText(result);

    // Should show the status indicator
    expect(text).toMatch(/[+-]\s+[0-9a-f]+/);
  });

  it("head指定なしでHEADを使用する", async () => {
    const result = await client.callTool({
      name: "git_cherry_pick_detect",
      arguments: {
        repo_path: getRepoDir(),
        upstream: "feature-branch",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Cherry-pick detection:");
    expect(text).toContain("HEAD");
  });

  it("同一ブランチ比較で空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_cherry_pick_detect",
      arguments: {
        repo_path: getRepoDir(),
        upstream: "main",
        head: "main",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits to compare");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_cherry_pick_detect",
      arguments: {
        repo_path: "/nonexistent/repo",
        upstream: "main",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_cherry_pick_detect",
      arguments: {
        repo_path: getRepoDir(),
        upstream: "main",
        head: "feature-branch",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("upstream", "main");
    expect(data).toHaveProperty("head", "feature-branch");
    expect(data).toHaveProperty("summary");
    expect(data.summary).toHaveProperty("total");
    expect(data.summary).toHaveProperty("equivalent");
    expect(data.summary).toHaveProperty("notApplied");
    expect(data).toHaveProperty("entries");
    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.entries[0]).toHaveProperty("status");
    expect(data.entries[0]).toHaveProperty("hash");
    expect(data.entries[0]).toHaveProperty("subject");
  });
});
