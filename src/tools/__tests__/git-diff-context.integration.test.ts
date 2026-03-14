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

  it("stat_onlyモードでdiff statのみ表示する", async () => {
    const repoDir = getRepoDir();
    const logOutput = await git(repoDir, "log", "--format=%H", "--max-count=3");
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: repoDir,
        commit: newest,
        compare_to: oldest,
        stat_only: true,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("file(s) changed");
    expect(text).not.toContain("diff --git");
  });

  it("同一コミット間のdiffで差分なしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: getRepoDir(),
        commit: "HEAD",
        compare_to: "HEAD",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No differences between");
  });

  it("stat_only + file_pathで特定ファイルのstatのみ表示する", async () => {
    const repoDir = getRepoDir();
    const logOutput = await git(repoDir, "log", "--format=%H", "--max-count=3");
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: repoDir,
        commit: newest,
        compare_to: oldest,
        file_path: "src/index.ts",
        stat_only: true,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("file(s) changed");
    expect(text).toContain("src/index.ts");
  });

  it("word_diff=trueで語レベルのdiffを表示する", async () => {
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
        word_diff: true,
      },
    });
    const text = getToolText(result);

    // Word diff uses {+ +} and [- -] markers
    expect(text).toContain("Diff:");
  });

  it("word_diff=trueでstat_only=trueの場合word_diffは無視される", async () => {
    const repoDir = getRepoDir();
    const logOutput = await git(repoDir, "log", "--format=%H", "--max-count=3");
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: repoDir,
        commit: newest,
        compare_to: oldest,
        stat_only: true,
        word_diff: true,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("file(s) changed");
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
