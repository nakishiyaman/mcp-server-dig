import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_cluster (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("関連コミットのクラスタを検出する", async () => {
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: getRepoDir(),
        time_window_minutes: 1440,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Commit Clusters");
    expect(text).toContain("Total commits analyzed:");
  });

  it("authorフィルタでコミットを絞り込む", async () => {
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: getRepoDir(),
        author: "Alice",
        time_window_minutes: 1440,
      },
    });
    const text = getToolText(result);

    // Should contain Alice's commits or indicate no clusters
    expect(result.isError).toBeFalsy();
    expect(text.length).toBeGreaterThan(0);
  });

  it("空結果でメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: getRepoDir(),
        author: "nonexistent-author-xyz",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
  });

  it("クラスタなしでメッセージを返す", async () => {
    // Very small time window should prevent clustering
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: getRepoDir(),
        time_window_minutes: 1,
        min_shared_files: 100,
      },
    });
    // Either no clusters or some clusters — verify no error
    expect(result.isError).toBeFalsy();
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: getRepoDir(),
        time_window_minutes: 1440,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("summary");
    expect(data.summary).toHaveProperty("totalCommits");
    expect(data.summary).toHaveProperty("clusters");
    expect(data.summary).toHaveProperty("clusteredCommits");
    expect(data.summary).toHaveProperty("singletonCommits");
    expect(data).toHaveProperty("clusters");
    expect(Array.isArray(data.clusters)).toBe(true);
  });

  it("path_patternでファイルを絞り込む", async () => {
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
        time_window_minutes: 1440,
      },
    });
    const text = getToolText(result);

    expect(result.isError).toBeFalsy();
    expect(text).toContain("Total commits analyzed:");
  });

  it("max_commitsで分析対象を制限する", async () => {
    const result = await client.callTool({
      name: "git_commit_cluster",
      arguments: {
        repo_path: getRepoDir(),
        max_commits: 5,
        time_window_minutes: 1440,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data.summary.totalCommits).toBeLessThanOrEqual(5);
  });
});
