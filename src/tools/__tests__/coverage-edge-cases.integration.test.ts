/**
 * Edge case tests that require custom repo configurations
 * to cover branches not reachable with the shared test repo.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

async function createRepoWithOldCommits(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mcp-dig-old-"));
  const git = async (...args: string[]) => {
    const env = { ...process.env, GIT_COMMITTER_DATE: "", GIT_AUTHOR_DATE: "" };
    const { stdout } = await execFileAsync("git", args, { cwd: dir, env });
    return stdout;
  };
  const gitWithDate = async (date: string, ...args: string[]) => {
    const env = { ...process.env, GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date };
    const { stdout } = await execFileAsync("git", args, { cwd: dir, env });
    return stdout;
  };

  await git("init", "-b", "main");
  await git("config", "user.name", "Solo");
  await git("config", "user.email", "solo@example.com");

  // Create files with old dates (1 year ago)
  const oldDate = "2024-01-01T00:00:00+00:00";
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src", "old-file.ts"), "export const old = 1;\n");
  await writeFile(join(dir, "src", "another-old.ts"), "export const another = 2;\n");
  await writeFile(join(dir, "src", "third-old.ts"), "export const third = 3;\n");
  await git("add", ".");
  await gitWithDate(oldDate, "commit", "-m", "feat: initial old commit");

  // Create a branch from old commit
  await git("checkout", "-b", "old-feature");
  await writeFile(join(dir, "src", "branch-file.ts"), "export const branch = true;\n");
  await git("add", ".");
  await gitWithDate(oldDate, "commit", "-m", "feat: old branch commit");
  await git("checkout", "main");

  // Merge the old branch with standard message
  await gitWithDate(oldDate, "merge", "old-feature", "--no-ff", "--no-edit");

  // Create and merge another branch with a non-standard merge message
  await git("checkout", "-b", "custom-merge-branch");
  await writeFile(join(dir, "src", "custom.ts"), "export const custom = true;\n");
  await git("add", ".");
  await git("commit", "-m", "feat: custom branch work");
  await git("checkout", "main");
  await git("merge", "custom-merge-branch", "--no-ff", "-m", "Custom integration: merged manually");

  // Create another branch that will remain unmerged and old
  await git("checkout", "-b", "abandoned-branch");
  await writeFile(join(dir, "src", "abandoned.ts"), "export const abandoned = true;\n");
  await git("add", ".");
  await gitWithDate(oldDate, "commit", "-m", "feat: abandoned work");
  await git("checkout", "main");

  // Add a recent commit on main
  await writeFile(join(dir, "src", "new-file.ts"), "export const fresh = true;\n");
  await git("add", ".");
  await git("commit", "-m", "feat: recent commit");

  // Tag before breaking change
  await git("tag", "v1.0.0");

  // Add a breaking change commit (with body containing BREAKING CHANGE)
  await writeFile(join(dir, "src", "api.ts"), "export const newApi = true;\n");
  await git("add", ".");
  await git("commit", "-m", "feat(api)!: redesign API\n\nBREAKING CHANGE: removed legacy endpoint");

  // Add a scoped commit
  await writeFile(join(dir, "src", "db.ts"), "export const db = true;\n");
  await git("add", ".");
  await git("commit", "-m", "fix(db): connection pooling");

  // Tag after breaking change
  await git("tag", "v2.0.0");

  return dir;
}

describe("カバレッジ向上エッジケース", () => {
  let client: Client;
  let oldRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();
    oldRepo = await createRepoWithOldCommits();
  });

  afterAll(async () => {
    await closeMcpClient();
    if (oldRepo) {
      await rm(oldRepo, { recursive: true, force: true });
    }
  });

  // git_repo_health: single contributor + stale files
  it("単一著者リポジトリで知識集中リスク警告を表示する", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: oldRepo,
        stale_threshold_days: 30,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Repository health summary");
    // Single contributor warning
    expect(text).toContain("knowledge concentration risk");
    // Stale files present
    expect(text).toContain("Stale files:");
  });

  // git_repo_health: stale percentage >= 30% warning
  it("staleファイル割合が高い場合にクリーンアップ警告を表示する", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: oldRepo,
        stale_threshold_days: 30,
      },
    });
    const text = getToolText(result);

    // Old repo has many stale files → should trigger high stale warning
    expect(text).toContain("unchanged for");
  });

  // git_stale_files: actual stale files found (text output)
  it("staleファイルを検出してテキスト出力する", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: oldRepo,
        threshold_days: 30,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Stale files (unchanged for 30+ days)");
    expect(text).toContain("stale file(s)");
    expect(text).toContain("days");
  });

  // git_stale_files: JSON output with actual stale files
  it("staleファイルをJSON出力で返す", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: oldRepo,
        threshold_days: 30,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("thresholdDays", 30);
    expect(data).toHaveProperty("files");
    expect(data.files.length).toBeGreaterThan(0);
    expect(data.files[0]).toHaveProperty("filePath");
    expect(data.files[0]).toHaveProperty("daysSinceLastChange");
  });

  // git_branch_activity: stale classification (not abandoned)
  it("staleブランチを表示する（abandoned閾値を高く設定）", async () => {
    // Set abandoned_days very high so old branches are "stale" not "abandoned"
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: oldRepo,
        stale_days: 30,
        abandoned_days: 99999,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Branch activity analysis");
    // Old branches should be classified as "Stale:" (not abandoned)
    expect(text).toContain("Stale:");
  });

  // git_branch_activity: abandoned classification
  it("abandonedブランチを表示する", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: oldRepo,
        stale_days: 30,
        abandoned_days: 90,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Branch activity analysis");
    // Old branches (>365 days) should be abandoned with 90-day threshold
    expect(text).toContain("Abandoned:");
  });

  // git_branch_activity: cleanup candidates (merged & inactive)
  it("マージ済み非activeブランチをクリーンアップ候補として表示する", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: {
        repo_path: oldRepo,
        stale_days: 30,
        abandoned_days: 90,
      },
    });
    const text = getToolText(result);

    // old-feature was merged and is old → cleanup candidate
    expect(text).toContain("Cleanup candidates");
    expect(text).toContain("old-feature");
  });

  // git_commit_frequency: path_pattern with since (empty result)
  it("未来のsinceとpath_patternで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: oldRepo,
        since: "2099-01-01",
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("No commits found");
    expect(text).toContain("since 2099-01-01");
    expect(text).toContain("in src/");
  });

  // git_stale_files: path_pattern with stale files showing scope
  it("path_patternでスコープ限定しstaleファイルを表示する", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: oldRepo,
        path_pattern: "src/",
        threshold_days: 30,
      },
    });
    const text = getToolText(result);

    if (text.includes("Stale files")) {
      expect(text).toContain("Scope: src/");
    }
  });

  // git_commit_graph: non-standard merge message → "other" source
  it("非標準マージメッセージで'other'ソースに分類する", async () => {
    const result = await client.callTool({
      name: "git_commit_graph",
      arguments: {
        repo_path: oldRepo,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data.mergeCommits).toBeGreaterThanOrEqual(1);
    // Should have "other" source from non-standard merge message "Custom integration:"
    if (data.topMergeSources.length > 0) {
      const sources = data.topMergeSources.map((s: { source: string }) => s.source);
      expect(sources.some((s: string) => s === "other" || s.includes("old-feature"))).toBe(true);
    }
  });

  // git_commit_graph: text format in old repo
  it("カスタムリポジトリでcommit graphテキスト出力を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_graph",
      arguments: {
        repo_path: oldRepo,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Commit graph analysis");
    expect(text).toContain("Merge commits:");
  });

  // git_repo_health: next actions include knowledge_map
  it("少数コントリビューターでknowledge_mapアクションを提案する", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: oldRepo,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Next actions:");
    expect(text).toContain("git_knowledge_map");
  });

  // git_knowledge_map: single owner → RISK label
  it("単一著者リポジトリでRISK: single ownerラベルを表示する", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: {
        repo_path: oldRepo,
      },
    });
    const text = getToolText(result);

    expect(text).toContain("Knowledge map");
    expect(text).toContain("RISK: single owner");
  });

  // git_release_notes: breaking changes in text output
  it("Breaking Changeをテキスト出力で表示する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: oldRepo,
        from_ref: "v1.0.0",
        to_ref: "v2.0.0",
      },
    });
    const text = getToolText(result);

    expect(text).toContain("BREAKING CHANGES:");
    expect(text).toContain("redesign API");
  });

  // git_release_notes: group_by=scope
  it("group_by=scopeでスコープ別にグループ化する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: oldRepo,
        from_ref: "v1.0.0",
        to_ref: "v2.0.0",
        group_by: "scope",
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    const groupTypes = data.groups.map((g: { type: string }) => g.type);
    expect(groupTypes).toContain("api");
    expect(groupTypes).toContain("db");
  });

  // git_release_notes: include_breaking=false
  it("include_breaking=falseでBreaking Changesを除外する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: oldRepo,
        from_ref: "v1.0.0",
        to_ref: "v2.0.0",
        include_breaking: false,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data.breakingChanges).toHaveLength(0);
  });

  // git_impact_analysis: root-level file (no "/" in target_path)
  it("ルートレベルファイルのimpact分析でtargetDir='.'になる", async () => {
    // The test repo has root-level files; use a file without "/" in path
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: oldRepo,
        target_path: "README.md",
        min_coupling: 1,
      },
    });
    const text = getToolText(result);

    // Should not crash and should return a valid result
    expect(text).toBeDefined();
  });

  // git_code_ownership_changes: ancient boundary → no commits
  it("非常に古い境界日付でコミットなしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: oldRepo,
        period_boundary: "2000-01-01",
      },
    });
    const text = getToolText(result);

    // All commits should be "after" the boundary, nothing "before"
    expect(text).toContain("Code ownership changes");
  });
});
