import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_release_comparison (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("2つのタグ間でメトリクスを比較する", async () => {
    const result = await client.callTool({
      name: "git_release_comparison",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "v0.1.0",
        target_ref: "v0.2.0",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Release comparison: v0.1.0 → v0.2.0");
    expect(text).toContain("Hotspot files:");
    expect(text).toContain("Total churn:");
    expect(text).toContain("Active contributors:");
    expect(text).toContain("Avg bus factor:");
  });

  it("HEADとタグ間で比較できる", async () => {
    const result = await client.callTool({
      name: "git_release_comparison",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "v0.1.0",
        target_ref: "HEAD",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Release comparison: v0.1.0 → HEAD");
    expect(text).toContain("Hotspot files:");
  });

  it("同一ref間で変化なしを返す", async () => {
    const result = await client.callTool({
      name: "git_release_comparison",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "v0.1.0",
        target_ref: "v0.1.0",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Release comparison: v0.1.0 → v0.1.0");
    expect(text).toContain("no change");
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_release_comparison",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "v0.1.0",
        target_ref: "v0.2.0",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("baseRef", "v0.1.0");
    expect(data).toHaveProperty("targetRef", "v0.2.0");
    expect(data).toHaveProperty("base");
    expect(data).toHaveProperty("target");
    expect(data).toHaveProperty("delta");
    expect(data.base).toHaveProperty("hotspotCount");
    expect(data.base).toHaveProperty("totalChurn");
    expect(data.base).toHaveProperty("activeContributors");
    expect(data.base).toHaveProperty("avgBusFactor");
  });

  it("path_patternで対象を絞り込む", async () => {
    const result = await client.callTool({
      name: "git_release_comparison",
      arguments: {
        repo_path: getRepoDir(),
        base_ref: "v0.1.0",
        target_ref: "HEAD",
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Release comparison:");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_release_comparison",
      arguments: {
        repo_path: "/nonexistent/repo",
        base_ref: "v1.0",
        target_ref: "v2.0",
      },
    });

    expect(result.isError).toBe(true);
  });
});
