import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_rename_history (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("リネーム履歴を検出する", async () => {
    const result = await client.callTool({
      name: "git_rename_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/helpers.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Rename history");
    expect(text).toContain("src/utils.ts");
    expect(text).toContain("src/helpers.ts");
    expect(text).toContain("rename");
  });

  it("リネームされていないファイルは空の結果を返す", async () => {
    const result = await client.callTool({
      name: "git_rename_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No rename");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_rename_history",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
      },
    });

    expect(result.isError).toBe(true);
  });
});
