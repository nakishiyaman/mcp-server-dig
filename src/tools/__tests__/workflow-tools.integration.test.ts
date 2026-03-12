import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

// ─── git_review_prep ─────────────────────────────────────

describe("git_review_prep (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("main...feature-branchのPRレビューブリーフィングを生成する", async () => {
    const result = await client.callTool({
      name: "git_review_prep",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "main",
        head_ref: "feature-branch",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("PR Review Briefing");
    expect(text).toContain("src/feature.ts");
    expect(text).toContain("feat: add feature module");
  });

  it("変更が少ないPRのレビューブリーフィングを生成する", async () => {
    const result = await client.callTool({
      name: "git_review_prep",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "HEAD~1",
        head_ref: "HEAD",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("PR Review Briefing");
    expect(text).toContain("Commits (");
    expect(text).toContain("Changed files (");
  });

  it("同一ref間で変更なしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_review_prep",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "HEAD",
        head_ref: "HEAD",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No changes found between");
  });

  it("不正なrefでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_review_prep",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "nonexistent-ref",
        head_ref: "another-nonexistent",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_review_prep",
      arguments: {
        repo_path: "/nonexistent/repo",
        base_ref: "main",
      },
    });

    expect(result.isError).toBe(true);
  });
});

// ─── git_why ─────────────────────────────────────────────

describe("git_why (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ファイルのblame情報とコンテキストを統合する", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Why does this code exist?");
    expect(text).toContain("commit(s)");
    expect(text).toContain("author(s)");
  });

  it("行範囲指定でblameを取得する", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        start_line: 3,
        end_line: 4,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Why does this code exist?");
    expect(text).toContain("L3-4");
  });

  it("max_commitsでコミット数を制限する", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        max_commits: 1,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Why does this code exist?");
    // With max_commits=1, there should be "... and N more commit(s)" message
    expect(text).toContain("more commit(s)");
  });

  it("start_lineのみで行範囲を指定する", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        start_line: 2,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Why does this code exist?");
    expect(text).toContain("L2+");
  });

  it("end_lineのみで行範囲を指定する", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        end_line: 2,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Why does this code exist?");
    // end_line only → no line label suffix since start_line is undefined
    expect(text).not.toContain("L2+");
  });

  it("co-changeがない単独ファイルの分析を返す", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/merged-feature.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Why does this code exist?");
    expect(text).toContain("File context:");
    // merged-feature.ts was only changed once, so no co-changes with minCoupling=2
    expect(text).not.toContain("Co-changed with:");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
      },
    });

    expect(result.isError).toBe(true);
  });
});
