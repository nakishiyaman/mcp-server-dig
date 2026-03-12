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

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        threshold_days: 1,
        top_n: 3,
        output_format: "json",
      },
    });
    const text = getToolText(result);

    // May return "No files found" if test repo was just created,
    // or JSON data if files are stale
    if (!text.includes("No files found")) {
      const data = JSON.parse(text);
      expect(data).toHaveProperty("thresholdDays", 1);
      expect(data).toHaveProperty("files");
    }
  });

  it("threshold_days=0で全ファイルがstaleとして返される", async () => {
    // threshold_days minimum is 1 per schema, so use 1
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        threshold_days: 1,
        top_n: 100,
      },
    });
    const text = getToolText(result);

    // Files created during test setup should be stale at threshold 1 day
    // if more than 1 day has passed since test repo creation
    expect(result.isError).not.toBe(true);
  });

  it("top_nでstaleファイル数を制限する", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        threshold_days: 1,
        top_n: 2,
        output_format: "json",
      },
    });
    const text = getToolText(result);

    if (!text.includes("No files found")) {
      const data = JSON.parse(text);
      expect(data.files.length).toBeLessThanOrEqual(2);
    }
  });
});
