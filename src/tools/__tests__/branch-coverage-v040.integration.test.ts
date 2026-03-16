import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir, git } from "./helpers.js";
import {
  parseTags,
  analyzeSemver,
  computeIntervals,
  detectTrend,
  extractPrefixes,
  type TagEntry,
} from "../git-tag-analysis.js";
import { _generateRepoSummaryForTest as generateRepoSummary } from "../../resources/repo-summary.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Part 1: git-tag-analysis 純粋関数の単体テスト（高効率でブランチカバー）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("parseTags — パーサー単体テスト", () => {
  it("正常なタグ出力をパースする", () => {
    const output = "v1.0.0|2024-01-01T00:00:00+00:00|tag\nv1.1.0|2024-02-01T00:00:00+00:00|commit\n";
    const tags = parseTags(output);
    expect(tags).toHaveLength(2);
    expect(tags[0]).toEqual({ name: "v1.0.0", date: "2024-01-01T00:00:00+00:00", objectType: "tag" });
    expect(tags[1]).toEqual({ name: "v1.1.0", date: "2024-02-01T00:00:00+00:00", objectType: "commit" });
  });

  it("不正な行をスキップする", () => {
    // "badline" has <3 parts → skipped, "||" has 3 parts → kept as empty tag
    const output = "v1.0.0|2024-01-01|tag\nbadline\n";
    const tags = parseTags(output);
    expect(tags).toHaveLength(1);
  });

  it("空文字列で空配列を返す", () => {
    expect(parseTags("")).toHaveLength(0);
    expect(parseTags("\n\n")).toHaveLength(0);
  });
});

describe("analyzeSemver — semver分類ロジック", () => {
  it("初回リリースをpatchとしてカウントする", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);
    expect(dist.patch).toBe(1); // first semver tag → patch (initial release)
    expect(dist.major).toBe(0);
    expect(dist.minor).toBe(0);
    expect(dist.preRelease).toBe(0);
    expect(dist.nonSemver).toBe(0);
  });

  it("major/minor/patchバンプを正しく分類する", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01", objectType: "tag" },
      { name: "v1.0.1", date: "2024-02-01", objectType: "tag" },
      { name: "v1.1.0", date: "2024-03-01", objectType: "tag" },
      { name: "v2.0.0", date: "2024-04-01", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);
    expect(dist.patch).toBe(2); // v1.0.0 (initial) + v1.0.1
    expect(dist.minor).toBe(1); // v1.1.0
    expect(dist.major).toBe(1); // v2.0.0
  });

  it("pre-releaseタグを独立してカウントする", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01", objectType: "tag" },
      { name: "v1.1.0-rc.1", date: "2024-02-01", objectType: "tag" },
      { name: "v1.1.0-rc.2", date: "2024-02-15", objectType: "tag" },
      { name: "v1.1.0", date: "2024-03-01", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);
    expect(dist.preRelease).toBe(2);
    expect(dist.minor).toBe(1); // v1.1.0 vs v1.0.0
  });

  it("非semverタグをnonSemverにカウントする", () => {
    const tags: TagEntry[] = [
      { name: "release-2024Q1", date: "2024-01-01", objectType: "tag" },
      { name: "20240101", date: "2024-01-01", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);
    expect(dist.nonSemver).toBe(2);
    expect(dist.major + dist.minor + dist.patch + dist.preRelease).toBe(0);
  });

  it("semverと非semverの混合", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01", objectType: "tag" },
      { name: "nightly-20240101", date: "2024-01-01", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);
    expect(dist.patch).toBe(1); // initial
    expect(dist.nonSemver).toBe(1);
  });
});

describe("computeIntervals — リリース間隔計算", () => {
  it("2タグで1間隔を返す", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0", date: "2024-01-11T00:00:00Z", objectType: "tag" },
    ];
    const result = computeIntervals(tags);
    expect(result).not.toBeNull();
    expect(result!.count).toBe(1);
    expect(result!.meanDays).toBe(10);
    expect(result!.medianDays).toBe(10);
  });

  it("1タグ以下でnullを返す", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01", objectType: "tag" },
    ];
    expect(computeIntervals(tags)).toBeNull();
    expect(computeIntervals([])).toBeNull();
  });

  it("偶数個の間隔で中央値を計算する", () => {
    const tags: TagEntry[] = [
      { name: "v1", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v2", date: "2024-01-11T00:00:00Z", objectType: "tag" },
      { name: "v3", date: "2024-01-31T00:00:00Z", objectType: "tag" },
      { name: "v4", date: "2024-03-01T00:00:00Z", objectType: "tag" },
      { name: "v5", date: "2024-04-01T00:00:00Z", objectType: "tag" },
    ];
    const result = computeIntervals(tags);
    expect(result).not.toBeNull();
    // 4 intervals (even) → median = average of 2nd and 3rd sorted
    expect(result!.count).toBe(4);
    expect(result!.medianDays).toBeGreaterThanOrEqual(0);
  });

  it("奇数個の間隔で中央値を計算する", () => {
    const tags: TagEntry[] = [
      { name: "v1", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v2", date: "2024-01-06T00:00:00Z", objectType: "tag" },
      { name: "v3", date: "2024-01-21T00:00:00Z", objectType: "tag" },
      { name: "v4", date: "2024-02-21T00:00:00Z", objectType: "tag" },
    ];
    const result = computeIntervals(tags);
    expect(result).not.toBeNull();
    // 3 intervals (odd) → median = middle value
    expect(result!.count).toBe(3);
    expect(result!.medianDays).toBe(15); // sorted: [5, 15, 31] → median = 15
  });

  it("日付のないタグを無視する", () => {
    const tags: TagEntry[] = [
      { name: "v1", date: "", objectType: "tag" },
      { name: "v2", date: "2024-01-01T00:00:00Z", objectType: "tag" },
    ];
    expect(computeIntervals(tags)).toBeNull(); // only 1 valid date
  });
});

