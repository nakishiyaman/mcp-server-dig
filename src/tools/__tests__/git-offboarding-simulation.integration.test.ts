import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_offboarding_simulation (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("著者の離脱シミュレーション結果を返す", async () => {
    const result = await client.callTool({
      name: "git_offboarding_simulation",
      arguments: {
        repo_path: getRepoDir(),
        author: "alice",
      },
    });
    const text = getToolText(result);

    // Either finds impact or reports no impact
    if (text.includes("Off-boarding simulation")) {
      expect(text).toContain("alice");
      expect(text).toContain("Bus factor:");
      expect(text).toContain("Overall risk:");
    } else {
      expect(text).toContain("No impact found");
    }
  });

  it("存在しない著者で空の影響結果を返す", async () => {
    const result = await client.callTool({
      name: "git_offboarding_simulation",
      arguments: {
        repo_path: getRepoDir(),
        author: "nonexistent-user-xyz-999",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No impact found");
  });

  it("depth=2で深い階層分析", async () => {
    const result = await client.callTool({
      name: "git_offboarding_simulation",
      arguments: {
        repo_path: getRepoDir(),
        author: "alice",
        depth: 2,
      },
    });
    const text = getToolText(result);

    if (text.includes("Off-boarding simulation")) {
      expect(text).toContain("depth=2");
    } else {
      expect(text).toContain("No impact found");
    }
  });

  it("path_patternでスコープ制限", async () => {
    const result = await client.callTool({
      name: "git_offboarding_simulation",
      arguments: {
        repo_path: getRepoDir(),
        author: "alice",
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(text.length).toBeGreaterThan(0);
  });

  it("JSON出力モード", async () => {
    const result = await client.callTool({
      name: "git_offboarding_simulation",
      arguments: {
        repo_path: getRepoDir(),
        author: "alice",
        output_format: "json",
      },
    });
    const text = getToolText(result);

    // If there's impact, it should be valid JSON
    if (!text.includes("No impact found")) {
      const data = JSON.parse(text);
      expect(data).toHaveProperty("targetAuthor");
      expect(data).toHaveProperty("matchedEmails");
      expect(data).toHaveProperty("overallRisk");
      expect(data).toHaveProperty("directories");
      expect(Array.isArray(data.directories)).toBe(true);
    }
  });

  it("since指定", async () => {
    const result = await client.callTool({
      name: "git_offboarding_simulation",
      arguments: {
        repo_path: getRepoDir(),
        author: "alice",
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No impact found");
  });

  it("存在しないリポジトリでエラー", async () => {
    const result = await client.callTool({
      name: "git_offboarding_simulation",
      arguments: {
        repo_path: "/nonexistent/repo",
        author: "alice",
      },
    });

    expect(result.isError).toBe(true);
  });
});
