import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_complexity_hotspots (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("リポジトリ全体の複雑性ホットスポットをランキングする", async () => {
    const result = await client.callTool({
      name: "git_complexity_hotspots",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Complexity hotspots");
    expect(text).toContain("Score:");
    expect(text).toContain("Change freq:");
    expect(text).toContain("Code churn:");
    expect(text).toContain("Knowledge:");
    expect(text).toContain("Coupling:");
    expect(text).toContain("Staleness:");
    expect(text).toContain("Conflicts:");
  });

  it("top_nで返却件数を制限する", async () => {
    const result = await client.callTool({
      name: "git_complexity_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 3,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Complexity hotspots");
    const entries = text.match(/#\d+ /g) ?? [];
    expect(entries.length).toBeLessThanOrEqual(3);
  });

  it("path_patternでファイルを絞り込む", async () => {
    const result = await client.callTool({
      name: "git_complexity_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/index.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Complexity hotspots");
    if (text.includes("#1")) {
      expect(text).toContain("src/index.ts");
    }
  });

  it("未来のsinceでホットスポットなしを返す", async () => {
    const result = await client.callTool({
      name: "git_complexity_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No complexity hotspots found");
  });

  it("スコアが18点満点である", async () => {
    const result = await client.callTool({
      name: "git_complexity_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 1,
      },
    });
    const text = getToolText(result);

    // Score format: N/18
    expect(text).toMatch(/\d+\/18/);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_complexity_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("hotspots");
    expect(data).toHaveProperty("totalAnalyzed");
    expect(Array.isArray(data.hotspots)).toBe(true);
    if (data.hotspots.length > 0) {
      expect(data.hotspots[0]).toHaveProperty("filePath");
      expect(data.hotspots[0]).toHaveProperty("score");
      expect(data.hotspots[0]).toHaveProperty("overallRisk");
      expect(data.hotspots[0]).toHaveProperty("dimensions");
      // Should have 6 dimensions (including conflictFrequency)
      expect(data.hotspots[0].dimensions).toHaveLength(6);
      const dimNames = data.hotspots[0].dimensions.map((d: { name: string }) => d.name);
      expect(dimNames).toContain("conflictFrequency");
    }
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_complexity_hotspots",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
