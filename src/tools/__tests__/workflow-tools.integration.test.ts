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
