import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_patterns (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("曜日別・時間帯別の分布を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_patterns",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Commit Patterns");
    expect(text).toContain("Day of week distribution");
    expect(text).toContain("Hour distribution");
    expect(text).toContain("Total commits:");
  });

  it("平日/週末比率を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_patterns",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Weekday:");
    expect(text).toContain("Weekend:");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_patterns",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(typeof parsed.totalCommits).toBe("number");
    expect(parsed.totalCommits).toBeGreaterThan(0);
    expect(Array.isArray(parsed.dayOfWeek)).toBe(true);
    expect(parsed.dayOfWeek).toHaveLength(7);
    expect(parsed.dayOfWeek[0]).toHaveProperty("day");
    expect(parsed.dayOfWeek[0]).toHaveProperty("count");
    expect(parsed.dayOfWeek[0]).toHaveProperty("percentage");
    expect(Array.isArray(parsed.hourOfDay)).toBe(true);
    expect(parsed.hourOfDay).toHaveLength(24);
    expect(typeof parsed.weekdayRatio).toBe("number");
    expect(typeof parsed.weekendRatio).toBe("number");
  });

  it("曜日分布の合計が100%前後になる", async () => {
    const result = await client.callTool({
      name: "git_commit_patterns",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    const totalPct = parsed.dayOfWeek.reduce(
      (sum: number, d: { percentage: number }) => sum + d.percentage,
      0,
    );
    expect(totalPct).toBeGreaterThanOrEqual(99);
    expect(totalPct).toBeLessThanOrEqual(101);
  });

  it("max_commitsで件数を制限できる", async () => {
    const result = await client.callTool({
      name: "git_commit_patterns",
      arguments: {
        repo_path: getRepoDir(),
        max_commits: 5,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(parsed.totalCommits).toBeLessThanOrEqual(5);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_patterns",
      arguments: { repo_path: "/nonexistent/repo" },
    });
    expect(result.isError).toBe(true);
  });

  it("タイムゾーン分布を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_patterns",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(Array.isArray(parsed.timezones)).toBe(true);
    expect(parsed.timezones.length).toBeGreaterThan(0);
    expect(parsed.timezones[0]).toHaveProperty("tz");
    expect(parsed.timezones[0]).toHaveProperty("count");
  });
});
