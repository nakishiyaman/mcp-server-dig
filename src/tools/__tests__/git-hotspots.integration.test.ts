import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_hotspots (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("変更頻度の高いファイルを検出する", async () => {
    const result = await client.callTool({
      name: "git_hotspots",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Change hotspots");
    // index.ts is the top hotspot (4 original + 50 bulk = 54+ changes)
    expect(text).toContain("src/index.ts");
  });

  it("path_patternでフィルタリングする", async () => {
    const result = await client.callTool({
      name: "git_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/utils.ts",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("src/utils.ts");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_hotspots",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
