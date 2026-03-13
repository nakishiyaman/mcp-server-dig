import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_code_age (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ファイルのコード年齢分布を返す", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: { repo_path: getRepoDir(), file_path: "src/index.ts" },
    });
    const text = getToolText(result);

    expect(text).toContain("Code age analysis: src/index.ts");
    expect(text).toContain("Total lines:");
    expect(text).toContain("Oldest code:");
    expect(text).toContain("Newest code:");
    expect(text).toMatch(/\d+%/);
  });

  it("JSON出力モードで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(parsed.filePath).toBe("src/index.ts");
    expect(typeof parsed.totalLines).toBe("number");
    expect(parsed.totalLines).toBeGreaterThan(0);
    expect(Array.isArray(parsed.brackets)).toBe(true);
    expect(parsed.brackets.length).toBeGreaterThan(0);
    expect(parsed.brackets[0]).toHaveProperty("label");
    expect(parsed.brackets[0]).toHaveProperty("lines");
    expect(parsed.brackets[0]).toHaveProperty("percentage");
    expect(parsed.oldestDate).toBeTruthy();
    expect(parsed.newestDate).toBeTruthy();
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
      },
    });
    expect(result.isError).toBe(true);
  });

  it("存在しないファイルでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "nonexistent-file.ts",
      },
    });
    expect(result.isError).toBe(true);
  });

  it("空ファイルでblameデータなしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/empty.ts",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No blame data");
  });

  it("年齢ブラケットの合計が100%になる", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    const totalPercentage = parsed.brackets.reduce(
      (sum: number, b: { percentage: number }) => sum + b.percentage,
      0,
    );
    // Due to rounding, total may be 99-101
    expect(totalPercentage).toBeGreaterThanOrEqual(99);
    expect(totalPercentage).toBeLessThanOrEqual(101);
  });
});
