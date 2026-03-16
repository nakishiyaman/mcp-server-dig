import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

describe("git_tag_analysis (MCP)", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("タグのsemverパターン分布を返す", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Tag analysis");
    expect(text).toContain("semver");
  });

  it("annotated tagを検出する", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    // Test repo has annotated tags (v0.1.0, v0.2.0)
    expect(text).toContain("annotated");
  });

  it("リリース間隔統計を返す", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Release intervals");
  });

  it("patternフィルタが動作する", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
        pattern: "v0.1.*",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("v0.1.0");
    // Only 1 tag → no interval stats
    expect(text).toContain("1 tag(s)");
  });

  it("JSON出力形式が動作する", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    expect(parsed).toHaveProperty("totalTags");
    expect(parsed).toHaveProperty("semverDistribution");
    expect(parsed).toHaveProperty("tagTypes");
    expect(parsed).toHaveProperty("releaseIntervals");
  });

  it("タグがないパターンでメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
        pattern: "nonexistent-*",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No tags found");
  });

  it("タグ命名prefix分布を返す", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Naming prefixes");
    expect(text).toContain("v");
  });

  it("lightweight tagを検出する", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("lightweight");
    // beta-0.1 is a lightweight tag
    expect(text).toContain("beta-0.1");
  });

  it("non-semverタグを検出する", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
      },
    });
    const text = getToolText(result);

    expect(text).toContain("non-semver");
    expect(text).toContain("release-2024Q1");
  });

  it("semver bumpの全カテゴリを検出する", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    // v0.1.0 → patch (initial), v0.2.0 → minor, v0.2.1 → patch, v1.0.0 → major
    expect(parsed.semverDistribution.major).toBeGreaterThanOrEqual(1);
    expect(parsed.semverDistribution.minor).toBeGreaterThanOrEqual(1);
    expect(parsed.semverDistribution.patch).toBeGreaterThanOrEqual(1);
    // v1.1.0-rc.1 → pre-release
    expect(parsed.semverDistribution.preRelease).toBeGreaterThanOrEqual(1);
    // beta-0.1, release-2024Q1, 20240101 → non-semver
    expect(parsed.semverDistribution.nonSemver).toBeGreaterThanOrEqual(1);
  });

  it("prefix無しタグの命名分布を検出する", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const parsed = JSON.parse(text);

    // "20240101" has no alpha prefix → "(none)"
    expect(parsed.namingPrefixes).toHaveProperty("(none)");
    expect(parsed.namingPrefixes).toHaveProperty("v");
  });

  it("存在しないリポジトリでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_tag_analysis",
      arguments: {
        repo_path: "/nonexistent/repo",
      },
    });

    expect(result.isError).toBe(true);
  });
});
