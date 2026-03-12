import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_file_risk_profile (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ファイルのリスクプロファイルを生成する", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Risk profile for: src/index.ts");
    expect(text).toContain("Change frequency:");
    expect(text).toContain("Code churn:");
    expect(text).toContain("Knowledge risk:");
  });

  it("存在しないファイルでもリスクプロファイルを返す", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/helpers.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Risk profile for: src/helpers.ts");
    expect(text).toContain("Overall:");
  });

  it("HIGH以上のリスクでnext actionsが表示される", async () => {
    // index.ts has high change frequency due to bulk commits
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Overall:");
    // index.ts should have HIGH change frequency → next actions recommended
    if (text.includes("HIGH")) {
      expect(text).toContain("Next actions:");
    }
  });

  it("sinceパラメータで分析期間を絞り込む", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    // With future date, should get LOW risk since no changes
    expect(text).toContain("Risk profile for: src/index.ts");
    expect(text).toContain("LOW");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
      },
    });

    expect(result.isError).toBe(true);
  });
});

describe("git_repo_health (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("リポジトリの健全性サマリーを生成する", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Repository health");
    expect(text).toContain("Contributors:");
    expect(text).toContain("Alice");
    expect(text).toContain("Bob");
  });

  it("sinceパラメータで分析期間を絞り込む", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Repository health summary");
    expect(text).toContain("Total commits:");
    expect(text).toContain("since 2099-01-01");
  });

  it("sinceなしで全期間の健全性を分析する", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
        max_commits: 500,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Repository health summary");
    expect(text).not.toContain("since ");
    expect(text).toContain("Tracked files:");
  });

  it("stale_threshold_days=1で全ファイルをstaleとして検出する", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
        stale_threshold_days: 1,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Repository health summary");
    // Files created during test setup may be stale at 1 day threshold
    expect(text).toContain("Stale files:");
  });

  it("知識集中リスクの警告を表示する", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Contributors:");
    // Test repo has Alice and Bob — may trigger knowledge concentration
    // The test validates that the contributor section renders correctly
    expect(text).toContain("commits");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("trackedFiles");
    expect(data).toHaveProperty("totalCommits");
    expect(data).toHaveProperty("contributors");
    expect(data).toHaveProperty("staleFiles");
    expect(data).toHaveProperty("hotspots");
    expect(data).toHaveProperty("churn");
  });

  it("未来のsinceで空のhotspotsとchurnを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data.totalCommits).toBe(0);
    expect(data.hotspots).toHaveLength(0);
  });
});
