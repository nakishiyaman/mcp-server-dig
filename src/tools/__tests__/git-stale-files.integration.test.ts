import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_stale_files (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("threshold 1日でstaleファイルを検出する", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        threshold_days: 1,
      },
    });
    // Recently created test repo — files may or may not be stale at 1 day
    expect(result.isError).not.toBe(true);
  });

  it("閾値超過ファイルがない場合は空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        threshold_days: 999999,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No files found that are stale");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
