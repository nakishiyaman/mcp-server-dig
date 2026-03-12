import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_blame_context (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ファイルのblameブロックを返す", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Blame context for: src/index.ts");
    expect(text).toContain("block(s)");
    expect(text).toContain("Bob");
    expect(text).toContain("const z = 3;");
  });

  it("行範囲を尊重する", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        start_line: 3,
        end_line: 3,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("1 block(s)");
    expect(text).toContain("Bob");
    expect(text).toContain("[L3]");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("file", "src/index.ts");
    expect(data).toHaveProperty("blocks");
    expect(data.blocks.length).toBeGreaterThan(0);
  });
});
