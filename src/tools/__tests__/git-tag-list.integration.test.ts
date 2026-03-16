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
    expect(text).toContain("8 tag(s)");
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

  it("sort=oldestで古い順にタグを返す", async () => {
    const result = await client.callTool({
      name: "git_tag_list",
      arguments: {
        repo_path: getRepoDir(),
        sort: "oldest",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("oldest first");
    expect(text).toContain("v0.1.0");
    expect(text).toContain("v0.2.0");
    // v0.1.0 should appear before v0.2.0
    const idx1 = text.indexOf("v0.1.0");
    const idx2 = text.indexOf("v0.2.0");
    expect(idx1).toBeLessThan(idx2);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_tag_list",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("sort", "newest");
    expect(data).toHaveProperty("totalTags", 8);
    expect(data).toHaveProperty("tags");
    expect(data.tags[0]).toHaveProperty("name");
    expect(data.tags[0]).toHaveProperty("date");
    expect(data.tags[0]).toHaveProperty("subject");
  });
});
