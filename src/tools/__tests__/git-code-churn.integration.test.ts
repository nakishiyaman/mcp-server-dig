import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_code_churn (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ファイルごとのchurn統計を返す", async () => {
    const result = await client.callTool({
      name: "git_code_churn",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Code churn");
    expect(text).toContain("src/index.ts");
  });

  it("パスでフィルタリングする", async () => {
    const result = await client.callTool({
      name: "git_code_churn",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/utils.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("src/utils.ts");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_code_churn",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
