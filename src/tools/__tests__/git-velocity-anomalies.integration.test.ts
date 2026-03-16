import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_velocity_anomalies (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コミット頻度の異常を検出する", async () => {
    const result = await client.callTool({
      name: "git_velocity_anomalies",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Velocity anomaly detection");
    expect(text).toContain("Total:");
    expect(text).toContain("Statistics:");
  });

  it("低い閾値でより多くの異常を検出する", async () => {
    const result = await client.callTool({
      name: "git_velocity_anomalies",
      arguments: {
        repo_path: getRepoDir(),
        threshold_sigma: 0.5,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("threshold=0.5σ");
  });

  it("高い閾値で異常なしになりうる", async () => {
    const result = await client.callTool({
      name: "git_velocity_anomalies",
      arguments: {
        repo_path: getRepoDir(),
        threshold_sigma: 5,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Velocity anomaly detection");
  });

  it("path_patternでスコープを限定する", async () => {
    const result = await client.callTool({
      name: "git_velocity_anomalies",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(text.length).toBeGreaterThan(0);
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_velocity_anomalies",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("granularity");
    expect(data).toHaveProperty("mean");
    expect(data).toHaveProperty("stddev");
    expect(data).toHaveProperty("anomalies");
    expect(Array.isArray(data.anomalies)).toBe(true);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_velocity_anomalies",
      arguments: { repo_path: "/nonexistent/repo" },
    });

    expect(result.isError).toBe(true);
  });

  it("未来のsinceでデータがない場合", async () => {
    const result = await client.callTool({
      name: "git_velocity_anomalies",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
  });
});
