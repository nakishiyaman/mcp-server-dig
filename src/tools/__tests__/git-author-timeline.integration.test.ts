import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_author_timeline (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("著者のタイムラインを取得する", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Author timeline");
    expect(text).toContain("Authors:");
    expect(text).toContain("alice@example.com");
    expect(text).toContain("bob@example.com");
  });

  it("著者ごとの活動期間を表示する", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Period:");
    expect(text).toContain("Commits:");
    expect(text).toMatch(/\d+ days/);
  });

  it("支配的な著者の警告を表示する", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    // Bob has 50+ bulk commits out of ~62 total → dominant contributor
    expect(text).toContain("Dominant contributor");
    expect(text).toContain("Bob");
  });

  it("path_patternでスコープを絞る", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "assets/",
      },
    });
    const text = getToolText(result);

    // Only Bob committed to assets/
    expect(text).toContain("Scope: assets/");
    expect(text).toContain("bob@example.com");
    expect(text).toContain("sole owner");
  });

  it("未来のsinceで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
