import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";
import { git } from "./helpers.js";

describe("git_diff_context (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("2コミット間のdiff statを表示する", async () => {
    const repoDir = getRepoDir();
    const logOutput = await git(repoDir, "log", "--format=%H", "--max-count=3");
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: repoDir,
        commit: oldest,
        compare_to: newest,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("src/index.ts");
    // Full diff (not stat_only) includes the diff header
    expect(text).toContain("Diff:");
  });

  it("特定ファイルのfull diffを表示する", async () => {
    const repoDir = getRepoDir();
    const logOutput = await git(repoDir, "log", "--format=%H", "--max-count=3");
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: repoDir,
        commit: oldest,
        compare_to: newest,
        file_path: "src/index.ts",
        stat_only: false,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("iteration");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: "/nonexistent/repo",
        commit: "HEAD",
      },
    });

    expect(result.isError).toBe(true);
  });
});
