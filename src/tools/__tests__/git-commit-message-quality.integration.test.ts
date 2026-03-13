import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_message_quality (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コミットメッセージ品質分析を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Commit message quality analysis");
    expect(text).toContain("Commits analyzed:");
    expect(text).toContain("Conventional Commits:");
    expect(text).toContain("Avg subject length:");
    expect(text).toContain("Issue references:");
  });

  it("Conventional Commitsの準拠率が0%以上", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: getRepoDir(), output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(parsed.metrics.totalCommits).toBeGreaterThan(0);
    expect(parsed.metrics.conventionalCommitsRate).toBeGreaterThanOrEqual(0);
    expect(parsed.metrics.conventionalCommitsRate).toBeLessThanOrEqual(100);
    // Test repo uses conventional commits (feat:, chore:, refactor:)
    expect(parsed.metrics.conventionalCommitsCount).toBeGreaterThan(0);
  });

  it("type分布を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: getRepoDir(), output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(typeof parsed.metrics.typeDistribution).toBe("object");
    // Test repo has feat: and chore: commits
    expect(parsed.metrics.typeDistribution).toHaveProperty("feat");
    expect(parsed.metrics.typeDistribution).toHaveProperty("chore");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: "/nonexistent/repo" },
    });
    expect(result.isError).toBe(true);
  });

  it("未来のsinceでコミットが見つからない場合", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: getRepoDir(), since: "2099-01-01" },
    });
    const text = getToolText(result);
    expect(text).toContain("No commits found");
  });

  it("authorフィルタで特定著者のコミットのみ分析する", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: {
        repo_path: getRepoDir(),
        author: "Alice",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed.metrics.totalCommits).toBeGreaterThan(0);
    // Alice's commits should all be conventional
    expect(parsed.metrics.conventionalCommitsCount).toBeGreaterThan(0);
  });
});
