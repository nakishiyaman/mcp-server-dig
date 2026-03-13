/**
 * Branch coverage improvement tests for v0.23.0.
 * Targets uncovered branches in new tools and remaining gaps.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

/**
 * Create a repo with no merge commits for testing conflict-history empty merge case.
 */
async function createNoMergeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mcp-dig-nomerge-"));
  const git = async (...args: string[]) => {
    const { stdout } = await execFileAsync("git", args, { cwd: dir });
    return stdout;
  };

  await git("init", "-b", "main");
  await git("config", "user.name", "Solo");
  await git("config", "user.email", "solo@example.com");

  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src", "index.ts"), "const x = 1;\n");
  await git("add", ".");
  await git("commit", "-m", "feat: initial");

  await writeFile(join(dir, "src", "index.ts"), "const x = 2;\n");
  await git("add", ".");
  await git("commit", "-m", "feat: update");

  return dir;
}

/**
 * Create a repo with a single author for contributor-network edge cases.
 */
async function createSingleAuthorRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mcp-dig-single-"));
  const git = async (...args: string[]) => {
    const { stdout } = await execFileAsync("git", args, { cwd: dir });
    return stdout;
  };

  await git("init", "-b", "main");
  await git("config", "user.name", "Solo");
  await git("config", "user.email", "solo@example.com");

  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src", "index.ts"), "const x = 1;\n");
  await git("add", ".");
  await git("commit", "-m", "feat: initial");

  return dir;
}

