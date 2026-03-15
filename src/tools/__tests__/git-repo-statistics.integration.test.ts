import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_repo_statistics (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("リポジトリの物理統計を返す", async () => {
    const result = await client.callTool({
      name: "git_repo_statistics",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Repository Statistics");
    expect(text).toContain("Objects:");
    expect(text).toContain("Total commits:");
    expect(text).toContain("Branches:");
    expect(text).toContain("Tags:");
    expect(text).toContain("First commit:");
    expect(text).toContain("Last commit:");
  });

  it("最大ファイルTOP Nを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_statistics",
      arguments: { repo_path: getRepoDir(), top_n_files: 3 },
    });
    const text = getToolText(result);

    expect(text).toContain("Largest tracked files");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_statistics",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(typeof parsed.objectCount).toBe("number");
    expect(typeof parsed.totalCommits).toBe("number");
    expect(parsed.totalCommits).toBeGreaterThan(0);
    expect(typeof parsed.branchCount).toBe("number");
    expect(typeof parsed.tagCount).toBe("number");
    expect(parsed.firstCommitDate).toBeTruthy();
    expect(parsed.lastCommitDate).toBeTruthy();
    expect(Array.isArray(parsed.largestFiles)).toBe(true);
  });

  it("JSON出力のlargestFilesが正しい構造を持つ", async () => {
    const result = await client.callTool({
      name: "git_repo_statistics",
      arguments: {
        repo_path: getRepoDir(),
        top_n_files: 3,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(parsed.largestFiles.length).toBeLessThanOrEqual(3);
    if (parsed.largestFiles.length > 0) {
      expect(parsed.largestFiles[0]).toHaveProperty("path");
      expect(parsed.largestFiles[0]).toHaveProperty("sizeBytes");
      expect(typeof parsed.largestFiles[0].sizeBytes).toBe("number");
    }
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_statistics",
      arguments: { repo_path: "/nonexistent/repo" },
    });
    expect(result.isError).toBe(true);
  });

  it("リポジトリ年齢が正の値を持つ", async () => {
    const result = await client.callTool({
      name: "git_repo_statistics",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    const first = new Date(parsed.firstCommitDate);
    const last = new Date(parsed.lastCommitDate);
    expect(last.getTime()).toBeGreaterThanOrEqual(first.getTime());
  });
});
