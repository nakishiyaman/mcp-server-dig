import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_survival_analysis (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コードチャーン時系列分析を返す", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Code churn analysis");
    expect(text).toContain("weekly");
    expect(text).toContain("Churn");
  });

  it("月次の粒度で集計する", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
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
      name: "git_survival_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(parsed.granularity).toBe("weekly");
    expect(parsed.totalAdditions).toBeGreaterThan(0);
    expect(typeof parsed.overallChurnRate).toBe("number");
    expect(Array.isArray(parsed.periods)).toBe(true);
    expect(parsed.periods[0]).toHaveProperty("additions");
    expect(parsed.periods[0]).toHaveProperty("deletions");
    expect(parsed.periods[0]).toHaveProperty("netChange");
    expect(parsed.periods[0]).toHaveProperty("churnRate");
  });

  it("未来のsinceで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
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
      name: "git_survival_analysis",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("path_patternで特定パスに限定する", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Scope: src/");
  });
});
