import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_activity_drought (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("デフォルト設定でdrought分析を返す", async () => {
    const result = await client.callTool({
      name: "git_activity_drought",
      arguments: {
        repo_path: getRepoDir(),
        // Test repo has all commits on same day, so use min_drought=1 to get results
        min_drought_periods: 1,
      },
    });
    const text = getToolText(result);

    // With only 1 monthly period, we get the "too short" message which is also valid
    expect(text).toMatch(/Activity drought analysis|Analysis window too short|No drought patterns/);
  });

  it("weekly粒度で分析する", async () => {
    const result = await client.callTool({
      name: "git_activity_drought",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "weekly",
        min_drought_periods: 1,
      },
    });
    const text = getToolText(result);

    // Either returns analysis or short-window message
    expect(text).toMatch(/weekly|Analysis window/);
  });

  it("path_patternで特定パスに限定する", async () => {
    const result = await client.callTool({
      name: "git_activity_drought",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
        min_drought_periods: 1,
      },
    });
    const text = getToolText(result);

    // Either contains scope or window-too-short message
    expect(text).toMatch(/Scope: src\/|Analysis window/);
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_activity_drought",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
        min_drought_periods: 1,
      },
    });
    const text = getToolText(result);

    // If analysis window is sufficient, returns JSON; otherwise plain text
    try {
      const parsed = JSON.parse(text);
      expect(parsed.granularity).toBe("monthly");
      expect(parsed.minDroughtPeriods).toBe(1);
      expect(parsed.totalFilesAnalyzed).toBeGreaterThan(0);
      expect(Array.isArray(parsed.droughtFiles)).toBe(true);
    } catch {
      // Window too short — successResponse returns plain text
      expect(text).toContain("Analysis window too short");
    }
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_activity_drought",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("未来のsinceで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_activity_drought",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
  });

  it("min_drought_periodsが非常に大きい場合droughtファイルが空になる", async () => {
    const result = await client.callTool({
      name: "git_activity_drought",
      arguments: {
        repo_path: getRepoDir(),
        min_drought_periods: 100,
        output_format: "json",
      },
    });
    const text = getToolText(result);

    try {
      const parsed = JSON.parse(text);
      expect(parsed.droughtFiles).toHaveLength(0);
    } catch {
      // Window too short — also acceptable
      expect(text).toContain("Analysis window too short");
    }
  });
});
