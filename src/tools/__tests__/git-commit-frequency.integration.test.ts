import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_frequency (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("週次のコミット頻度を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Commit frequency");
    expect(text).toContain("weekly");
    expect(text).toContain("commits");
    expect(text).toContain("authors");
    expect(text).toContain("files");
  });

  it("日次の粒度で集計する", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "daily",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("daily");
    // Daily format has YYYY-MM-DD pattern
    expect(text).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("月次の粒度で集計する", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "monthly",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("monthly");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(parsed.granularity).toBe("weekly");
    expect(parsed.totalCommits).toBeGreaterThan(0);
    expect(parsed.totalAuthors).toBeGreaterThan(0);
    expect(Array.isArray(parsed.periods)).toBe(true);
    expect(parsed.periods[0]).toHaveProperty("period");
    expect(parsed.periods[0]).toHaveProperty("commits");
    expect(parsed.periods[0]).toHaveProperty("authors");
    expect(parsed.periods[0]).toHaveProperty("files");
  });

  it("未来のsinceで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("path_patternで特定パスに限定する", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Commit frequency");
    expect(text).toContain("Scope: src/index.ts");
  });

  it("週次の粒度で正しい期間キーを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "weekly",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data.granularity).toBe("weekly");
    expect(data.periods.length).toBeGreaterThan(0);
    // Weekly period keys are YYYY-MM-DD (Monday)
    expect(data.periods[0].period).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
