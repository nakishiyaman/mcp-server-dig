import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_impact_analysis (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ファイルの影響範囲を分析する", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Impact analysis for: src/index.ts");
    expect(text).toContain("Blast radius:");
  });

  it("co-changedファイルを検出する", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
        min_coupling: 1,
      },
    });
    const text = getToolText(result);

    // index.ts co-changes with utils.ts/helpers.ts
    expect(text).toContain("Co-changed files");
  });

  it("影響がないファイルで空メッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/merged-feature.ts",
        min_coupling: 100,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No impact detected");
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("targetPath", "src/index.ts");
    expect(data).toHaveProperty("directImpact");
    expect(data.directImpact).toHaveProperty("coChangedFiles");
    expect(data.directImpact).toHaveProperty("totalCoChanges");
    expect(data).toHaveProperty("indirectImpact");
    expect(data).toHaveProperty("contributorOverlap");
    expect(data).toHaveProperty("riskSummary");
    expect(data.riskSummary).toHaveProperty("blastRadius");
    expect(["low", "medium", "high"]).toContain(data.riskSummary.blastRadius);
  });

  it("レビュアー提案を含む", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Suggested reviewers:");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: "/nonexistent/repo",
        target_path: "src/index.ts",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("min_coupling=1で低結合度のファイルも含む", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
        min_coupling: 1,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data.directImpact.coChangedFiles.length).toBeGreaterThan(0);
    expect(data.directImpact.coChangedFiles[0]).toHaveProperty("filePath");
    expect(data.directImpact.coChangedFiles[0]).toHaveProperty("coChangeCount");
    expect(data.directImpact.coChangedFiles[0]).toHaveProperty("percentage");
  });

  it("blast radiusがco-changed数に基づいて分類される", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
        min_coupling: 1,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    const count = data.riskSummary.coChangedFileCount;
    const expected = count >= 10 ? "high" : count >= 3 ? "medium" : "low";
    expect(data.riskSummary.blastRadius).toBe(expected);
  });
});
