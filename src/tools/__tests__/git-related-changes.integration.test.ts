import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_related_changes (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("共変更ファイルを検出する", async () => {
    const result = await client.callTool({
      name: "git_related_changes",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("src/index.ts");
    // utils.ts was changed in 2 commits that also touched index.ts
    expect(text).toContain("src/utils.ts");
  });

  it("高いmin_couplingで共変更なしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_related_changes",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        min_coupling: 100,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No co-changed files found for src/index.ts");
    expect(text).toContain("min coupling: 100");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_related_changes",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
      },
    });

    expect(result.isError).toBe(true);
  });
});
