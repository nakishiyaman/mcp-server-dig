import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_code_ownership_changes (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("日付境界で所有権の変化を比較する", async () => {
    // Use a boundary that splits Alice's early commits from Bob's later ones
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "2 hours ago",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Code ownership changes");
    expect(text).toContain("directories analyzed");
  });

  it("depth=2でより深い階層を分析する", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "1 day ago",
        depth: 2,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Code ownership changes");
  });

  it("未来の境界日付で空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "2099-01-01",
      },
    });
    const text = getToolText(result);

    // All commits are "before" the boundary, nothing "after"
    expect(text).toContain("Code ownership changes");
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "1 day ago",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("periodBoundary");
    expect(data).toHaveProperty("directories");
    expect(data).toHaveProperty("summary");
    expect(data.summary).toHaveProperty("directoriesAnalyzed");
    expect(data.summary).toHaveProperty("ownershipChanges");
    expect(data.summary).toHaveProperty("avgBusFactorDelta");
    expect(data.summary).toHaveProperty("riskAreas");
  });

  it("path_patternでスコープを絞り込む", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "1 day ago",
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Code ownership changes");
    // Only src/ directory should appear
    expect(text).not.toContain("assets/");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: "/nonexistent/repo",
        period_boundary: "2024-01-01",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("busFactorとコントリビューター情報を含む", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "1 day ago",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    if (data.directories.length > 0) {
      const dir = data.directories[0];
      expect(dir).toHaveProperty("before");
      expect(dir).toHaveProperty("after");
      expect(dir.before).toHaveProperty("busFactor");
      expect(dir.after).toHaveProperty("busFactor");
      expect(dir).toHaveProperty("ownershipChanged");
      expect(dir).toHaveProperty("busFactorDelta");
      expect(dir).toHaveProperty("newContributors");
      expect(dir).toHaveProperty("departedContributors");
    }
  });
});
