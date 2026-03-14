import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_pickaxe (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("文字列を導入したコミットを検出する", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: getRepoDir(),
        search_term: "const z",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("feat: add z variable");
  });

  it("正規表現で検索する", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: getRepoDir(),
        search_term: "const [wz]",
        is_regex: true,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Found");
    // Should find at least 2 commits (z and w)
    expect(text).toMatch(/Found [2-9]\d* commit/);
  });

  it("マッチなしで空結果メッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: getRepoDir(),
        search_term: "nonexistent_string_xyz",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: getRepoDir(),
        search_term: "const z",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("searchTerm", "const z");
    expect(data).toHaveProperty("isRegex", false);
    expect(data).toHaveProperty("totalCommits");
    expect(data).toHaveProperty("commits");
    expect(data.commits.length).toBeGreaterThan(0);
    expect(data.commits[0]).toHaveProperty("hash");
    expect(data.commits[0]).toHaveProperty("author");
  });

  it("path_patternで検索範囲を限定する", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: getRepoDir(),
        search_term: "const x",
        path_pattern: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Found");
    expect(text).toContain("commit");
  });

  it("sinceとauthorで検索を絞り込む", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: getRepoDir(),
        search_term: "const x",
        since: "2000-01-01",
        author: "Alice",
      },
    });
    const text = getToolText(result);

    expect(result.isError).toBeFalsy();
    expect(text).toContain("Found");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: "/nonexistent/repo",
        search_term: "test",
      },
    });

    expect(result.isError).toBe(true);
  });
});
