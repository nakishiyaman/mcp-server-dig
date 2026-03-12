import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_tag_list (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("タグ一覧を新しい順に返す", async () => {
    const result = await client.callTool({
      name: "git_tag_list",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("v0.1.0");
    expect(text).toContain("v0.2.0");
    expect(text).toContain("2 tag(s)");
  });

  it("パターンでタグをフィルタリングする", async () => {
    const result = await client.callTool({
      name: "git_tag_list",
      arguments: {
        repo_path: getRepoDir(),
        pattern: "v0.1*",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("v0.1.0");
    expect(text).toContain("Initial release");
    expect(text).toContain("1 tag(s)");
  });

  it("マッチしないpatternでタグなしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_tag_list",
      arguments: {
        repo_path: getRepoDir(),
        pattern: "nonexistent-*",
      },
    });
    const text = getToolText(result);

    expect(text).toContain('No tags found matching "nonexistent-*"');
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_tag_list",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
