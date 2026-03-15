import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_contributor_growth (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("期間別のコントリビューター推移を返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_growth",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Contributor Growth Analysis");
    expect(text).toContain("Total unique contributors:");
    expect(text).toContain("Trend:");
    expect(text).toContain("Active");
  });

  it("新規コントリビューターを検出する", async () => {
    const result = await client.callTool({
      name: "git_contributor_growth",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("New contributors by period:");
    expect(text).toContain("Alice");
  });

  it("quarterlyモードで集計できる", async () => {
    const result = await client.callTool({
      name: "git_contributor_growth",
      arguments: {
        repo_path: getRepoDir(),
        period: "quarterly",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Contributor Growth Analysis");
    expect(text).toMatch(/\d{4}-Q[1-4]/);
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_growth",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(typeof parsed.totalContributors).toBe("number");
    expect(parsed.totalContributors).toBeGreaterThan(0);
    expect(Array.isArray(parsed.periods)).toBe(true);
    expect(parsed.periods[0]).toHaveProperty("period");
    expect(parsed.periods[0]).toHaveProperty("totalActive");
    expect(parsed.periods[0]).toHaveProperty("newContributors");
    expect(parsed.periods[0]).toHaveProperty("departedContributors");
    expect(parsed.periods[0]).toHaveProperty("busFactor");
    expect(["growing", "stable", "shrinking"]).toContain(parsed.trend);
  });

  it("定着率を算出する", async () => {
    const result = await client.callTool({
      name: "git_contributor_growth",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    // At least some periods should have retention rates
    const withRetention = parsed.periods.filter(
      (p: { retentionRate: number | null }) => p.retentionRate !== null,
    );
    // First period has no previous, so if we have >1 period, at least one should have retention
    if (parsed.periods.length > 1) {
      expect(withRetention.length).toBeGreaterThan(0);
    }
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_growth",
      arguments: { repo_path: "/nonexistent/repo" },
    });
    expect(result.isError).toBe(true);
  });

  it("バスファクタートレンドが含まれる", async () => {
    const result = await client.callTool({
      name: "git_contributor_growth",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    for (const period of parsed.periods) {
      expect(typeof period.busFactor).toBe("number");
      expect(period.busFactor).toBeGreaterThanOrEqual(0);
    }
  });
});
