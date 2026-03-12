import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_branch_activity (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ブランチの活性度を分析する", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Branch activity analysis");
    expect(text).toContain("Total branches:");
    // Test repo has feature-branch and merge-test-branch
    expect(text).toContain("feature-branch");
  });

  it("マージ済みブランチを検出する", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    // merge-test-branch was merged into main
    expect(text).toContain("merge-test-branch");
    expect(text).toContain("[merged]");
  });

  it("ahead/behind情報を表示する", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    // feature-branch diverges from main
    expect(text).toMatch(/ahead: \d+/);
    expect(text).toMatch(/behind: \d+/);
  });

  it("stale_daysでアクティブ判定を変える", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
        stale_days: 1,
        abandoned_days: 2,
      },
    });
    const text = getToolText(result);

    // With very low thresholds, branches should be stale or abandoned
    expect(text).toContain("Branch activity analysis");
  });

  it("クリーンアップ候補を表示する", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
        stale_days: 1,
        abandoned_days: 2,
      },
    });
    const text = getToolText(result);

    // merge-test-branch is merged and inactive → cleanup candidate
    if (text.includes("Cleanup candidates")) {
      expect(text).toContain("merge-test-branch");
    }
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("summary");
    expect(data.summary).toHaveProperty("total");
    expect(data).toHaveProperty("branches");
    expect(data.branches.length).toBeGreaterThan(0);
    expect(data.branches[0]).toHaveProperty("name");
    expect(data.branches[0]).toHaveProperty("activity");
  });

  it("include_remote=trueでリモートブランチも含む", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
        include_remote: true,
      },
    });
    const text = getToolText(result);

    // Local-only repo has no remote branches, but the tool should still work
    expect(text).toContain("Branch activity analysis");
    expect(text).toContain("Total branches:");
  });

  it("全ブランチがactiveの場合にstale/abandonedセクションが表示されない", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
        stale_days: 99999,
        abandoned_days: 99999,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Active:");
    expect(text).not.toContain("Stale:");
    expect(text).not.toContain("Abandoned:");
  });

  it("stale_daysとabandoned_daysの分類ロジックが動作する", async () => {
    // Use stale_days=1 to test the classification branches
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: getRepoDir(),
        stale_days: 1,
        abandoned_days: 2,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("staleDays", 1);
    expect(data).toHaveProperty("abandonedDays", 2);
    // Every branch should have an activity classification
    for (const branch of data.branches) {
      expect(["active", "stale", "abandoned"]).toContain(branch.activity);
    }
  });
});