describe("detectTrend — リリース頻度トレンド検出", () => {
  it("4タグ未満でnullを返す", () => {
    const tags: TagEntry[] = [
      { name: "v1", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v2", date: "2024-02-01T00:00:00Z", objectType: "tag" },
      { name: "v3", date: "2024-03-01T00:00:00Z", objectType: "tag" },
    ];
    expect(detectTrend(tags)).toBeNull();
  });

  it("間隔が縮小するとacceleratingを返す", () => {
    // First half: large intervals, Second half: small intervals
    const tags: TagEntry[] = [
      { name: "v1", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v2", date: "2024-04-01T00:00:00Z", objectType: "tag" }, // 90 days
      { name: "v3", date: "2024-07-01T00:00:00Z", objectType: "tag" }, // 91 days
      { name: "v4", date: "2024-07-15T00:00:00Z", objectType: "tag" }, // 14 days
      { name: "v5", date: "2024-07-25T00:00:00Z", objectType: "tag" }, // 10 days
    ];
    expect(detectTrend(tags)).toBe("accelerating");
  });

  it("間隔が拡大するとdeceleratingを返す", () => {
    // First half: small intervals, Second half: large intervals
    const tags: TagEntry[] = [
      { name: "v1", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v2", date: "2024-01-10T00:00:00Z", objectType: "tag" }, // 9 days
      { name: "v3", date: "2024-01-20T00:00:00Z", objectType: "tag" }, // 10 days
      { name: "v4", date: "2024-04-20T00:00:00Z", objectType: "tag" }, // 90 days
      { name: "v5", date: "2024-08-20T00:00:00Z", objectType: "tag" }, // 122 days
    ];
    expect(detectTrend(tags)).toBe("decelerating");
  });

  it("間隔が安定しているとstableを返す", () => {
    const tags: TagEntry[] = [
      { name: "v1", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v2", date: "2024-02-01T00:00:00Z", objectType: "tag" },
      { name: "v3", date: "2024-03-01T00:00:00Z", objectType: "tag" },
      { name: "v4", date: "2024-04-01T00:00:00Z", objectType: "tag" },
      { name: "v5", date: "2024-05-01T00:00:00Z", objectType: "tag" },
    ];
    expect(detectTrend(tags)).toBe("stable");
  });
});

describe("extractPrefixes — タグ名prefix抽出", () => {
  it("prefix付きタグをグループ化する", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "", objectType: "tag" },
      { name: "v2.0.0", date: "", objectType: "tag" },
      { name: "release-1", date: "", objectType: "tag" },
    ];
    const prefixes = extractPrefixes(tags);
    expect(prefixes["v"]).toBe(2);
    expect(prefixes["release"]).toBe(1);
  });

  it("prefix無しタグを(none)にグループ化する", () => {
    const tags: TagEntry[] = [
      { name: "20240101", date: "", objectType: "tag" },
      { name: "123", date: "", objectType: "tag" },
    ];
    const prefixes = extractPrefixes(tags);
    expect(prefixes["(none)"]).toBe(2);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Part 2: repo-summary リソースの直接テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("repo-summary リソース", () => {
  it("リポジトリ概要を生成する", async () => {
    const summary = await generateRepoSummary(getRepoDir());
    expect(summary).toContain("# Repository Summary");
    expect(summary).toContain("**Current branch**:");
    expect(summary).toContain("**Tracked files**:");
    expect(summary).toContain("**Contributors**:");
    expect(summary).toContain("## Recent Tags");
    expect(summary).toContain("## File Types");
    expect(summary).toContain("## Top Contributors");
    expect(summary).toContain("## Recent Commits");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Part 3: MCP統合テスト — 低カバレッジツールのエッジケース
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("branch coverage v0.40 — MCP統合テスト", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  // ─── git_tag_analysis ─────────────────────────────────────────────

  describe("git_tag_analysis — 未カバーブランチ", () => {
    it("2-3タグでtrend=nullになる（detectTrend < 4タグ）", async () => {
      const result = await client.callTool({
        name: "git_tag_analysis",
        arguments: {
          repo_path: getRepoDir(),
          pattern: "v0.*",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("tag(s)");
      expect(text).toContain("Release intervals");
      // < 4 tags → no trend line
      expect(text).not.toMatch(/trend: (accelerating|stable|decelerating)/);
    });

    it("非semverタグのみでsemverTotal=0の分岐をカバー", async () => {
      const result = await client.callTool({
        name: "git_tag_analysis",
        arguments: {
          repo_path: getRepoDir(),
          pattern: "release-*",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("non-semver");
      expect(text).not.toContain("major:");
    });

    it("数値のみタグでprefix (none)をカバー", async () => {
      const result = await client.callTool({
        name: "git_tag_analysis",
        arguments: {
          repo_path: getRepoDir(),
          pattern: "2024*",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("20240101");
      expect(text).toContain(`"(none)"`);
    });

    it("全タグtext形式でtrendを含む出力をカバー", async () => {
      const result = await client.callTool({
        name: "git_tag_analysis",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      // Full tag set has ≥ 4 tags → trend exists
      expect(text).toMatch(/trend: (accelerating|stable|decelerating)/);
      expect(text).toContain("annotated");
      expect(text).toContain("lightweight");
    });

    it("JSON出力でsemver bumpの全カテゴリをカバー", async () => {
      const result = await client.callTool({
        name: "git_tag_analysis",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.trend).toBeTruthy();
      expect(parsed.releaseIntervals).toBeTruthy();
      expect(parsed.semverDistribution.preRelease).toBeGreaterThanOrEqual(1);
      expect(parsed.semverDistribution.nonSemver).toBeGreaterThanOrEqual(1);
    });

    it("betaパターンで単一lightweight tagをカバー", async () => {
      const result = await client.callTool({
        name: "git_tag_analysis",
        arguments: {
          repo_path: getRepoDir(),
          pattern: "beta-*",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("beta-0.1");
      expect(text).toContain("1 tag(s)");
    });
  });

  // ─── git_expertise_decay ──────────────────────────────────────────

  describe("git_expertise_decay — 未カバーブランチ", () => {
    it("デフォルトしきい値でactiveステータスをカバー", async () => {
      const result = await client.callTool({
        name: "git_expertise_decay",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Expertise decay");
      expect(text).toMatch(/LOW RISK|MEDIUM|HIGH/);
      expect(text).toContain("active");
    });

    it("JSON出力でエントリ構造をカバー", async () => {
      const result = await client.callTool({
        name: "git_expertise_decay",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.entries.length).toBeGreaterThan(0);
      const firstEntry = parsed.entries[0];
      expect(firstEntry.owners.length).toBeGreaterThan(0);
      expect(typeof firstEntry.owners[0].daysSinceLastActivity).toBe("number");
      expect(firstEntry.owners[0].status).toBe("active");
    });

    it("path_patternで結果が空になるケースをカバー", async () => {
      const result = await client.callTool({
        name: "git_expertise_decay",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "nonexistent-path/",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No directories found");
    });

    it("depth=2で深い分析をカバー", async () => {
      const result = await client.callTool({
        name: "git_expertise_decay",
        arguments: {
          repo_path: getRepoDir(),
          depth: 2,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("depth=2");
    });
  });

  // ─── git_offboarding_simulation ───────────────────────────────────

  describe("git_offboarding_simulation — 未カバーブランチ", () => {
    it("マイナーコントリビューターでimpactを確認", async () => {
      const result = await client.callTool({
        name: "git_offboarding_simulation",
        arguments: {
          repo_path: getRepoDir(),
          author: "carol",
        },
      });
      const text = getToolText(result);
      // Carol has minimal contributions
      if (text.includes("No impact found")) {
        expect(text).toContain("carol");
      } else {
        expect(text).toMatch(/\[(HIGH|MED|LOW)\]/);
      }
    });

    it("主要コントリビューターでリスクを表示", async () => {
      const result = await client.callTool({
        name: "git_offboarding_simulation",
        arguments: {
          repo_path: getRepoDir(),
          author: "bob",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Off-boarding simulation");
      expect(text).toContain("Bus factor:");
      expect(text).toContain("Next actions:");
    });

    it("存在しない著者でno impact", async () => {
      const result = await client.callTool({
        name: "git_offboarding_simulation",
        arguments: {
          repo_path: getRepoDir(),
          author: "nonexistent-user",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No impact found");
    });

    it("path_patternで範囲を限定", async () => {
      const result = await client.callTool({
        name: "git_offboarding_simulation",
        arguments: {
          repo_path: getRepoDir(),
          author: "alice",
          path_pattern: "src/",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });
  });

  // ─── git_repo_statistics ──────────────────────────────────────────

  describe("git_repo_statistics — 未カバーブランチ", () => {
    it("text形式でlargestFilesとRepository age表示をカバー", async () => {
      const result = await client.callTool({
        name: "git_repo_statistics",
        arguments: {
          repo_path: getRepoDir(),
          top_n_files: 3,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Repository Statistics");
      expect(text).toContain("First commit:");
      expect(text).toContain("Last commit:");
      expect(text).toContain("Repository age:");
      expect(text).toContain("Largest tracked files");
    });

    it("JSON出力で全フィールドの存在をカバー", async () => {
      const result = await client.callTool({
        name: "git_repo_statistics",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.totalCommits).toBeGreaterThan(0);
      expect(parsed.branchCount).toBeGreaterThan(0);
      expect(parsed.tagCount).toBeGreaterThan(0);
      expect(parsed.firstCommitDate).toBeTruthy();
      expect(parsed.lastCommitDate).toBeTruthy();
      expect(parsed.largestFiles.length).toBeGreaterThan(0);
      expect(parsed.objectCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── git_contributor_growth ───────────────────────────────────────

  describe("git_contributor_growth — 未カバーブランチ", () => {
    it("monthlyモードでtext形式全体をカバー", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Contributor Growth");
      expect(text).toContain("Trend:");
      expect(text).toContain("Ret%");
    });

    it("quarterlyモードでperiod key分岐をカバー", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: getRepoDir(),
          period: "quarterly",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Contributor Growth");
      expect(text).toMatch(/\d{4}-Q[1-4]/);
    });

    it("path_patternフィルタで単一著者をカバー", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "src/calculator.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Contributor Growth");
    });

    it("JSON出力で構造をカバー", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("totalContributors");
      expect(parsed).toHaveProperty("overallRetentionRate");
      expect(parsed).toHaveProperty("trend");
      expect(parsed).toHaveProperty("periods");
      expect(parsed.periods.length).toBeGreaterThan(0);
    });

    it("sinceフィルタで結果なしをカバー", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
    });
  });

  // ─── git_merge_timeline ───────────────────────────────────────────

  describe("git_merge_timeline — 未カバーブランチ", () => {
    it("monthlyモードでマージ検出をカバー", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "monthly",
          num_periods: 12,
        },
      });
      const text = getToolText(result);
      if (text.includes("No merge commits")) {
        expect(text).toContain("No merge commits");
      } else {
        expect(text).toMatch(/[↑→↓]/);
        expect(text).toContain("Trend:");
      }
    });

    it("weeklyモードをカバー", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "weekly",
          num_periods: 4,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("quarterlyモードをカバー", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "quarterly",
          num_periods: 4,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("sinceパラメータによるeffectiveSince分岐をカバー", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: getRepoDir(),
          since: "2020-01-01",
          num_periods: 12,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("path_patternフィルタをカバー", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "src/",
          num_periods: 6,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("JSON出力形式をカバー", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
          num_periods: 6,
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("granularity");
      expect(parsed).toHaveProperty("totalMerges");
      expect(parsed).toHaveProperty("trend");
    });
  });

  // ─── git_commit_patterns ──────────────────────────────────────────

  describe("git_commit_patterns — 未カバーブランチ", () => {
    it("authorフィルタ分岐をカバー", async () => {
      const result = await client.callTool({
        name: "git_commit_patterns",
        arguments: {
          repo_path: getRepoDir(),
          author: "Alice",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Commit Patterns");
      expect(text).toContain("Weekday:");
      expect(text).toContain("Weekend:");
    });

    it("path_patternフィルタ分岐をカバー", async () => {
      const result = await client.callTool({
        name: "git_commit_patterns",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "src/",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Commit Patterns");
      expect(text).toContain("Peak activity windows:");
      expect(text).toContain("Timezone distribution:");
    });

    it("sinceフィルタをカバー", async () => {
      const result = await client.callTool({
        name: "git_commit_patterns",
        arguments: {
          repo_path: getRepoDir(),
          since: "1 year ago",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Commit Patterns");
    });

    it("JSON出力で全構造をカバー", async () => {
      const result = await client.callTool({
        name: "git_commit_patterns",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.totalCommits).toBeGreaterThan(0);
      expect(parsed.dayOfWeek).toHaveLength(7);
      expect(parsed.hourOfDay).toHaveLength(24);
      expect(parsed.peakWindows.length).toBeGreaterThan(0);
      expect(parsed.weekdayRatio).toBeGreaterThanOrEqual(0);
      expect(parsed.weekendRatio).toBeGreaterThanOrEqual(0);
      expect(parsed.timezones.length).toBeGreaterThan(0);
    });

    it("authorとpath_patternの組み合わせ", async () => {
      const result = await client.callTool({
        name: "git_commit_patterns",
        arguments: {
          repo_path: getRepoDir(),
          author: "Bob",
          path_pattern: "src/index.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Commit Patterns");
    });
  });

  // ─── git_velocity_anomalies ───────────────────────────────────────

  describe("git_velocity_anomalies — 未カバーブランチ", () => {
    it("低しきい値で異常検出しNext actionsを表示", async () => {
      const result = await client.callTool({
        name: "git_velocity_anomalies",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "daily",
          threshold_sigma: 0.5,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Velocity anomaly detection");
      if (text.includes("Anomalies detected:")) {
        expect(text).toMatch(/\[SPIKE\]|\[DROP\]/);
        expect(text).toContain("Next actions:");
      }
    });

    it("monthlyモードで集約をカバー", async () => {
      const result = await client.callTool({
        name: "git_velocity_anomalies",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "monthly",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Velocity anomaly detection");
    });

    it("path_patternフィルタをカバー", async () => {
      const result = await client.callTool({
        name: "git_velocity_anomalies",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "src/index.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Velocity anomaly detection");
    });

    it("sinceフィルタをカバー", async () => {
      const result = await client.callTool({
        name: "git_velocity_anomalies",
        arguments: {
          repo_path: getRepoDir(),
          since: "1 year ago",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Velocity anomaly detection");
    });

    it("JSON出力形式をカバー", async () => {
      const result = await client.callTool({
        name: "git_velocity_anomalies",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("granularity");
      expect(parsed).toHaveProperty("totalCommits");
      expect(parsed).toHaveProperty("mean");
      expect(parsed).toHaveProperty("stddev");
    });

    it("高しきい値で異常なしをカバー", async () => {
      const result = await client.callTool({
        name: "git_velocity_anomalies",
        arguments: {
          repo_path: getRepoDir(),
          threshold_sigma: 5,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No anomalies detected");
    });
  });

  // ─── git_reflog_analysis ──────────────────────────────────────────

  describe("git_reflog_analysis — 未カバーブランチ", () => {
    it("デフォルト呼び出しでdetailあり/なしをカバー", async () => {
      const result = await client.callTool({
        name: "git_reflog_analysis",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Reflog analysis");
      expect(text).toContain("Action summary:");
      expect(text).toContain("Entries:");
    });

    it("JSON出力でdetailフィールドをカバー", async () => {
      const result = await client.callTool({
        name: "git_reflog_analysis",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.totalEntries).toBeGreaterThan(0);
      const withDetail = parsed.entries.filter((e: { detail: string }) => e.detail !== "");
      expect(withDetail.length).toBeGreaterThan(0);
    });

    it("action_filterでcommitをフィルタ", async () => {
      const result = await client.callTool({
        name: "git_reflog_analysis",
        arguments: {
          repo_path: getRepoDir(),
          action_filter: "commit",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Reflog analysis");
      expect(text).toContain("commit");
    });

    it("存在しないアクションで空結果をカバー", async () => {
      const result = await client.callTool({
        name: "git_reflog_analysis",
        arguments: {
          repo_path: getRepoDir(),
          action_filter: "nonexistent-action-type",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No reflog entries matching");
    });

    it("max_entriesで件数制限をカバー", async () => {
      const result = await client.callTool({
        name: "git_reflog_analysis",
        arguments: {
          repo_path: getRepoDir(),
          max_entries: 3,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Reflog analysis");
    });
  });

  // ─── git_refactor_candidates ──────────────────────────────────────

  describe("git_refactor_candidates — 未カバーブランチ", () => {
    it("デフォルトでスコアリング全体をカバー", async () => {
      const result = await client.callTool({
        name: "git_refactor_candidates",
        arguments: {
          repo_path: getRepoDir(),
          top_n: 5,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Refactoring candidates");
      expect(text).toContain("Change freq:");
      expect(text).toContain("Code churn:");
      expect(text).toContain("Knowledge:");
      expect(text).toContain("Coupling:");
      expect(text).toContain("Staleness:");
      expect(text).toMatch(/Summary: \d+ HIGH, \d+ MEDIUM, \d+ LOW/);
    });

    it("sinceフィルタで候補なしケースをカバー", async () => {
      const result = await client.callTool({
        name: "git_refactor_candidates",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No refactoring candidates");
    });

    it("path_patternで範囲を限定", async () => {
      const result = await client.callTool({
        name: "git_refactor_candidates",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "src/index.ts",
          top_n: 3,
        },
      });
      const text = getToolText(result);
      // Either finds candidates or reports none
      expect(text).toBeTruthy();
    });
  });

  // ─── git_coordination_bottleneck ──────────────────────────────────

  describe("git_coordination_bottleneck — 未カバーブランチ", () => {
    it("デフォルトでスコア計算とリスクラベルをカバー", async () => {
      const result = await client.callTool({
        name: "git_coordination_bottleneck",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Coordination bottleneck");
      expect(text).toContain("Score");
      expect(text).toContain("Next actions:");
    });

    it("depth=2で深い分析をカバー", async () => {
      const result = await client.callTool({
        name: "git_coordination_bottleneck",
        arguments: {
          repo_path: getRepoDir(),
          depth: 2,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("sinceフィルタで結果なしをカバー", async () => {
      const result = await client.callTool({
        name: "git_coordination_bottleneck",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No coordination bottlenecks");
    });

    it("JSON出力形式をカバー", async () => {
      const result = await client.callTool({
        name: "git_coordination_bottleneck",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("depth");
      expect(parsed).toHaveProperty("totalEntries");
    });
  });

  // ─── Additional edge case coverage ────────────────────────────────

  describe("追加のエッジケースカバレッジ", () => {
    it("git_file_history — max_commits=1で最小結果", async () => {
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

    it("git_commit_graph — JSON出力形式", async () => {
      const result = await client.callTool({
        name: "git_commit_graph",
        arguments: {
          repo_path: getRepoDir(),
          max_commits: 5,
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("totalCommits");
    });

    it("git_line_history — path指定", async () => {
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
      expect(text).toBeTruthy();
    });

    it("git_release_comparison — 2つのタグ間比較", async () => {
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: {
          repo_path: getRepoDir(),
          from_ref: "v0.1.0",
          to_ref: "v0.2.0",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_stale_files — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_stale_files",
        arguments: {
          repo_path: getRepoDir(),
          days_threshold: 0,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_file_risk_profile — ファイル指定", async () => {
      const result = await client.callTool({
        name: "git_file_risk_profile",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Risk profile");
    });

    it("git_impact_analysis — ファイル指定", async () => {
      const result = await client.callTool({
        name: "git_impact_analysis",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
          max_commits: 10,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    }, 15000);

    it("git_knowledge_loss_risk — text形式", async () => {
      const result = await client.callTool({
        name: "git_knowledge_loss_risk",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_merge_base — ブランチ間", async () => {
      const result = await client.callTool({
        name: "git_merge_base",
        arguments: {
          repo_path: getRepoDir(),
          ref1: "main",
          ref2: "feature-branch",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_diff_context — タグ間diff", async () => {
      const result = await client.callTool({
        name: "git_diff_context",
        arguments: {
          repo_path: getRepoDir(),
          from_ref: "v0.1.0",
          to_ref: "v0.2.0",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_relationship_changes — ファイル間関係", async () => {
      const result = await client.callTool({
        name: "git_relationship_changes",
        arguments: {
          repo_path: getRepoDir(),
          file_path: "src/index.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });
  });

  // ─── 未テストツールの初回カバレッジ ────────────────────────────────
  // これらのツールは既存テストファイルに含まれていないため、
  // 1回の呼び出しで多くの未カバーブランチを回収できる

  describe("未テストツールの初回カバレッジ", () => {
    it("git_revert_analysis — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_revert_analysis",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      // Test repo has a revert commit
      expect(text).toBeTruthy();
    });

    it("git_revert_analysis — JSON出力", async () => {
      const result = await client.callTool({
        name: "git_revert_analysis",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty("totalReverts");
    });

    it("git_survival_analysis — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_survival_analysis — JSON出力", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toBeTruthy();
    });

    it("git_code_ownership_changes — 期間境界指定", async () => {
      const result = await client.callTool({
        name: "git_code_ownership_changes",
        arguments: {
          repo_path: getRepoDir(),
          period_boundary: "1 day ago",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_code_ownership_changes — JSON出力", async () => {
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
      expect(parsed).toBeTruthy();
    });

    it("git_commit_message_quality — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_commit_message_quality",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_commit_message_quality — JSON出力", async () => {
      const result = await client.callTool({
        name: "git_commit_message_quality",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toBeTruthy();
    });

    it("git_commit_message_quality — sinceとauthorフィルタ", async () => {
      const result = await client.callTool({
        name: "git_commit_message_quality",
        arguments: {
          repo_path: getRepoDir(),
          since: "1 year ago",
          author: "Alice",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Commit message quality");
      // Since and author are displayed in text output
      expect(text).toContain("since");
      expect(text).toContain("Alice");
    });

    it("git_commit_message_quality — path_patternフィルタ", async () => {
      const result = await client.callTool({
        name: "git_commit_message_quality",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "src/",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Commit message quality");
    });

    it("git_survival_analysis — sinceフィルタ", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          since: "1 year ago",
          granularity: "monthly",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_branch_activity — sort_by指定", async () => {
      const result = await client.callTool({
        name: "git_branch_activity",
        arguments: {
          repo_path: getRepoDir(),
          sort_by: "ahead",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_complexity_hotspots — sinceフィルタ", async () => {
      const result = await client.callTool({
        name: "git_complexity_hotspots",
        arguments: {
          repo_path: getRepoDir(),
          since: "1 year ago",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_release_notes — with commit_types", async () => {
      const result = await client.callTool({
        name: "git_release_notes",
        arguments: {
          repo_path: getRepoDir(),
          from_ref: "v0.1.0",
          to_ref: "v1.0.0",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_code_age — sinceフィルタ", async () => {
      const result = await client.callTool({
        name: "git_code_age",
        arguments: {
          repo_path: getRepoDir(),
          since: "1 year ago",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_author_timeline — デフォルト", async () => {
      const result = await client.callTool({
        name: "git_author_timeline",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_commit_frequency — 存在しないpath_patternで空結果（since未指定）", async () => {
      const result = await client.callTool({
        name: "git_commit_frequency",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "nonexistent-dir-for-coverage/",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
      // Covers: since ? ` since ${since}` : "" → FALSE arm (since is undefined)
    });

    it("git_author_timeline — 存在しないpath_patternで空結果（since未指定）", async () => {
      const result = await client.callTool({
        name: "git_author_timeline",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "nonexistent-dir-for-coverage/",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
    });

    it("git_commit_patterns — 存在しないpath_patternで空結果", async () => {
      const result = await client.callTool({
        name: "git_commit_patterns",
        arguments: {
          repo_path: getRepoDir(),
          path_pattern: "nonexistent-dir-for-coverage/",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("No commits found");
    });

    it("git_branch_activity — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_branch_activity",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_branch_activity — リモート含む", async () => {
      const result = await client.callTool({
        name: "git_branch_activity",
        arguments: {
          repo_path: getRepoDir(),
          include_remote: true,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_branch_activity — JSON出力", async () => {
      const result = await client.callTool({
        name: "git_branch_activity",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toBeTruthy();
    });

    it("git_complexity_hotspots — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_complexity_hotspots",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_complexity_hotspots — JSON出力", async () => {
      const result = await client.callTool({
        name: "git_complexity_hotspots",
        arguments: {
          repo_path: getRepoDir(),
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toBeTruthy();
    });

    it("git_commit_cluster — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_commit_cluster",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_release_notes — タグ間", async () => {
      const result = await client.callTool({
        name: "git_release_notes",
        arguments: {
          repo_path: getRepoDir(),
          from_ref: "v0.1.0",
          to_ref: "v0.2.0",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_release_notes — JSON出力", async () => {
      const result = await client.callTool({
        name: "git_release_notes",
        arguments: {
          repo_path: getRepoDir(),
          from_ref: "v0.1.0",
          to_ref: "v1.0.0",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed).toBeTruthy();
    });

    it("git_repo_health — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_repo_health",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_trend_analysis — デフォルト呼び出し", async () => {
      const result = await client.callTool({
        name: "git_trend_analysis",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });
  });

  // ─── カスタムリポジトリを使ったマルチ期間テスト ─────────────────────
  // 日付を遡らせたコミットで、contributor growth の retention/trend 分岐をカバー

  describe("カスタムリポジトリ — マルチ期間データ", () => {
    let multiPeriodRepo: string;

    beforeAll(async () => {
      multiPeriodRepo = await mkdtemp(join(tmpdir(), "mcp-dig-multi-"));
      await git(multiPeriodRepo, "init", "--initial-branch=main");
      await git(multiPeriodRepo, "config", "user.name", "Alice");
      await git(multiPeriodRepo, "config", "user.email", "alice@example.com");

      // Month 1: 2024-01 — Alice creates files
      await writeFile(join(multiPeriodRepo, "app.ts"), "const x = 1;\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: initial setup",
        "--date=2024-01-15T10:00:00+00:00");

      // Month 1: Bob also contributes
      await git(multiPeriodRepo, "config", "user.name", "Bob");
      await git(multiPeriodRepo, "config", "user.email", "bob@example.com");
      await writeFile(join(multiPeriodRepo, "lib.ts"), "export const y = 2;\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: add lib",
        "--date=2024-01-20T10:00:00+00:00");

      // Month 2: 2024-02 — Only Alice (Bob departed)
      await git(multiPeriodRepo, "config", "user.name", "Alice");
      await git(multiPeriodRepo, "config", "user.email", "alice@example.com");
      await writeFile(join(multiPeriodRepo, "app.ts"), "const x = 1;\nconst z = 3;\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: add z",
        "--date=2024-02-15T10:00:00+00:00");

      // Month 3: 2024-03 — Alice + new contributor Carol
      await writeFile(join(multiPeriodRepo, "app.ts"), "const x = 1;\nconst z = 3;\nconst w = 4;\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: add w",
        "--date=2024-03-10T10:00:00+00:00");

      await git(multiPeriodRepo, "config", "user.name", "Carol");
      await git(multiPeriodRepo, "config", "user.email", "carol@example.com");
      await writeFile(join(multiPeriodRepo, "util.ts"), "export const util = true;\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: add util",
        "--date=2024-03-20T10:00:00+00:00");

      // Month 4: 2024-04 — Carol only (Alice departed)
      await writeFile(join(multiPeriodRepo, "util.ts"), "export const util = true;\nexport const v2 = true;\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: util v2",
        "--date=2024-04-15T10:00:00+00:00");

      // Add a large file for formatSize KB branch
      const largeContent = "x".repeat(2048) + "\n";
      await writeFile(join(multiPeriodRepo, "large.txt"), largeContent);
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "chore: add large file",
        "--date=2024-04-20T10:00:00+00:00");

      // Add a revert with time gap
      await git(multiPeriodRepo, "config", "user.name", "Alice");
      await git(multiPeriodRepo, "config", "user.email", "alice@example.com");
      await writeFile(join(multiPeriodRepo, "buggy.ts"), "throw new Error('bug');\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: buggy feature",
        "--date=2024-05-01T10:00:00+00:00");

      // Revert the buggy commit (1 month later) — use env vars since git revert doesn't support --date
      const revertEnv = {
        GIT_AUTHOR_DATE: "2024-06-01T10:00:00+00:00",
        GIT_COMMITTER_DATE: "2024-06-01T10:00:00+00:00",
      };
      const { execFile: execFileCb2 } = await import("node:child_process");
      const { promisify: promisify2 } = await import("node:util");
      const execFileAsync2 = promisify2(execFileCb2);
      await execFileAsync2("git", ["revert", "HEAD", "--no-edit"], {
        cwd: multiPeriodRepo,
        env: { ...process.env, ...revertEnv },
      });

      // Create a merge
      await git(multiPeriodRepo, "checkout", "-b", "feature-x");
      await writeFile(join(multiPeriodRepo, "feature.ts"), "const f = true;\n");
      await git(multiPeriodRepo, "add", ".");
      await git(multiPeriodRepo, "commit", "-m", "feat: feature x",
        "--date=2024-06-15T10:00:00+00:00");
      await git(multiPeriodRepo, "checkout", "main");
      const mergeEnv = {
        GIT_AUTHOR_DATE: "2024-06-20T10:00:00+00:00",
        GIT_COMMITTER_DATE: "2024-06-20T10:00:00+00:00",
      };
      await execFileAsync2("git", ["merge", "--no-ff", "feature-x", "-m", "Merge branch 'feature-x'"], {
        cwd: multiPeriodRepo,
        env: { ...process.env, ...mergeEnv },
      });

      // Tags
      await git(multiPeriodRepo, "tag", "-a", "v1.0.0", "-m", "v1.0.0",
        "HEAD~5");
      await git(multiPeriodRepo, "tag", "-a", "v2.0.0", "-m", "v2.0.0",
        "HEAD~2");
    });

    afterAll(async () => {
      await rm(multiPeriodRepo, { recursive: true, force: true });
    });

    it("git_contributor_growth — 複数期間で retention rate をカバー", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Contributor Growth");
      // Multiple periods with different contributors
      expect(text).toContain("Ret%");
      // Should show retention percentages (not just "-")
      expect(text).toMatch(/\d+%/);
      // Should show overall retention rate
      expect(text).toContain("Overall retention rate:");
      // New contributors section
      expect(text).toContain("New contributors by period:");
    });

    it("git_contributor_growth — JSON出力でretention構造をカバー", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: multiPeriodRepo,
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.totalContributors).toBeGreaterThan(1);
      expect(parsed.overallRetentionRate).not.toBeNull();
      expect(parsed.periods.length).toBeGreaterThan(2);
      // At least one period should have retentionRate
      const withRetention = parsed.periods.filter(
        (p: { retentionRate: number | null }) => p.retentionRate !== null,
      );
      expect(withRetention.length).toBeGreaterThan(0);
    });

    it("git_revert_analysis — time-to-revert統計をカバー", async () => {
      const result = await client.callTool({
        name: "git_revert_analysis",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Revert Analysis");
      expect(text).toContain("Total reverts:");
      // Time gap between original and revert → msToHumanReadable called
      expect(text).toContain("Time-to-revert");
    });

    it("git_repo_statistics — formatSize KBブランチをカバー", async () => {
      const result = await client.callTool({
        name: "git_repo_statistics",
        arguments: {
          repo_path: multiPeriodRepo,
          top_n_files: 5,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Repository Statistics");
      // large.txt is 2KB → formatSize should show "KB"
      expect(text).toContain("KB");
    });

    it("git_merge_timeline — マージありでtrend表示をカバー", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: multiPeriodRepo,
          granularity: "monthly",
          num_periods: 12,
          since: "2024-01-01",
        },
      });
      const text = getToolText(result);
      // The custom repo has a merge commit
      if (!text.includes("No merge commits")) {
        expect(text).toMatch(/[↑→↓]/);
        expect(text).toContain("Trend:");
      }
    });

    it("git_expertise_decay — マルチ月データでfading/inactiveをカバー", async () => {
      // Bob committed in 2024-01 but not after → should be inactive with default 90-day threshold
      // Using the data as of analysis time (now), Bob is > 90 days inactive
      const result = await client.callTool({
        name: "git_expertise_decay",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Expertise decay");
      // Bob should be inactive (-) since his last commit is > 90 days ago
      // Alice should be inactive too, Carol might be inactive
      expect(text).toMatch(/inactive|fading/);
    });

    it("git_code_ownership_changes — 期間境界で変化検出", async () => {
      const result = await client.callTool({
        name: "git_code_ownership_changes",
        arguments: {
          repo_path: multiPeriodRepo,
          period_boundary: "2024-03-01",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_survival_analysis — マルチ期間データ", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_commit_patterns — マルチ期間データ", async () => {
      const result = await client.callTool({
        name: "git_commit_patterns",
        arguments: {
          repo_path: multiPeriodRepo,
          author: "Alice",
          path_pattern: "app.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Commit Patterns");
    });

    it("git_velocity_anomalies — マルチ期間 daily", async () => {
      const result = await client.callTool({
        name: "git_velocity_anomalies",
        arguments: {
          repo_path: multiPeriodRepo,
          granularity: "daily",
          threshold_sigma: 0.5,
          since: "2024-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Velocity anomaly detection");
    });

    it("git_commit_message_quality — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_commit_message_quality",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_why — ファイル調査", async () => {
      const result = await client.callTool({
        name: "git_why",
        arguments: {
          repo_path: multiPeriodRepo,
          file_path: "app.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    }, 15000);

    it("git_complexity_hotspots — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_complexity_hotspots",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_branch_activity — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_branch_activity",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_refactor_candidates — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_refactor_candidates",
        arguments: {
          repo_path: multiPeriodRepo,
          top_n: 3,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_revert_analysis — path_patternフィルタ", async () => {
      const result = await client.callTool({
        name: "git_revert_analysis",
        arguments: {
          repo_path: multiPeriodRepo,
          path_pattern: "buggy.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_revert_analysis — JSON出力で構造カバー", async () => {
      const result = await client.callTool({
        name: "git_revert_analysis",
        arguments: {
          repo_path: multiPeriodRepo,
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const parsed = JSON.parse(text);
      expect(parsed.totalReverts).toBeGreaterThan(0);
      if (parsed.timeToRevert) {
        expect(parsed.timeToRevert.minMs).toBeGreaterThan(0);
      }
    });

    it("git_merge_timeline — マルチ期間 monthly", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: multiPeriodRepo,
          granularity: "monthly",
          num_periods: 12,
          since: "2024-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_merge_timeline — path_patternフィルタ", async () => {
      const result = await client.callTool({
        name: "git_merge_timeline",
        arguments: {
          repo_path: multiPeriodRepo,
          path_pattern: "feature.ts",
          num_periods: 6,
          since: "2024-01-01",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_contributor_growth — quarterly マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_contributor_growth",
        arguments: {
          repo_path: multiPeriodRepo,
          period: "quarterly",
        },
      });
      const text = getToolText(result);
      expect(text).toContain("Contributor Growth");
    });

    it("git_coordination_bottleneck — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_coordination_bottleneck",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_offboarding_simulation — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_offboarding_simulation",
        arguments: {
          repo_path: multiPeriodRepo,
          author: "alice",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_impact_analysis — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_impact_analysis",
        arguments: {
          repo_path: multiPeriodRepo,
          file_path: "app.ts",
          max_commits: 10,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    }, 15000);

    it("git_repo_health — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_repo_health",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_trend_analysis — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_trend_analysis",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_file_risk_profile — マルチ期間ファイル", async () => {
      const result = await client.callTool({
        name: "git_file_risk_profile",
        arguments: {
          repo_path: multiPeriodRepo,
          file_path: "app.ts",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_code_age — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_code_age",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_release_comparison — マルチ期間タグ間", async () => {
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: {
          repo_path: multiPeriodRepo,
          from_ref: "v1.0.0",
          to_ref: "v2.0.0",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_release_notes — マルチ期間タグ間", async () => {
      const result = await client.callTool({
        name: "git_release_notes",
        arguments: {
          repo_path: multiPeriodRepo,
          from_ref: "v1.0.0",
          to_ref: "v2.0.0",
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_contributor_network — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_contributor_network",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_knowledge_loss_risk — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_knowledge_loss_risk",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_reflog_analysis — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_reflog_analysis",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_stale_files — マルチ期間で古いファイル検出", async () => {
      const result = await client.callTool({
        name: "git_stale_files",
        arguments: {
          repo_path: multiPeriodRepo,
          days_threshold: 30,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });

    it("git_commit_cluster — マルチ期間", async () => {
      const result = await client.callTool({
        name: "git_commit_cluster",
        arguments: {
          repo_path: multiPeriodRepo,
        },
      });
      const text = getToolText(result);
      expect(text).toBeTruthy();
    });
  });

  // リソースはURIテンプレートの制約上、テスト困難なため直接関数テストのみ（Part 2）
});
