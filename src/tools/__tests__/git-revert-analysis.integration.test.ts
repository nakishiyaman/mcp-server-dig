import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_revert_analysis (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("リバートコミットを検出する", async () => {
    const result = await client.callTool({
      name: "git_revert_analysis",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Revert Analysis");
    expect(text).toContain("Total reverts:");
    expect(text).not.toContain("Total reverts: 0");
  });

  it("リバートホットスポットを返す", async () => {
    const result = await client.callTool({
      name: "git_revert_analysis",
      arguments: { repo_path: getRepoDir() },
    });
    const text = getToolText(result);

    expect(text).toContain("Revert hotspots");
    expect(text).toContain("buggy.ts");
  });

  it("time-to-revert統計を返す（即時リバートの場合はnull）", async () => {
    const result = await client.callTool({
      name: "git_revert_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    // In test repo, revert happens immediately so timeToRevertMs may be 0
    // timeToRevert stats are null when all times are 0 (filtered out)
    if (parsed.timeToRevert !== null) {
      expect(parsed.timeToRevert).toHaveProperty("minMs");
      expect(parsed.timeToRevert).toHaveProperty("maxMs");
      expect(parsed.timeToRevert).toHaveProperty("medianMs");
      expect(parsed.timeToRevert).toHaveProperty("avgMs");
    }
    // Verify the entry itself has timeToRevertMs field
    expect(parsed.reverts[0]).toHaveProperty("timeToRevertMs");
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_revert_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    expect(typeof parsed.totalReverts).toBe("number");
    expect(parsed.totalReverts).toBeGreaterThan(0);
    expect(Array.isArray(parsed.reverts)).toBe(true);
    expect(parsed.reverts[0]).toHaveProperty("revertHash");
    expect(parsed.reverts[0]).toHaveProperty("originalHash");
    expect(parsed.reverts[0]).toHaveProperty("timeToRevertMs");
    expect(parsed.reverts[0]).toHaveProperty("affectedFiles");
    expect(Array.isArray(parsed.hotspots)).toBe(true);
    // timeToRevert may be null when reverts happen in same second
    if (parsed.timeToRevert !== null) {
      expect(parsed.timeToRevert).toHaveProperty("minMs");
      expect(parsed.timeToRevert).toHaveProperty("medianMs");
    }
  });

  it("リバートがない条件でNo revert commitsメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_revert_analysis",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No revert commits found");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_revert_analysis",
      arguments: { repo_path: "/nonexistent/repo" },
    });
    expect(result.isError).toBe(true);
  });

  it("オリジナルコミットの情報を含む", async () => {
    const result = await client.callTool({
      name: "git_revert_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));

    const revert = parsed.reverts[0];
    expect(revert.originalSubject).toContain("buggy");
    expect(revert.revertSubject).toContain("Revert");
  });
});
