import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_contributor_patterns (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コントリビューター統計を返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_patterns",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Alice");
    expect(text).toContain("Bob");
    // Alice has 7 commits (initial + feat + calculator x3 + buggy feature + revert)
    expect(text).toContain("7 commits");
  });

  it("last active日付が含まれる", async () => {
    const result = await client.callTool({
      name: "git_contributor_patterns",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    // Date format YYYY-MM-DD should appear
    expect(text).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("存在しないパスでpath_pattern付きのメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_patterns",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "nonexistent/",
        max_commits: 1,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No contributors found in nonexistent/");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_patterns",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
