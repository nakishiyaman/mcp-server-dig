import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_trend_analysis (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("hotspotsメトリクスのトレンドを分析する", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "hotspots",
      },
    });
    const text = getToolText(result);

    // Either has data or reports no data
    if (text.includes("Trend analysis")) {
      expect(text).toContain("Direction:");
      expect(text).toContain("Period breakdown:");
      expect(text).toContain("files changed");
    } else {
      expect(text).toContain("No hotspots data found");
    }
  });

  it("churnメトリクスのトレンドを分析する", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "churn",
      },
    });
    const text = getToolText(result);

    if (text.includes("Trend analysis")) {
      expect(text).toContain("lines churned");
    } else {
      expect(text).toContain("No churn data found");
    }
  });

  it("contributorsメトリクスのトレンドを分析する", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "contributors",
      },
    });
    const text = getToolText(result);

    if (text.includes("Trend analysis")) {
      expect(text).toContain("contributors");
    } else {
      expect(text).toContain("No contributors data found");
    }
  });

  it("commit_countメトリクスのトレンドを分析する", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "commit_count",
      },
    });
    const text = getToolText(result);

    if (text.includes("Trend analysis")) {
      expect(text).toContain("commits");
    } else {
      expect(text).toContain("No commit_count data found");
    }
  });

  it("week期間で分析する", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "hotspots",
        period_length: "week",
        num_periods: 2,
      },
    });
    const text = getToolText(result);

    // Should run without error
    expect(text.length).toBeGreaterThan(0);
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "hotspots",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("metric", "hotspots");
    expect(data).toHaveProperty("periodLength");
    expect(data).toHaveProperty("direction");
    expect(data).toHaveProperty("periods");
    expect(Array.isArray(data.periods)).toBe(true);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: "/nonexistent/repo",
        metric: "hotspots",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("path_patternで特定パスに限定する", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "churn",
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    if (text.includes("Trend analysis")) {
      expect(text).toContain("Scope: src/");
    }
  });
});
