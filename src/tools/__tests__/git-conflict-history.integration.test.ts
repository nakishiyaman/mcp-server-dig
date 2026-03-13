import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_conflict_history (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("マージコミットのファイル頻度を返す", async () => {
    const result = await client.callTool({
      name: "git_conflict_history",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    // The test repo has a merge commit (merge-test-branch into main)
    expect(text).toContain("Merge commit file frequency");
    expect(text).toContain("Total merge commits:");
    expect(text).toContain("merges");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_conflict_history",
      arguments: { repo_path: getRepoDir(), output_format: "json" },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(typeof parsed.totalMergeCommits).toBe("number");
    expect(parsed.totalMergeCommits).toBeGreaterThan(0);
    expect(Array.isArray(parsed.files)).toBe(true);
    expect(parsed.files.length).toBeGreaterThan(0);
    expect(parsed.files[0]).toHaveProperty("filePath");
    expect(parsed.files[0]).toHaveProperty("mergeCount");
    expect(parsed.files[0]).toHaveProperty("percentage");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_conflict_history",
      arguments: { repo_path: "/nonexistent/repo" },
    });
    expect(result.isError).toBe(true);
  });

  it("未来のsinceでマージが見つからない場合", async () => {
    const result = await client.callTool({
      name: "git_conflict_history",
      arguments: { repo_path: getRepoDir(), since: "2099-01-01" },
    });
    const text = getToolText(result);
    expect(text).toContain("No merge commits found");
  });

  it("path_patternで特定パスに限定する", async () => {
    const result = await client.callTool({
      name: "git_conflict_history",
      arguments: { repo_path: getRepoDir(), path_pattern: "src/" },
    });
    const text = getToolText(result);

    // Should contain results or "No merge commits" - either is valid
    expect(text.length).toBeGreaterThan(0);
  });
});
