import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_contributor_network (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コントリビューターネットワークを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);
    expect(text).toContain("Contributor network");
    expect(text).toContain("Contributors:");
    expect(text).toContain("Collaboration links");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: { repo_path: getRepoDir(), output_format: "json" },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);
    expect(parsed.totalContributors).toBeGreaterThan(0);
    expect(Array.isArray(parsed.nodes)).toBe(true);
    expect(Array.isArray(parsed.edges)).toBe(true);
    expect(typeof parsed.density).toBe("number");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: { repo_path: "/nonexistent/repo" },
    });
    expect(result.isError).toBe(true);
  });

  it("path_patternで特定パスに限定する", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: { repo_path: getRepoDir(), path_pattern: "src/" },
    });
    const text = getToolText(result);
    expect(text).toContain("Scope: src/");
  });
});
