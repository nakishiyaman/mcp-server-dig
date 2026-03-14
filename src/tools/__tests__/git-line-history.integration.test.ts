import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_line_history (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("行範囲指定で変更履歴を取得する", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/calculator.ts",
        start_line: 1,
        end_line: 3,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Line history:");
    expect(text).toContain("calculator.ts");
    expect(text).toContain("Commits:");
  });

  it("funcname指定で関数の変更履歴を取得する", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/calculator.ts",
        funcname: "calculate",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Line history:");
    expect(text).toContain("function calculate");
    expect(text).toContain("Commits:");
  });

  it("範囲外の行指定でエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/calculator.ts",
        start_line: 9999,
        end_line: 10000,
      },
    });

    expect(result.isError).toBe(true);
  });

  it("start_lineとend_lineの両方が必要", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/calculator.ts",
      },
    });

    expect(result.isError).toBe(true);
    const text = getToolText(result);
    expect(text).toContain("funcname");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: "/nonexistent/repo",
        file_path: "src/index.ts",
        start_line: 1,
        end_line: 5,
      },
    });

    expect(result.isError).toBe(true);
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/calculator.ts",
        start_line: 1,
        end_line: 5,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("file", "src/calculator.ts");
    expect(data).toHaveProperty("range");
    expect(data).toHaveProperty("totalCommits");
    expect(data).toHaveProperty("entries");
    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.entries[0]).toHaveProperty("hash");
    expect(data.entries[0]).toHaveProperty("author");
    expect(data.entries[0]).toHaveProperty("subject");
  });

  it("存在しない関数名はgitエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/calculator.ts",
        funcname: "nonExistentFunctionXyz",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("max_commitsで結果を制限する", async () => {
    const result = await client.callTool({
      name: "git_line_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/calculator.ts",
        start_line: 1,
        end_line: 5,
        max_commits: 1,
      },
    });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(
      (await client.callTool({
        name: "git_line_history",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/calculator.ts",
          start_line: 1,
          end_line: 5,
          max_commits: 1,
          output_format: "json",
        },
      }).then((r) => getToolText(r))),
    );

    expect(data.entries.length).toBeLessThanOrEqual(1);
  });
});
