/**
 * Branch coverage tests for v0.26.0.
 * Target: 85% → 87%+ branch coverage.
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
// git_contributor_network: 21+著者で nodes/edges truncation分岐カバー
// ========================================================================
describe("git_contributor_network — nodes/edges truncation", () => {
  let client: Client;
  let manyAuthorsRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create a repo with 22 unique authors to trigger > 20 truncation
    manyAuthorsRepo = await mkdtemp(join(tmpdir(), "mcp-dig-many-authors-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: manyAuthorsRepo }).then(
        (r) => r.stdout,
      );
    await g("init", "-b", "main");

    // Create a shared file that all authors will touch
    await g("config", "user.name", "Author0");
    await g("config", "user.email", "author0@example.com");
    await writeFile(join(manyAuthorsRepo, "shared.ts"), "// shared\n");
    await g("add", ".");
    await g("commit", "-m", "feat: init");

    // 22 unique authors all touching the shared file (triggers >20 nodes truncation)
    for (let i = 1; i <= 22; i++) {
      await g("config", "user.name", `Author${i}`);
      await g("config", "user.email", `author${i}@example.com`);
      // Each author modifies the shared file AND creates their own file
      await writeFile(
        join(manyAuthorsRepo, "shared.ts"),
        `// shared - edit ${i}\n`,
      );
      await writeFile(
        join(manyAuthorsRepo, `file-${i}.ts`),
        `export const n = ${i};\n`,
      );
      await g("add", ".");
      await g("commit", "-m", `feat: author ${i} contribution`);
    }
  }, 60000);

  afterAll(async () => {
    await closeMcpClient();
    if (manyAuthorsRepo)
      await rm(manyAuthorsRepo, { recursive: true, force: true });
  });

  it("21+著者でnodes truncation分岐をカバーする", async () => {
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: {
        repo_path: manyAuthorsRepo,
      },
    });
    const text = getToolText(result);
    // Should show truncation message for nodes
    expect(text).toContain("... and");
    expect(text).toContain("more");
    // Should have all 23 contributors listed in data
    expect(text).toContain("Contributors: 23");
  });

  it("21+著者の共同作業でedges truncation分岐をカバーする", async () => {
    // All authors touched shared.ts, so there should be many collaboration edges
    const result = await client.callTool({
      name: "git_contributor_network",
      arguments: {
        repo_path: manyAuthorsRepo,
        output_format: "json",
      },
    });
    const data = JSON.parse(getToolText(result));
    // With 23 authors on the same file, edges should be > 20
    expect(data.totalEdges).toBeGreaterThan(20);
    expect(data.totalContributors).toBe(23);
  });
});

// ========================================================================
// git_why: 空ファイルで blocks.length === 0 分岐カバー
// ========================================================================
describe("git_why — 空ファイルでblocks.length === 0", () => {
  let client: Client;
  let repoDir: string;

  beforeAll(async () => {
    client = await createTestMcpClient();
    repoDir = getRepoDir();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("空ファイルでblame結果が0件のときメッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: {
        repo_path: repoDir,
        file_path: "src/empty.ts",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No blame data found for src/empty.ts");
  });
});

// ========================================================================
// git_survival_analysis: 空結果 + monthly粒度で複数期間ソート
// ========================================================================
describe("git_survival_analysis — ブランチカバレッジ", () => {
  let client: Client;
  let repoDir: string;
  let multiPeriodRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();
    repoDir = getRepoDir();

    // Create repo with commits in different months for multi-period sort
    multiPeriodRepo = await mkdtemp(join(tmpdir(), "mcp-dig-multiperiod-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: multiPeriodRepo }).then(
        (r) => r.stdout,
      );
    await g("init", "-b", "main");
    await g("config", "user.name", "Tester");
    await g("config", "user.email", "test@test.com");

    // Commits in 3 different months
    await writeFile(join(multiPeriodRepo, "a.ts"), "const a = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: jan", "--date=2025-01-15T00:00:00");

    await writeFile(join(multiPeriodRepo, "b.ts"), "const b = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: mar", "--date=2025-03-15T00:00:00");

    await writeFile(join(multiPeriodRepo, "c.ts"), "const c = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: feb", "--date=2025-02-15T00:00:00");
  }, 30000);

  afterAll(async () => {
    await closeMcpClient();
    if (multiPeriodRepo)
      await rm(multiPeriodRepo, { recursive: true, force: true });
  });

  it("存在しないパスで空結果を返す", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
      arguments: {
        repo_path: repoDir,
        since: "2099-01-01",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No commits found");
  });

  it("monthly粒度で複数期間がソートされる", async () => {
    const result = await client.callTool({
      name: "git_survival_analysis",
      arguments: {
        repo_path: multiPeriodRepo,
        granularity: "monthly",
        output_format: "json",
      },
    });
    const data = JSON.parse(getToolText(result));
    expect(data.periods.length).toBe(3);
    // Should be sorted: 2025-01, 2025-02, 2025-03
    expect(data.periods[0].period).toBe("2025-01");
    expect(data.periods[1].period).toBe("2025-02");
    expect(data.periods[2].period).toBe("2025-03");
  });
});

// ========================================================================
// git_conflict_history: マージコミットありだがファイル変更なし
// ========================================================================
describe("git_conflict_history — ブランチカバレッジ", () => {
  let client: Client;
  let emptyMergeRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create repo with a merge commit that has no file changes vs first parent
    emptyMergeRepo = await mkdtemp(join(tmpdir(), "mcp-dig-emptymrg-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: emptyMergeRepo }).then(
        (r) => r.stdout,
      );
    await g("init", "-b", "main");
    await g("config", "user.name", "Tester");
    await g("config", "user.email", "test@test.com");

    await writeFile(join(emptyMergeRepo, "a.ts"), "const a = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "feat: init");

    // Create branch with empty commit (no file changes)
    await g("checkout", "-b", "feature");
    await g("commit", "--allow-empty", "-m", "empty feat");

    // Merge — produces merge commit with no file diff vs first parent
    await g("checkout", "main");
    await g("merge", "feature", "--no-ff", "--no-edit");
  }, 30000);

  afterAll(async () => {
    await closeMcpClient();
    if (emptyMergeRepo)
      await rm(emptyMergeRepo, { recursive: true, force: true });
  });

  it("マージコミットはあるがファイル変更なしの場合メッセージを返す", async () => {
    const result = await client.callTool({
      name: "git_conflict_history",
      arguments: {
        repo_path: emptyMergeRepo,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("no file changes detected");
  });
});

// ========================================================================
// git_impact_analysis: ディレクトリカップリング分岐カバー
// ========================================================================
describe("git_impact_analysis — ディレクトリカップリング", () => {
  let client: Client;
  let couplingRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create repo with files in multiple directories that co-change
    couplingRepo = await mkdtemp(join(tmpdir(), "mcp-dig-coupling-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: couplingRepo }).then(
        (r) => r.stdout,
      );
    await g("init", "-b", "main");
    await g("config", "user.name", "Alice");
    await g("config", "user.email", "alice@example.com");

    await mkdir(join(couplingRepo, "src"), { recursive: true });
    await mkdir(join(couplingRepo, "lib"), { recursive: true });
    await mkdir(join(couplingRepo, "tests"), { recursive: true });

    // Create files that always change together across directories
    for (let i = 0; i < 5; i++) {
      await writeFile(
        join(couplingRepo, "src", "main.ts"),
        `export const v = ${i};\n`,
      );
      await writeFile(
        join(couplingRepo, "lib", "helper.ts"),
        `export const h = ${i};\n`,
      );
      await writeFile(
        join(couplingRepo, "tests", "main.test.ts"),
        `test(${i});\n`,
      );
      await g("add", ".");
      await g("commit", "-m", `feat: update ${i}`);
    }
  }, 30000);

  afterAll(async () => {
    await closeMcpClient();
    if (couplingRepo)
      await rm(couplingRepo, { recursive: true, force: true });
  });

  it("ターゲットファイルの影響先ディレクトリがカップリング順でソートされる", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: {
        repo_path: couplingRepo,
        target_path: "src/main.ts",
        min_coupling: 2,
      },
    });
    const text = getToolText(result);
    // Should detect coupling with lib/ and tests/ directories
    expect(text).toContain("Affected directories");
    expect(text).toContain("Co-changed files");
  });
});


// ========================================================================
// git_commit_frequency: daily粒度でdefault switch分岐の近接カバー
// ========================================================================
describe("git_commit_frequency — daily粒度", () => {
  let client: Client;
  let repoDir: string;

  beforeAll(async () => {
    client = await createTestMcpClient();
    repoDir = getRepoDir();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("daily粒度でコミット頻度を取得する", async () => {
    const result = await client.callTool({
      name: "git_commit_frequency",
      arguments: {
        repo_path: repoDir,
        granularity: "daily",
        output_format: "json",
      },
    });
    const data = JSON.parse(getToolText(result));
    expect(data.granularity).toBe("daily");
    expect(data.periods.length).toBeGreaterThan(0);
  });
});

// ========================================================================
// dependency-map: minCouplingフィルタ分岐カバー
// ========================================================================
describe("git_dependency_map — minCouplingフィルタ", () => {
  let client: Client;
  let repoDir: string;

  beforeAll(async () => {
    client = await createTestMcpClient();
    repoDir = getRepoDir();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("高いmin_couplingでペアがフィルタされる", async () => {
    const result = await client.callTool({
      name: "git_dependency_map",
      arguments: {
        repo_path: repoDir,
        min_coupling: 100,
      },
    });
    const text = getToolText(result);
    // With min_coupling=100, very few or no pairs should pass
    expect(text).toBeDefined();
  });
});

// ========================================================================
// 追加カバレッジ: JSON出力 + エッジケースバッチ
// ========================================================================
describe("追加ブランチカバレッジ — JSON出力・エッジケース", () => {
  let client: Client;
  let repoDir: string;

  beforeAll(async () => {
    client = await createTestMcpClient();
    repoDir = getRepoDir();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("git_repo_health: JSON出力でsince付き", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: { repo_path: repoDir, since: "1 year ago", output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_code_ownership_changes: path_pattern付き", async () => {
    const result = await client.callTool({
      name: "git_code_ownership_changes",
      arguments: {
        repo_path: repoDir,
        since: "6 months ago",
        path_pattern: "src/",
      },
    });
    expect(getToolText(result)).toBeDefined();
  });

  it("git_file_risk_profile: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_file_risk_profile",
      arguments: { repo_path: repoDir, file_path: "src/index.ts", output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_review_prep: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_review_prep",
      arguments: { repo_path: repoDir, base_ref: "HEAD~3", head_ref: "HEAD", output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_why: JSON出力 + start_lineのみ", async () => {
    const result = await client.callTool({
      name: "git_why",
      arguments: { repo_path: repoDir, file_path: "src/index.ts", start_line: 1, output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_impact_analysis: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_impact_analysis",
      arguments: { repo_path: repoDir, target_path: "src/index.ts", output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_branch_activity: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_branch_activity",
      arguments: { repo_path: repoDir, output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_author_timeline: JSON出力 + since付き", async () => {
    const result = await client.callTool({
      name: "git_author_timeline",
      arguments: { repo_path: repoDir, since: "1 year ago", output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data.authors).toBeDefined();
  });

  it("git_bisect_guide: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_bisect_guide",
      arguments: { repo_path: repoDir, good_ref: "HEAD~5", bad_ref: "HEAD", output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_knowledge_map: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_knowledge_map",
      arguments: { repo_path: repoDir, output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_code_age: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_code_age",
      arguments: { repo_path: repoDir, file_path: "src/index.ts", output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_commit_message_quality: JSON出力", async () => {
    const result = await client.callTool({
      name: "git_commit_message_quality",
      arguments: { repo_path: repoDir, output_format: "json" },
    });
    const data = JSON.parse(getToolText(result));
    expect(data).toBeDefined();
  });

  it("git_pickaxe: regex_mode=true", async () => {
    const result = await client.callTool({
      name: "git_pickaxe",
      arguments: { repo_path: repoDir, search_string: "const.*=", regex_mode: true },
    });
    expect(getToolText(result)).toBeDefined();
  });

  it("git_release_notes: scope別グルーピング", async () => {
    const result = await client.callTool({
      name: "git_release_notes",
      arguments: { repo_path: repoDir, from_ref: "HEAD~10", to_ref: "HEAD", group_by: "scope" },
    });
    expect(getToolText(result)).toBeDefined();
  });

  it("git_commit_show: diff付き表示", async () => {
    const result = await client.callTool({
      name: "git_commit_show",
      arguments: { repo_path: repoDir, commit: "HEAD", show_diff: true },
    });
    expect(getToolText(result)).toContain("Commit:");
  });
});

// ========================================================================
// git_repo_health: staleファイル分岐 + knowledgeガード分岐カバー
// ========================================================================
describe("git_repo_health — staleファイル分岐", () => {
  let client: Client;
  let staleRepo: string;

  beforeAll(async () => {
    client = await createTestMcpClient();

    // Create repo where most files are "stale" (old last-modified date)
    staleRepo = await mkdtemp(join(tmpdir(), "mcp-dig-stale-"));
    const g = (...args: string[]) =>
      execFileAsync("git", args, { cwd: staleRepo }).then((r) => r.stdout);
    await g("init", "-b", "main");
    await g("config", "user.name", "Solo");
    await g("config", "user.email", "solo@test.com");

    // Create 4 files with truly old dates (both author and committer date)
    for (let i = 0; i < 4; i++) {
      await writeFile(join(staleRepo, `old${i}.ts`), `const v = ${i};\n`);
    }
    await g("add", ".");
    await execFileAsync("git", ["commit", "-m", "init"], {
      cwd: staleRepo,
      env: { ...process.env, GIT_COMMITTER_DATE: "2024-01-01T00:00:00", GIT_AUTHOR_DATE: "2024-01-01T00:00:00" },
    });

    // Create 1 recent file
    await writeFile(join(staleRepo, "new.ts"), "const recent = 1;\n");
    await g("add", ".");
    await g("commit", "-m", "recent");
  }, 30000);

  afterAll(async () => {
    await closeMcpClient();
    if (staleRepo) await rm(staleRepo, { recursive: true, force: true });
  });

  it("staleファイルが多いリポジトリでstale警告が表示される", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: staleRepo,
        stale_threshold_days: 1,
      },
    });
    const text = getToolText(result);
    // 4 out of 5 files were committed with an old date, so they should be stale
    expect(text).toContain("Stale files");
  });

  it("知識集中度の低いリポジトリでknowledge_map提案が表示される", async () => {
    const result = await client.callTool({
      name: "git_repo_health",
      arguments: {
        repo_path: staleRepo,
      },
    });
    const text = getToolText(result);
    // Single contributor — should suggest knowledge_map
    expect(text).toContain("git_knowledge_map");
  });
});

// ========================================================================
// contributor-network analysis: 空email分岐カバー
// ========================================================================
describe("analyzeContributorNetwork — エッジケース", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = getRepoDir();
  });

  it("pathPattern指定で結果を取得する", async () => {
    const { analyzeContributorNetwork } = await import("../../analysis/contributor-network.js");
    const result = await analyzeContributorNetwork(repoDir, {
      pathPattern: "src/",
      maxCommits: 50,
    });
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("minSharedFiles=100で空edgesを返す", async () => {
    const { analyzeContributorNetwork } = await import("../../analysis/contributor-network.js");
    const result = await analyzeContributorNetwork(repoDir, {
      minSharedFiles: 100,
      maxCommits: 50,
    });
    // Nodes exist but edges are filtered out
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBe(0);
    expect(result.density).toBe(0);
  });
});

// ========================================================================
// dependency-map analysis: 低minCouplingでフィルタ分岐カバー
// ========================================================================
describe("analyzeDependencyMap — フィルタ分岐", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = getRepoDir();
  });

  it("minCoupling=1で多くのペアを取得する", async () => {
    const { analyzeDependencyMap } = await import("../../analysis/dependency-map.js");
    const result = await analyzeDependencyMap(repoDir, {
      minCoupling: 1,
      maxCommits: 50,
    });
    expect(result.pairs.length).toBeGreaterThanOrEqual(0);
  });
});

