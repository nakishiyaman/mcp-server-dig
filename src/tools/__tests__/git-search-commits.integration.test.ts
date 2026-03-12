import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_search_commits (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("キーワードに一致するコミットを検索する", async () => {
    const result = await client.callTool({
      name: "git_search_commits",
      arguments: {
        repo_path: getRepoDir(),
        query: "initial",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("feat: initial setup");
    expect(text).toContain("Found 1 commit(s)");
  });

  it("authorでフィルタリングする", async () => {
    const result = await client.callTool({
      name: "git_search_commits",
      arguments: {
        repo_path: getRepoDir(),
        query: "feat",
        author: "Bob",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Bob");
    // Should not contain Alice's commits
    expect(text).not.toContain("Alice");
  });

  it("マッチなしで空結果メッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_search_commits",
      arguments: {
        repo_path: getRepoDir(),
        query: "nonexistent-keyword",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
  });
});