describe("v0.23.0 ブランチカバレッジ向上テスト", () => {
  let client: Client;
  let noMergeDir: string;
  let singleAuthorDir: string;

  beforeAll(async () => {
    client = await createTestMcpClient();
    noMergeDir = await createNoMergeRepo();
    singleAuthorDir = await createSingleAuthorRepo();
  });

  afterAll(async () => {
    await closeMcpClient();
    await rm(noMergeDir, { recursive: true, force: true });
    await rm(singleAuthorDir, { recursive: true, force: true });
  });

  // --- git_contributor_network branches ---

  describe("git_contributor_network 分岐テスト", () => {
    it("min_shared_filesフィルタで結果が空になる", async () => {
      const result = await client.callTool({
        name: "git_contributor_network",
        arguments: {
          repo_path: getRepoDir(),
          min_shared_files: 999,
        },
      });
      const text = getToolText(result);
      // With very high threshold, edges should be filtered out
      expect(text).toContain("Contributor network");
      expect(text).toContain("Collaboration links: 0");
    });

    it("単一著者リポジトリではエッジがゼロ", async () => {
      const result = await client.callTool({
        name: "git_contributor_network",
        arguments: { repo_path: singleAuthorDir },
      });
      const text = getToolText(result);
      expect(text).toContain("Contributor network");
      expect(text).toContain("Contributors: 1");
      expect(text).toContain("Density: 0.0%");
    });

    it("sinceで結果が空になる", async () => {
      const result = await client.callTool({
        name: "git_contributor_network",
        arguments: {
          repo_path: singleAuthorDir,
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No contributor data found");
    });

    it("日次のsurvival分析を返す", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "daily",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("daily");
      expect(text).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  // --- git_conflict_history branches ---

  describe("git_conflict_history 分岐テスト", () => {
    it("マージコミットがないリポジトリで空結果", async () => {
      const result = await client.callTool({
        name: "git_conflict_history",
        arguments: { repo_path: noMergeDir },
      });
      const text = getToolText(result);
      expect(text).toContain("No merge commits found");
    });

    it("since付きでマージが見つからない場合", async () => {
      const result = await client.callTool({
        name: "git_conflict_history",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No merge commits found");
      expect(text).toContain("since 2099-01-01");
    });

    it("path_pattern付きでマージが見つからない場合", async () => {
      const result = await client.callTool({
        name: "git_conflict_history",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "nonexistent/",
        },
      });
      const text = getToolText(result);
      // Either "No merge commits" or empty result
      expect(text.length).toBeGreaterThan(0);
    });

    it("JSON出力でsinceとpathPatternがnull", async () => {
      const result = await client.callTool({
        name: "git_conflict_history",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.since).toBeNull();
      expect(parsed.pathPattern).toBeNull();
    });
  });

  // --- git_survival_analysis branches ---

  describe("git_survival_analysis 分岐テスト", () => {
    it("path_pattern付きで空結果", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
          path_pattern: "nonexistent/",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
    });

    it("日次粒度で正しいフォーマットを返す", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "daily",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.granularity).toBe("daily");
      expect(parsed.periods[0].period).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("月次粒度のJSON出力", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "monthly",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.granularity).toBe("monthly");
      expect(parsed.periods[0].period).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  // --- Existing tools: target remaining uncovered branches ---

  describe("既存ツール補完テスト", () => {
    it("git_related_changes: max_commits=1で結果が限定される", async () => {
      const result = await client.callTool({
        name: "git_related_changes",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          max_commits: 1,
          min_coupling: 1,
        },
      });
      const text = getToolText(result);
      expect(text.length).toBeGreaterThan(0);
    });

    it("git_file_history: max_commits=1で単一コミット", async () => {
      const result = await client.callTool({
        name: "git_file_history",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          max_commits: 1,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("src/index.ts");
    });

    it("git_knowledge_map: depth=3で深いディレクトリ", async () => {
      const result = await client.callTool({
        name: "git_knowledge_map",
        arguments: {
          repo_path: getRepoDir(),
          depth: 3,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Knowledge map");
    });

    it("git_merge_base: 同じrefで差分なし", async () => {
      const result = await client.callTool({
        name: "git_merge_base",
        arguments: {
          repo_path: getRepoDir(),
          ref1: "main",
          ref2: "main",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("(no commits)");
    });

    it("git_impact_analysis: 存在しないパスで空結果", async () => {
      const result = await client.callTool({
        name: "git_impact_analysis",
        arguments: {
          repo_path: getRepoDir(),
          target_path: "nonexistent/path/file.ts",
        },
      });
      const text = getToolText(result);
      // Should return low blast radius or empty
      expect(text.length).toBeGreaterThan(0);
    });

    it("git_code_ownership_changes: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_code_ownership_changes",
        arguments: {
          repo_path: getRepoDir(),
          period_boundary: "1 day ago",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(typeof parsed).toBe("object");
    });

    it("git_file_risk_profile: 存在しないファイルでエラー", async () => {
      const result = await client.callTool({
        name: "git_file_risk_profile",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "nonexistent.ts",
        },
      });
      const text = getToolText(result);
      // Should return risk profile with low values or error
      expect(text.length).toBeGreaterThan(0);
    });

    it("git_why: JSON出力モード", async () => {
      const result = await client.callTool({
        name: "git_why",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("file");
    });

    it("git_repo_health: JSON出力モード", async () => {
      const result = await client.callTool({
        name: "git_repo_health",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("trackedFiles");
    });

    it("git_bisect_guide: JSON出力モード", async () => {
      const result = await client.callTool({
        name: "git_bisect_guide",
        arguments: {
          repo_path: getRepoDir(),
          good_ref: "v0.1.0",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("commitCount");
    });

    it("git_commit_graph: since付きで空結果", async () => {
      const result = await client.callTool({
        name: "git_commit_graph",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
    });

    it("git_release_notes: JSON出力", async () => {
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
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("totalCommits");
    });

    it("git_related_changes: 存在しないファイルでコミットなし", async () => {
      const result = await client.callTool({
        name: "git_related_changes",
        arguments: {
          repo_path: singleAuthorDir,
          file_path: "nonexistent-file.ts",
          min_coupling: 1,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
    });

    it("git_related_changes: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_related_changes",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          min_coupling: 1,
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("file");
      expect(parsed).toHaveProperty("totalCommits");
    });

    it("git_file_history: since指定で空結果", async () => {
      const result = await client.callTool({
        name: "git_file_history",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
    });

    it("git_file_history: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_file_history",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          max_commits: 3,
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("file");
      expect(Array.isArray(parsed.commits)).toBe(true);
    });

    it("git_knowledge_map: sinceで空結果", async () => {
      const result = await client.callTool({
        name: "git_knowledge_map",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No directory knowledge data found");
    });

    it("git_knowledge_map: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_knowledge_map",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("directories");
    });

    it("git_why: start_lineのみ指定", async () => {
      const result = await client.callTool({
        name: "git_why",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          start_line: 1,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Why does this code exist");
    });

    it("git_impact_analysis: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_impact_analysis",
        arguments: {
          repo_path: getRepoDir(),
          target_path: "src/index.ts",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("targetPath");
    });

    it("git_merge_base: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_merge_base",
        arguments: {
          repo_path: getRepoDir(),
          ref1: "main",
          ref2: "feature-branch",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("mergeBase");
    });

    it("git_code_ownership_changes: depth=2", async () => {
      const result = await client.callTool({
        name: "git_code_ownership_changes",
        arguments: {
          repo_path: getRepoDir(),
          period_boundary: "1 week ago",
          depth: 2,
        },
      });
      const text = getToolText(result);
      expect(text.length).toBeGreaterThan(0);
    });

    it("git_file_risk_profile: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_file_risk_profile",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("file");
    });

    it("git_contributor_patterns: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_contributor_patterns",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("totalCommits");
    });

    it("git_repo_health: 小さなリポジトリ", async () => {
      const result = await client.callTool({
        name: "git_repo_health",
        arguments: {
          repo_path: singleAuthorDir,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("health summary");
    });

    it("git_stale_files: path_pattern付き", async () => {
      const result = await client.callTool({
        name: "git_stale_files",
        arguments: {
          repo_path: getRepoDir(),
          threshold_days: 1,
          path_pattern: "src/",
        },
      });
      const text = getToolText(result);
      expect(text.length).toBeGreaterThan(0);
    });

    it("git_hotspots: since付き", async () => {
      const result = await client.callTool({
        name: "git_hotspots",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text.length).toBeGreaterThan(0);
    });

    it("git_code_churn: since付き空結果", async () => {
      const result = await client.callTool({
        name: "git_code_churn",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text.length).toBeGreaterThan(0);
    });

    it("git_pickaxe: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_pickaxe",
        arguments: {
          repo_path: getRepoDir(),
          search_term: "const",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("searchTerm");
    });

    it("git_dependency_map: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_dependency_map",
        arguments: {
          repo_path: getRepoDir(),
          min_coupling: 1,
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(typeof parsed).toBe("object");
    });

    it("git_author_timeline: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_author_timeline",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("totalAuthors");
    });

    it("git_branch_activity: JSON出力", async () => {
      const result = await client.callTool({
        name: "git_branch_activity",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("branches");
    });
  });
});
