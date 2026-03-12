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

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
