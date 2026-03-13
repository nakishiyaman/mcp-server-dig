/**
 * Branch coverage tests for v0.24.0.
 * Target: 85% → 88%+ branch coverage.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

// ========================================================================
// git_code_age: classifyAge branches + empty blocks
// ========================================================================
describe("git_code_age — ブランチカバレッジ", () => {
  let client: Client;
  let oldRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create a repo with old commits to cover "> 1 year" bracket
    oldRepo = await mkdtemp(join(tmpdir(), "mcp-dig-old-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: oldRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Tester");
    await g("config", "user.email", "test@test.com");

    // Commit with old date to cover "6-12 months" and "> 1 year" brackets
    await writeFile(join(oldRepo, "old.ts"), "const old = 1;\n");
    await g("add", ".");
    await g(
      "commit",
      "-m",
      "feat: old commit",
      "--date=2023-01-01T00:00:00",
    );

    // Commit with 6 month old date
    await writeFile(join(oldRepo, "mid.ts"), "const mid = 1;\n");
    await g("add", ".");
    await g(
      "commit",
      "-m",
      "feat: mid-age commit",
      "--date=2025-06-01T00:00:00",
    );

    // Recent commit for "< 1 month" bracket
    await writeFile(join(oldRepo, "new.ts"), "const recent = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: recent commit");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (oldRepo) await rm(oldRepo, { recursive: true, force: true });
  });

  it("古いコミットで '> 1 year' ブラケットをカバーする", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: { repo_path: oldRepo, file_path: "old.ts", output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    const labels = parsed.brackets.map((b: { label: string }) => b.label);
    expect(labels).toContain("> 1 year");
  });

  it("6-12ヶ月前のコミットで '6-12 months' ブラケットをカバーする", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: { repo_path: oldRepo, file_path: "mid.ts", output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    const labels = parsed.brackets.map((b: { label: string }) => b.label);
    // mid.ts was committed 2025-06-01, which is ~9 months ago from 2026-03-13
    expect(labels).toContain("6-12 months");
  });

  it("リポジトリ外パスでエラーを返す", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "../../etc/passwd",
      },
    });
    expect(result.isError).toBe(true);
  });
});

// ========================================================================
// git_commit_message_quality: long subjects + path_pattern + author branches
// ========================================================================
describe("git_commit_message_quality — ブランチカバレッジ", () => {
  let client: Client;
  let longMsgRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create a repo with long commit messages to cover longSubject branches
    longMsgRepo = await mkdtemp(join(tmpdir(), "mcp-dig-longmsg-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: longMsgRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Tester");
    await g("config", "user.email", "test@test.com");

    // Create 7 commits with subjects > 72 chars to trigger longSubjects.length >= 5
    for (let i = 0; i < 7; i++) {
      await writeFile(join(longMsgRepo, `file${i}.ts`), `export const x${i} = ${i};\n`);
      await g("add", ".");
      const longMsg = `feat: this is a very long commit message that exceeds the seventy-two character limit for subject lines number ${i}`;
      await g("commit", "-m", longMsg);
    }

    // Add a non-conventional commit
    await writeFile(join(longMsgRepo, "misc.ts"), "export const misc = true;\n");
    await g("add", ".");
    await g("commit", "-m", "Just a plain commit without conventional format");

    // Add a commit with issue reference
    await writeFile(join(longMsgRepo, "issue.ts"), "export const issue = true;\n");
    await g("add", ".");
    await g("commit", "-m", "fix: resolve bug #42");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (longMsgRepo) await rm(longMsgRepo, { recursive: true, force: true });
  });

  it("長いsubjectが5件以上あるときトップ5のみ表示する", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: longMsgRepo, output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    // 7 long subjects but only 5 in the array
    expect(parsed.metrics.longSubjectCount).toBe(7);
    expect(parsed.longSubjects.length).toBe(5);
  });

  it("テキスト出力でlong subjects行が含まれる", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: longMsgRepo },
    });
    const text = getToolText(result);
    expect(text).toContain("Long subjects (top 5):");
    expect(text).toContain("chars):");
    // Subject is >60 chars, so "..." should appear
    expect(text).toContain("...");
  });

  it("issue referenceを検出する", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: longMsgRepo, output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed.metrics.issueReferenceCount).toBeGreaterThan(0);
    expect(parsed.metrics.issueReferenceRate).toBeGreaterThan(0);
  });

  it("path_patternでスコープを絞る", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: getRepoDir(), path_pattern: "src/" },
    });
    const text = getToolText(result);
    expect(text).toContain("Scope: src/");
  });

  it("存在しないauthorで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: getRepoDir(), author: "nonexistent-author-xyz" },
    });
    const text = getToolText(result);
    expect(text).toContain("No commits found");
  });
});

// ========================================================================
// git_knowledge_map: busFactor >= 2 (empty risk label branch)
// ========================================================================
describe("git_knowledge_map — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("バス係数2以上のディレクトリでリスクラベルなし", async () => {
    // Create a custom repo where two authors each have substantial contributions
    const multiRepo = await mkdtemp(join(tmpdir(), "mcp-dig-multi-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: multiRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");

    // Alice makes 10 commits to src/
    await g("config", "user.name", "Alice");
    await g("config", "user.email", "alice@test.com");
    await mkdir(join(multiRepo, "src"), { recursive: true });
    for (let i = 0; i < 10; i++) {
      await writeFile(join(multiRepo, "src", `a${i}.ts`), `export const a${i} = ${i};\n`);
      await g("add", ".");
      await g("commit", "-m", `feat: alice commit ${i}`);
    }

    // Bob makes 10 commits to src/
    await g("config", "user.name", "Bob");
    await g("config", "user.email", "bob@test.com");
    for (let i = 0; i < 10; i++) {
      await writeFile(join(multiRepo, "src", `b${i}.ts`), `export const b${i} = ${i};\n`);
      await g("add", ".");
      await g("commit", "-m", `feat: bob commit ${i}`);
    }

    try {
      const result = await client.callTool({
        name: "git_knowledge_map",
        arguments: { repo_path: multiRepo, depth: 1 },
      });
      const text = getToolText(result);
      // src/ directory should have bus factor 2 and no risk label
      expect(text).toContain("src");
      expect(text).not.toMatch(/src.*\[RISK/);
    } finally {
      await rm(multiRepo, { recursive: true, force: true });
    }
  });
});

// ========================================================================
// git_impact_analysis: directory coupling map branches
// ========================================================================
describe("git_impact_analysis — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("同一ディレクトリの複数ファイルがcoupling mapで集約される", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
        min_coupling: 1,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed.indirectImpact).toBeDefined();
    expect(Array.isArray(parsed.indirectImpact.affectedDirectories)).toBe(true);
  });

  it("JSON出力でblast radius分類を含む", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: getRepoDir(),
        target_path: "src/index.ts",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed.riskSummary).toBeDefined();
    expect(parsed.riskSummary).toHaveProperty("blastRadius");
    expect(["low", "medium", "high"]).toContain(parsed.riskSummary.blastRadius);
  });
});

// ========================================================================
// git_contributor_network: truncation branches (nodes > 20, edges > 20)
// ========================================================================
describe("git_contributor_network — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("min_shared_filesでコラボリンクをフィルタする", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: {
        repo_path: getRepoDir(),
        min_shared_files: 100,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    // With high threshold, fewer edges
    expect(parsed.edges.length).toBe(0);
  });

  it("path_patternで分析範囲を限定する", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_branch_activity: additional branches
// ========================================================================
describe("git_branch_activity — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("include_remote=trueでリモートブランチも含める", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: { repo_path: getRepoDir(), include_remote: true },
    });
    const text = getToolText(result);
    expect(text).toContain("Branch activity");
  });
});

// ========================================================================
// git_repo_health: additional edge branches
// ========================================================================
describe("git_repo_health — ブランチカバレッジ", () => {
  let client: Client;
  let emptyRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create a minimal repo for edge case testing
    emptyRepo = await mkdtemp(join(tmpdir(), "mcp-dig-empty-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: emptyRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Solo");
    await g("config", "user.email", "solo@test.com");
    await writeFile(join(emptyRepo, "readme.md"), "# Hello\n");
    await g("add", ".");
    await g("commit", "-m", "feat: initial");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (emptyRepo) await rm(emptyRepo, { recursive: true, force: true });
  });

  it("最小限のリポジトリで健全性レポートを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: { repo_path: emptyRepo },
    });
    const text = getToolText(result);
    expect(text).toContain("Repository health");
  });

  it("JSON出力でstaleFiles情報を含む", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: { repo_path: getRepoDir(), output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed).toHaveProperty("staleFiles");
    expect(typeof parsed.staleFiles).toBe("number");
  });
});

// ========================================================================
// git_file_risk_profile: additional edge branches
// ========================================================================
describe("git_file_risk_profile — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("sinceパラメータ付きでリスクプロファイルを返す", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        since: "1 year ago",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Risk profile");
  });
});

// ========================================================================
// git_why: edge branches
// ========================================================================
describe("git_why — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("end_lineのみ指定でblameを実行", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        end_line: 3,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Why does this code exist?");
  });
});

// ========================================================================
// git_bisect_guide: edge branches
// ========================================================================
describe("git_bisect_guide — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("file_path付きでbisectガイドを返す", async () => {
    const result = await client.callTool({
      name: "git_bisect_guide",
      arguments: {
        repo_path: getRepoDir(),
        good_ref: "HEAD~5",
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_author_timeline: more branches
// ========================================================================
describe("git_author_timeline — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("path_pattern付きで著者タイムラインを返す", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: { repo_path: getRepoDir(), path_pattern: "src/" },
    });
    const text = getToolText(result);
    expect(text).toContain("Author timeline");
  });
});

// ========================================================================
// git_release_notes: edge branches
// ========================================================================
describe("git_release_notes — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("group_by=scopeでリリースノートを生成する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "HEAD~10",
        group_by: "scope",
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("group_by=noneでリリースノートを生成する", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: {
        repo_path: getRepoDir(),
        from_ref: "HEAD~10",
        group_by: "none",
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_survival_analysis: edge branches
// ========================================================================
describe("git_survival_analysis — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("daily粒度でチャーン分析を返す", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "daily",
        max_commits: 20,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Code churn analysis");
    expect(text).toContain("daily");
  });

  it("monthly粒度でチャーン分析を返す", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "monthly",
        max_commits: 20,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Code churn analysis");
    expect(text).toContain("monthly");
  });

  it("path_pattern付きでフィルタする", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
      arguments: {
        repo_path: getRepoDir(),
        path_pattern: "src/",
        max_commits: 20,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Scope: src/");
  });
});

// ========================================================================
// git_code_ownership_changes: more branch coverage
// ========================================================================
describe("git_code_ownership_changes — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("path_pattern付きで所有権変化を分析する", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "3 months ago",
        path_pattern: "src/",
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_pickaxe: regex mode branch
// ========================================================================
describe("git_pickaxe — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("正規表現モードでpickaxe検索する", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: {
        repo_path: getRepoDir(),
        search_term: "const\\s+\\w+",
        is_regex: true,
        max_commits: 5,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_commit_frequency: edge branches
// ========================================================================
describe("git_commit_frequency — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("monthly粒度でコミット頻度を返す", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: getRepoDir(),
        granularity: "monthly",
        max_commits: 20,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Commit frequency");
  });
});

// ========================================================================
// parsers: additional edge branches
// ========================================================================
describe("git_merge_base — ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力でmerge base情報を返す", async () => {
    const result = await client.callTool({
      name: "git_merge_base",
      arguments: {
        repo_path: getRepoDir(),
        ref1: "main",
        ref2: "feature-branch",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed).toHaveProperty("mergeBase");
    expect(parsed).toHaveProperty("ref1Commits");
    expect(parsed).toHaveProperty("ref2Commits");
  });
});

// ========================================================================
// git_code_age: additional age bracket coverage (1-3 months, 3-6 months)
// ========================================================================
describe("git_code_age — 追加ブラケットカバレッジ", () => {
  let client: Client;
  let bracketRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    bracketRepo = await mkdtemp(join(tmpdir(), "mcp-dig-brackets-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: bracketRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Tester");
    await g("config", "user.email", "test@test.com");

    // Commit with ~60 day old date → "1-3 months"
    await writeFile(join(bracketRepo, "twomonth.ts"), "const x = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: two months ago", "--date=2026-01-12T00:00:00");

    // Commit with ~120 day old date → "3-6 months"
    await writeFile(join(bracketRepo, "fourmonth.ts"), "const y = 2;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: four months ago", "--date=2025-11-13T00:00:00");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (bracketRepo) await rm(bracketRepo, { recursive: true, force: true });
  });

  it("'1-3 months' ブラケットをカバーする", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: { repo_path: bracketRepo, file_path: "twomonth.ts", output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    const labels = parsed.brackets.map((b: { label: string }) => b.label);
    expect(labels).toContain("1-3 months");
  });

  it("'3-6 months' ブラケットをカバーする", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: { repo_path: bracketRepo, file_path: "fourmonth.ts", output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    const labels = parsed.brackets.map((b: { label: string }) => b.label);
    expect(labels).toContain("3-6 months");
  });
});

// ========================================================================
// git_commit_message_quality: additional branch coverage
// ========================================================================
describe("git_commit_message_quality — 追加ブランチカバレッジ", () => {
  let client: Client;
  let shortLongRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create repo with short long subjects (>72 but <=60 after slice)
    shortLongRepo = await mkdtemp(join(tmpdir(), "mcp-dig-shortlong-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: shortLongRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Tester");
    await g("config", "user.email", "test@test.com");

    // This is exactly 73 chars (just above limit of 72), and <=60 chars won't apply since it's 73 chars
    // But for the "..." ternary: subject.length > 60 in the text formatter
    // A commit with subject exactly 73 chars (>72 limit, but since it's 73 chars, subject.slice(0,60) + "..." applies)
    // For subject <=60 chars but >72 chars - impossible. The condition is subject.length > 72 AND subject.slice(0,60)
    // So we need a long subject that's >72 chars → always >60 chars → "..." always applies
    // The NOT "..." branch needs subject.length <= 60 which can never happen since subjects > 72 get in this list
    // Wait - looking at the code more carefully, the ternary is on ls.subject.length > 60
    // Since longSubjects only includes subjects > 72, ls.subject.length is always > 60, so "..." always applies
    // The false branch of that ternary is unreachable. Let me focus on other branches.

    // Add non-conventional commits to cover the "no type distribution" case
    await writeFile(join(shortLongRepo, "a.ts"), "export const a = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "plain commit without conventional format");

    await writeFile(join(shortLongRepo, "b.ts"), "export const b = 2;\n");
    await g("add", ".");
    await g("commit", "-m", "another plain commit");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (shortLongRepo) await rm(shortLongRepo, { recursive: true, force: true });
  });

  it("Conventional Commits 0%のリポジトリを分析する", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: shortLongRepo },
    });
    const text = getToolText(result);
    expect(text).toContain("Conventional Commits: 0/");
    // No type distribution section when 0 conventional commits
    expect(text).not.toContain("Type distribution:");
  });

  it("Conventional Commits 0%のJSON出力", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: shortLongRepo, output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed.metrics.conventionalCommitsRate).toBe(0);
    expect(parsed.metrics.longSubjectCount).toBe(0);
    expect(Object.keys(parsed.metrics.typeDistribution).length).toBe(0);
  });
});

// ========================================================================
// git_repo_health: more uncovered branches
// ========================================================================
describe("git_repo_health — 追加ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("stale_threshold_days付きで健全性レポートを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
        stale_threshold_days: 1,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Repository health");
  });

  it("since付きで健全性レポートを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: getRepoDir(),
        since: "1 year ago",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Repository health");
  });
});

// ========================================================================
// git_why: more uncovered branches
// ========================================================================
describe("git_why — 追加ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("start_line+end_lineの両方指定でblameを実行", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        start_line: 1,
        end_line: 2,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Why does this code exist?");
    expect(text).toContain("L1-2");
  });

  it("max_commits=1で要約行を含む", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        max_commits: 1,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("more commit(s)");
  });
});

// ========================================================================
// git_diff_context: stat_only + file_path combo
// ========================================================================
describe("git_diff_context — 追加ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("stat_only=true + file_pathの組み合わせ", async () => {
    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: getRepoDir(),
        commit: "HEAD",
        compare_to: "HEAD~1",
        stat_only: true,
        file_path: "src/index.ts",
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("context_lines指定", async () => {
    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: getRepoDir(),
        commit: "HEAD",
        compare_to: "HEAD~2",
        context_lines: 5,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_conflict_history: text output with path_pattern + since
// ========================================================================
describe("git_conflict_history — 追加ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("since+path_pattern同時指定で空結果", async () => {
    const result = await client.callTool({
      name: "git_conflict_history",
      arguments: {
        repo_path: getRepoDir(),
        since: "2099-01-01",
        path_pattern: "nonexistent/",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No merge commits found");
  });
});

// ========================================================================
// git_stale_files: JSON output
// ========================================================================
describe("git_stale_files — 追加ブランチカバレッジ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("高閾値で結果なしメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_stale_files",
      arguments: {
        repo_path: getRepoDir(),
        threshold_days: 99999,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No files");
  });
});

// ========================================================================
// git_code_ownership_changes: sort branches + depth parameter
// ========================================================================
describe("git_code_ownership_changes — 追加ブランチ2", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("depth=2でディレクトリ粒度を変更する", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "6 months ago",
        depth: 2,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "6 months ago",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed).toHaveProperty("directories");
    expect(Array.isArray(parsed.directories)).toBe(true);
  });

  it("未来のboundaryで片方のperiodが空", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: getRepoDir(),
        period_boundary: "2099-01-01",
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_file_risk_profile: knowledge/coupling/staleness branches
// ========================================================================
describe("git_file_risk_profile — 追加ブランチ2", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("helpers.tsのリスクプロファイルを返す", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/helpers.ts",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("Risk profile");
  });

  it("JSON出力で5次元リスクを含む", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed).toHaveProperty("file");
    expect(parsed).toHaveProperty("overallRisk");
    expect(parsed).toHaveProperty("dimensions");
    expect(Array.isArray(parsed.dimensions)).toBe(true);
    expect(parsed.dimensions.length).toBe(5);
  });
});

// ========================================================================
// git_impact_analysis: zero co-changes branch
// ========================================================================
describe("git_impact_analysis — 追加ブランチ2", () => {
  let client: Client;
  let isolatedRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create a repo where a file has no co-changes
    isolatedRepo = await mkdtemp(join(tmpdir(), "mcp-dig-isolated-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: isolatedRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Solo");
    await g("config", "user.email", "solo@test.com");
    await writeFile(join(isolatedRepo, "lone.ts"), "export const lone = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: single file");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (isolatedRepo) await rm(isolatedRepo, { recursive: true, force: true });
  });

  it("共変更なしファイルで 'No impact' メッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: isolatedRepo,
        target_path: "lone.ts",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No impact detected");
  });
});

// ========================================================================
// git_repo_health: single contributor + stale warnings
// ========================================================================
describe("git_repo_health — 追加ブランチ2", () => {
  let client: Client;
  let singleAuthorRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    singleAuthorRepo = await mkdtemp(join(tmpdir(), "mcp-dig-single-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: singleAuthorRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Solo");
    await g("config", "user.email", "solo@test.com");
    await mkdir(join(singleAuthorRepo, "src"), { recursive: true });
    await writeFile(join(singleAuthorRepo, "src", "app.ts"), "const app = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: initial", "--date=2024-01-01T00:00:00");
    // Add more files with old dates for stale detection
    for (let i = 0; i < 5; i++) {
      await writeFile(join(singleAuthorRepo, "src", `old${i}.ts`), `export const old${i} = ${i};\n`);
      await g("add", ".");
      await g("commit", "-m", `chore: old file ${i}`, "--date=2024-01-01T00:00:00");
    }
  });

  afterAll(async () => {
    await closeMcpClient();
    if (singleAuthorRepo) await rm(singleAuthorRepo, { recursive: true, force: true });
  });

  it("単一コントリビューターリポジトリで知識集中リスク警告を返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: { repo_path: singleAuthorRepo },
    });
    const text = getToolText(result);
    expect(text).toContain("Repository health");
    // Single contributor warning
    expect(text).toContain("Single contributor");
  });

  it("古いファイルのあるリポジトリでJSON健全性レポートを返す", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: singleAuthorRepo,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed).toHaveProperty("trackedFiles");
    expect(parsed).toHaveProperty("contributors");
    expect(parsed.contributors.length).toBe(1);
  });
});

// ========================================================================
// git_file_history: JSON output
// ========================================================================
describe("git_file_history — 追加ブランチ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_file_history",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(Array.isArray(parsed.commits)).toBe(true);
    expect(parsed.commits.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_commit_show: JSON output
// ========================================================================
describe("git_commit_show — 追加ブランチ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_commit_show",
      arguments: {
        repo_path: getRepoDir(),
        commit: "HEAD",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed).toHaveProperty("hash");
    expect(parsed).toHaveProperty("author");
    expect(parsed).toHaveProperty("body");
  });
});

// ========================================================================
// git_author_timeline: dominant contributor + sole owner branches
// ========================================================================
describe("git_author_timeline — 追加ブランチ", () => {
  let client: Client;
  let dominantRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    dominantRepo = await mkdtemp(join(tmpdir(), "mcp-dig-dominant-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: dominantRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");

    // Alice makes 10 commits (dominant, >= 80%)
    await g("config", "user.name", "Alice");
    await g("config", "user.email", "alice@test.com");
    for (let i = 0; i < 10; i++) {
      await writeFile(join(dominantRepo, `a${i}.ts`), `export const a${i} = ${i};\n`);
      await g("add", ".");
      await g("commit", "-m", `feat: alice ${i}`);
    }

    // Bob makes 1 commit (minority)
    await g("config", "user.name", "Bob");
    await g("config", "user.email", "bob@test.com");
    await writeFile(join(dominantRepo, "b.ts"), "export const b = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: bob");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (dominantRepo) await rm(dominantRepo, { recursive: true, force: true });
  });

  it("支配的コントリビューター警告を含む", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: { repo_path: dominantRepo },
    });
    const text = getToolText(result);
    expect(text).toContain("Dominant contributor");
    expect(text).toContain("Alice");
  });

  it("JSON出力を返す", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: { repo_path: dominantRepo, output_format: "json" },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed.totalAuthors).toBe(2);
    expect(parsed.authors.length).toBe(2);
  });
});

// ========================================================================
// git_contributor_network: edge branches (empty results)
// ========================================================================
describe("git_contributor_network — 追加ブランチ2", () => {
  let client: Client;
  let singleRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    singleRepo = await mkdtemp(join(tmpdir(), "mcp-dig-single2-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: singleRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Solo");
    await g("config", "user.email", "solo@test.com");
    await writeFile(join(singleRepo, "a.ts"), "export const a = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: initial");
  });

  afterAll(async () => {
    await closeMcpClient();
    if (singleRepo) await rm(singleRepo, { recursive: true, force: true });
  });

  it("単一著者リポジトリでネットワーク情報を返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: { repo_path: singleRepo },
    });
    const text = getToolText(result);
    // With single contributor, no collaboration edges
    expect(text).toContain("Contributor");
  });
});

// ========================================================================
// git_code_churn: JSON output
// ========================================================================
describe("git_code_churn — 追加ブランチ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_code_churn",
      arguments: {
        repo_path: getRepoDir(),
        max_commits: 20,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(Array.isArray(parsed.files)).toBe(true);
    expect(parsed.files.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_hotspots: JSON output
// ========================================================================
describe("git_hotspots — 追加ブランチ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_hotspots",
      arguments: {
        repo_path: getRepoDir(),
        max_commits: 20,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(Array.isArray(parsed.hotspots)).toBe(true);
    expect(parsed.hotspots.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// git_related_changes: JSON output
// ========================================================================
describe("git_related_changes — 追加ブランチ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_related_changes",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(parsed).toHaveProperty("file");
    expect(Array.isArray(parsed.relatedFiles)).toBe(true);
  });
});

// ========================================================================
// git_search_commits: JSON output
// ========================================================================
describe("git_search_commits — 追加ブランチ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_search_commits",
      arguments: {
        repo_path: getRepoDir(),
        query: "feat",
        max_commits: 5,
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(Array.isArray(parsed.commits)).toBe(true);
  });
});

// ========================================================================
// git_contributor_patterns: JSON output
// ========================================================================
describe("git_contributor_patterns — 追加ブランチ", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("JSON出力で構造化データを返す", async () => {
    const result = await client.callTool({
      name: "git_contributor_patterns",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const parsed = JSON.parse(getToolText(result));
    expect(Array.isArray(parsed.contributors)).toBe(true);
    expect(parsed.contributors.length).toBeGreaterThan(0);
  });
});
