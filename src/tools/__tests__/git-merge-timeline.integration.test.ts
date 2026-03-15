import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_merge_timeline (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("月次のマージタイムラインを表示する", async () => {
    const result = await client.callTool({
      name: "git_merge_timeline",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    // Either shows timeline data or no merges message
    expect(
      text.includes("Merge timeline") || text.includes("No merge commits found"),
    ).toBe(true);

    if (text.includes("Merge timeline")) {
      expect(text).toContain("monthly");
      expect(text).toContain("Trend:");
    }
  });

  it("weekly粒度で分析する", async () => {
    const result = await client.callTool({
      name: "git_merge_timeline",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "weekly",
        num_periods: 4,
      },
    });
    const text = getToolText(result);

    expect(
      text.includes("weekly") || text.includes("No merge commits found"),
    ).toBe(true);
  });

  it("未来のsinceでマージなしを返す", async () => {
    const result = await client.callTool({
      name: "git_merge_timeline",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No merge commits found");
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_merge_timeline",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("granularity");
    expect(data).toHaveProperty("totalMerges");
    expect(data).toHaveProperty("averagePerPeriod");
    expect(data).toHaveProperty("trend");
    expect(data).toHaveProperty("periods");
    expect(Array.isArray(data.periods)).toBe(true);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_merge_timeline",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
