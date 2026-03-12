import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_merge_base (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("mainとfeature-branchのmerge baseを検出する", async () => {
    const result = await client.callTool({
      name: "git_merge_base",
      arguments: {
        repo_path: getRepoDir(),
        ref1: "main",
        ref2: "feature-branch",
        max_commits: 100,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Merge base:");
    expect(text).toContain('Commits on "main" since divergence');
    expect(text).toContain('Commits on "feature-branch" since divergence');
    expect(text).toContain("feat: add w variable");
    expect(text).toContain("feat: add feature module");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_merge_base",
      arguments: {
        repo_path: "/nonexistent/repo",
        ref1: "main",
        ref2: "feature-branch",
      },
    });

    expect(result.isError).toBe(true);
  });
});
