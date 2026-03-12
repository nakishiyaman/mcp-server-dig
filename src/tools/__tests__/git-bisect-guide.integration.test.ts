import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";
import { git } from "./helpers.js";

describe("git_bisect_guide (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コミット範囲のbisectガイドを生成する", async () => {
    const repoDir = getRepoDir();
    const firstCommit = (
      await git(repoDir, "rev-list", "--max-parents=0", "HEAD")
    ).trim();

    const result = await client.callTool({
      name: "git_bisect_guide",
      arguments: {
        repo_path: repoDir,
        good_ref: firstCommit,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Bisect guide");
    expect(text).toContain("Commits in range:");
    expect(text).toContain("Estimated bisect steps:");
  });

  it("ファイル指定で絞り込める", async () => {
    const repoDir = getRepoDir();
    const firstCommit = (
      await git(repoDir, "rev-list", "--max-parents=0", "HEAD")
    ).trim();

    const result = await client.callTool({
      name: "git_bisect_guide",
      arguments: {
        repo_path: repoDir,
        good_ref: firstCommit,
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Bisect guide");
    expect(text).toContain("Commits modifying src/index.ts:");
  });

  it("タグ名をgood_refとして使える", async () => {
    const result = await client.callTool({
      name: "git_bisect_guide",
      arguments: {
        repo_path: getRepoDir(),
        good_ref: "v0.1.0",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Bisect guide");
    expect(text).toContain("Commits in range:");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_bisect_guide",
      arguments: {
        repo_path: "/nonexistent/repo",
        good_ref: "HEAD~1",
      },
    });

    expect(result.isError).toBe(true);
  });
});
