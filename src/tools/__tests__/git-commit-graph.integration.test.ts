import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_graph (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コミット統計を取得する", async () => {
    const result = await client.callTool({
      name: "git_commit_graph",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Commit graph analysis");
    expect(text).toContain("Total commits:");
  });

  it("マージコミットを検出する", async () => {
    const result = await client.callTool({
      name: "git_commit_graph",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    // The test repo has at least one merge (merge-test-branch)
    expect(text).toContain("Merge commits:");
    expect(text).toMatch(/Merge commits:\s+[1-9]/);
  });

  it("未来の日付でコミットなしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_graph",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found since");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_graph",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
