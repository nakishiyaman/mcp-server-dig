import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_knowledge_loss_risk (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("コントリビューター別の知識喪失リスクを分析する", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Knowledge loss risk analysis");
    expect(text).toContain("Contributors analyzed:");
    expect(text).toContain("recovery cost:");
  });

  it("target_authorで特定著者にフィルタする", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        target_author: "alice",
      },
    });
    const text = getToolText(result);

    // Either finds Alice's risk or returns "no risks found"
    if (text.includes("Contributors analyzed:")) {
      expect(text).toContain("alice");
    } else {
      expect(text).toContain("No knowledge loss risks found");
      expect(text).toContain("alice");
    }
  });

  it("depth=2でより深い階層を分析する", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
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
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("depth");
    expect(data).toHaveProperty("totalContributors");
    expect(data).toHaveProperty("contributors");
    expect(Array.isArray(data.contributors)).toBe(true);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: { repo_path: "/nonexistent/repo" },
    });

    expect(result.isError).toBe(true);
  });

  it("未来のsinceでデータがない場合", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No knowledge loss risks found");
  });

  it("min_ownership_pct=100で閾値を高くする", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        min_ownership_pct: 100,
      },
    });
    const text = getToolText(result);

    // With 100% threshold, may find no contributors or only sole owners
    expect(text.length).toBeGreaterThan(0);
  });

  it("存在しない著者でフィルタした場合空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        target_author: "nonexistent-author-xyz",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No knowledge loss risks found");
  });
});
