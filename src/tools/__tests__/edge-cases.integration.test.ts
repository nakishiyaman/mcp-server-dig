import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { successResponse } from "../response.js";
import { getRepoDir } from "./helpers.js";

describe("エッジケース — blame (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("空ファイルのblameは空データメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/empty.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No blame data");
  });

  it("存在しないファイルへのblameはエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "nonexistent.ts",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("end_lineのみ指定でblameが動作する", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        end_line: 2,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Blame context for: src/index.ts");
    expect(text).toContain("block(s)");
  });
});

describe("エッジケース — バイナリファイル (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("バイナリファイルがchurn分析で0として処理される", async () => {
    const result = await client.callTool({
      name: "git_code_churn",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 100,
      },
    });
    const text = getToolText(result);

    // Binary files have 0 churn (insertions/deletions are "-")
    expect(text).toContain("assets/logo.png");
  });

  it("バイナリファイルがhotspotsに含まれる", async () => {
    const result = await client.callTool({
      name: "git_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 100,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("assets/logo.png");
  });
});

describe("エッジケース — 非ASCIIファイル名 (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("日本語ファイル名がblameで正しく処理される", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/日本語ファイル.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("こんにちは");
  });

  it("スペース含みファイル名がblameで正しく処理される", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/file with spaces.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("block(s)");
  });

  it("非ASCIIファイルがhotspots分析に含まれる", async () => {
    const result = await client.callTool({
      name: "git_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        top_n: 100,
      },
    });
    const text = getToolText(result);

    // Git may quote non-ASCII filenames
    expect(
      text.includes("日本語") || text.includes("\\"),
    ).toBe(true);
  });

  it("非ASCIIファイルのcontributors分析が動作する", async () => {
    const result = await client.callTool({
      name: "git_contributor_patterns",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/日本語ファイル.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("commit");
  });
});

describe("エッジケース — truncation", () => {
  it("50,000文字超の出力がtruncateされる", () => {
    const longText = "a".repeat(60_000);
    const response = successResponse(longText);
    expect(response.content[0].text.length).toBeLessThanOrEqual(
      50_000 + 100, // truncation message margin
    );
    expect(response.content[0].text).toContain("[Output truncated");
  });

  it("大量コミットのhotspots分析が成功する", async () => {
    const client = await createTestMcpClient();
    try {
      const result = await client.callTool({
        name: "git_hotspots",
        arguments: {
          repo_path: getRepoDir(),
          max_commits: 500,
          top_n: 5,
        },
      });
      const text = getToolText(result);

      expect(text).toContain("src/index.ts");
    } finally {
      await closeMcpClient();
    }
  });
});
