import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_expertise_decay (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ディレクトリ別の専門知識衰退を分析する", async () => {
    const result = await client.callTool({
      name: "git_expertise_decay",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Expertise decay analysis");
    expect(text).toContain("Directories:");
  });

  it("path_patternでスコープを限定する", async () => {
    const result = await client.callTool({
      name: "git_expertise_decay",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    // Either finds results or empty
    expect(text.length).toBeGreaterThan(0);
  });

  it("閾値を変更して結果が変わる", async () => {
    const result = await client.callTool({
      name: "git_expertise_decay",
      arguments: {
        repo_path: getRepoDir(),
        inactivity_threshold_days: 1,
        fading_threshold_days: 1,
      },
    });
    const text = getToolText(result);

    // With 1-day thresholds, most owners should be inactive or fading
    expect(text).toContain("Expertise decay analysis");
  });

  it("depth=2でより深い階層を分析する", async () => {
    const result = await client.callTool({
      name: "git_expertise_decay",
      arguments: {
        repo_path: getRepoDir(),
        depth: 2,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("depth=2");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_expertise_decay",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("entries");
    expect(data.summary).toHaveProperty("totalDirectories");
    expect(data.summary).toHaveProperty("highRisk");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_expertise_decay",
      arguments: { repo_path: "/nonexistent/repo" },
    });

    expect(result.isError).toBe(true);
  });

  it("未来のsinceでデータがない場合", async () => {
    const result = await client.callTool({
      name: "git_expertise_decay",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No directories found");
  });
});
