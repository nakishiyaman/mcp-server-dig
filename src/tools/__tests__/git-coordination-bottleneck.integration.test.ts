import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_coordination_bottleneck (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ディレクトリ別調整コストランキングを返す", async () => {
    const result = await client.callTool({
      name: "git_coordination_bottleneck",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    if (text.includes("Coordination bottleneck analysis")) {
      expect(text).toContain("Score");
      expect(text).toContain("Authors");
      expect(text).toContain("Risk");
    } else {
      expect(text).toContain("No coordination bottlenecks found");
    }
  });

  it("top_nでランキング制限", async () => {
    const result = await client.callTool({
      name: "git_coordination_bottleneck",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 3,
      },
    });
    const text = getToolText(result);

    if (text.includes("Coordination bottleneck analysis")) {
      expect(text).toContain("top 3");
    }
  });

  it("depth=2で深い階層分析", async () => {
    const result = await client.callTool({
      name: "git_coordination_bottleneck",
      arguments: {
        repo_path: getRepoDir(),
        depth: 2,
      },
    });
    const text = getToolText(result);

    if (text.includes("Coordination bottleneck analysis")) {
      expect(text).toContain("depth=2");
    }
  });

  it("JSON出力モード", async () => {
    const result = await client.callTool({
      name: "git_coordination_bottleneck",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);

    if (!text.includes("No coordination bottlenecks found")) {
      const data = JSON.parse(text);
      expect(data).toHaveProperty("depth");
      expect(data).toHaveProperty("entries");
      expect(Array.isArray(data.entries)).toBe(true);
      if (data.entries.length > 0) {
        expect(data.entries[0]).toHaveProperty("coordinationScore");
        expect(data.entries[0]).toHaveProperty("riskLevel");
      }
    }
  });

  it("未来のsinceで空結果", async () => {
    const result = await client.callTool({
      name: "git_coordination_bottleneck",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No coordination bottlenecks found");
  });

  it("since指定", async () => {
    const result = await client.callTool({
      name: "git_coordination_bottleneck",
      arguments: {
        repo_path: getRepoDir(),
        since: "1 year ago",
      },
    });
    const text = getToolText(result);

    expect(text.length).toBeGreaterThan(0);
  });

  it("存在しないリポジトリでエラー", async () => {
    const result = await client.callTool({
      name: "git_coordination_bottleneck",
      arguments: { repo_path: "/nonexistent/repo" },
    });

    expect(result.isError).toBe(true);
  });
});
