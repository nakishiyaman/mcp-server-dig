import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_show (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コミットのメタデータとstatを表示する", async () => {
    const result = await client.callTool({
      name: "git_commit_show",
      arguments: {
        repo_path: getRepoDir(),
        commit: "HEAD~1",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Bob");
    expect(text).toMatch(/chore: bulk commit \d+/);
    expect(text).toContain("src/index.ts");
  });

  it("diffを表示する", async () => {
    const result = await client.callTool({
      name: "git_commit_show",
      arguments: {
        repo_path: getRepoDir(),
        commit: "HEAD~1",
        show_diff: true,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("iteration");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_show",
      arguments: {
        repo_path: "/nonexistent/repo",
        commit: "HEAD",
      },
    });

    expect(result.isError).toBe(true);
  });
});
