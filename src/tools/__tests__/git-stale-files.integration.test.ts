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

  it("path_pattern付きでスコープ表示を含む", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
        threshold_days: 1,
      },
    });
    const text = getToolText(result);

    // Either stale files found with scope, or no stale files message
    expect(result.isError).not.toBe(true);
    if (text.includes("Stale files")) {
      expect(text).toContain("Scope: src/");
    }
  });

  it("path_patternなしで全ファイルを対象にする", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        threshold_days: 999999,
      },
    });
    const text = getToolText(result);

    // No stale files with extreme threshold
    expect(text).toContain("No files found that are stale");
    expect(text).not.toContain("Scope:");
  });

  it("存在しないパスでtrackedFiles空の結果を返す", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "nonexistent-directory/",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No tracked files found");
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
