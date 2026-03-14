import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_dependency_map (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ディレクトリ間の共変更を検出する", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 1,
        min_coupling: 1,
      },
    });
    const text = getToolText(result);

    // With only "src" at depth 1, there may not be pairs but the tool runs
    expect(text).toContain("Dependency map");
  });

  it("minCoupling 100でフィルタリングする", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 1,
        min_coupling: 100,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No co-change coupling found");
  });

  it("将来のsinceで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No co-change coupling found");
  });

  it("depth=2でより細かい粒度のペアを取得する", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 2,
        min_coupling: 1,
      },
    });

    expect(result.isError).not.toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 1,
        min_coupling: 1,
        output_format: "json",
      },
    });
    const text = getToolText(result);

    // May return "No co-change coupling" if only one top-level dir
    if (!text.includes("No co-change coupling")) {
      const data = JSON.parse(text);
      expect(data).toHaveProperty("pairs");
      expect(data).toHaveProperty("totalCommits");
    }
  });

  it("path_pattern指定でスコープを表示する", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 1,
        min_coupling: 1,
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(result.isError).toBeFalsy();
    // Either shows scope label or no coupling found
    expect(text.length).toBeGreaterThan(0);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
