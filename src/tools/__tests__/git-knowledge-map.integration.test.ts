import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_knowledge_map (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("ディレクトリ別の知識所有者を取得する", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 1,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Knowledge map");
    expect(text).toContain("src");
    expect(text).toContain("alice@example.com");
    expect(text).toContain("bob@example.com");
  });

  it("depth=2でより深い階層を分析する", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 2,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Knowledge map");
  });

  it("将来のsinceで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No directory knowledge data");
  });

  it("busFactor=1でRISK: single ownerを表示する", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 1,
      },
    });
    const text = getToolText(result);

    // Bob has 50+ bulk commits dominating src/ → bus factor = 1
    expect(text).toContain("bus factor: 1");
    expect(text).toContain("RISK: single owner");
  });

  it("contributors>5でtruncationメッセージを表示する", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: {
        repo_path: getRepoDir(),
        depth: 1,
      },
    });
    const text = getToolText(result);

    // src/ has 6 contributors (Alice, Bob, Carol, Dave, Eve, Frank)
    // The tool shows top 5 and truncates the rest
    expect(text).toContain("more contributors");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
