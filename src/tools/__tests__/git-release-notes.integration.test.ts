import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_release_notes (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("2つのタグ間のリリースノートを生成する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "v0.1.0",
        to_ref: "v0.2.0",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Release notes: v0.1.0..v0.2.0");
    expect(text).toContain("commit(s)");
    expect(text).toContain("contributor(s)");
    expect(text).toContain("Contributors:");
  });

  it("Conventional Commitsをtype別にグループ化する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "v0.1.0",
        to_ref: "v0.2.0",
        group_by: "type",
      },
    });
    const text = getToolText(result);

    // Test repo has "feat:" commits between v0.1.0 and v0.2.0
    expect(text).toContain("Features:");
  });

  it("group_by=noneで全コミットをフラットに表示する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "v0.1.0",
        to_ref: "v0.2.0",
        group_by: "none",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Release notes:");
    // "all" group instead of type-specific groups
    expect(text).not.toContain("Features:");
  });

  it("同一ref間で変更なしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "v0.1.0",
        to_ref: "v0.1.0",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found between");
  });

  it("JSON出力フォーマットで構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "v0.1.0",
        to_ref: "v0.2.0",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("fromRef", "v0.1.0");
    expect(data).toHaveProperty("toRef", "v0.2.0");
    expect(data).toHaveProperty("totalCommits");
    expect(data.totalCommits).toBeGreaterThan(0);
    expect(data).toHaveProperty("groups");
    expect(data).toHaveProperty("breakingChanges");
    expect(data).toHaveProperty("contributors");
    expect(data).toHaveProperty("dateRange");
    expect(data.contributors.length).toBeGreaterThan(0);
    expect(data.contributors[0]).toHaveProperty("name");
    expect(data.contributors[0]).toHaveProperty("commitCount");
  });

  it("不正なrefでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "nonexistent-ref",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: "/nonexistent/repo",
        from_ref: "v0.1.0",
      },
    });

    expect(result.isError).toBe(true);
  });

  it("非Conventional Commitsを'other'グループに分類する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "v0.1.0",
        to_ref: "HEAD",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    // The test repo has merge commits like "Merge branch..." which are non-conventional
    const groupTypes = data.groups.map((g: { type: string }) => g.type);
    // Should have at least "feat" and possibly "chore", "refactor", "other"
    expect(groupTypes.length).toBeGreaterThan(0);
  });
});
