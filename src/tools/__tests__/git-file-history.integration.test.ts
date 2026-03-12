import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_file_history (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ファイルのコミット履歴を返す", async () => {
    const result = await client.callTool({
      name: "git_file_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("File history for: src/index.ts");
    expect(text).toContain("Showing 20 commit(s)");
    expect(text).toContain("chore: bulk commit");
  });

  it("max_commitsを尊重する", async () => {
    const result = await client.callTool({
      name: "git_file_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        max_commits: 1,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Showing 1 commit(s)");
  });

  it("各コミットにdiff statが含まれる", async () => {
    const result = await client.callTool({
      name: "git_file_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        max_commits: 1,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("src/index.ts");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_file_history",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
      },
    });

    expect(result.isError).toBe(true);
  });
});
