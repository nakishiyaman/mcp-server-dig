import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseLogOutput, parseBlameOutput, parseDiffStatOutput } from "../../git/parsers.js";
import { analyzeContributors } from "../../analysis/contributors.js";
import { analyzeCoChanges } from "../../analysis/co-changes.js";
import { getRepoDir } from "./helpers.js";

// ─── git_review_prep ─────────────────────────────────────

describe("git_review_prep (end-to-end)", () => {
  it("main...feature-branchのPRレビューブリーフィングを生成する", async () => {
    const repoDir = getRepoDir();
    // Get changed files between main and feature-branch
    const nameOnlyOutput = await execGit(
      ["diff", "--name-only", "main...feature-branch"],
      repoDir,
    );
    const changedFiles = nameOnlyOutput
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    expect(changedFiles).toContain("src/feature.ts");

    // Get commits in the range
    const commitOutput = await execGit(
      [
        "log",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=500",
        "main...feature-branch",
      ],
      repoDir,
    );
    const commits = parseLogOutput(commitOutput);
    expect(commits.length).toBeGreaterThanOrEqual(1);
    const subjects = commits.map((c) => c.subject);
    expect(subjects).toContain("feat: add feature module");

    // Diff stat should show changes
    const diffStatOutput = await execGit(
      ["diff", "--stat", "main...feature-branch"],
      repoDir,
    );
    const diffStat = parseDiffStatOutput(diffStatOutput);
    expect(diffStat.filesChanged).toBeGreaterThanOrEqual(1);
  });

  it("変更がない場合は早期リターンする", async () => {
    // main...main should have no changes
    const nameOnlyOutput = await execGit(
      ["diff", "--name-only", "main...main"],
      getRepoDir(),
    );
    const changedFiles = nameOnlyOutput
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    expect(changedFiles).toHaveLength(0);
  });

  it("不正なrefでエラーを返す", async () => {
    await expect(
      execGit(["rev-parse", "--verify", "nonexistent-ref"], getRepoDir()),
    ).rejects.toThrow();
  });
});

// ─── git_why ─────────────────────────────────────────────

describe("git_why (end-to-end)", () => {
  it("ファイルのblame情報とコンテキストを統合する", async () => {
    const repoDir = getRepoDir();
    // Get blame data
    const blameOutput = await execGit(
      ["blame", "--porcelain", "--", "src/index.ts"],
      repoDir,
    );
    const blocks = parseBlameOutput(blameOutput);

    expect(blocks.length).toBeGreaterThanOrEqual(1);

    // Extract unique commits
    const uniqueHashes = [...new Set(blocks.map((b) => b.commitHash))];
    expect(uniqueHashes.length).toBeGreaterThanOrEqual(1);

    // Each commit should have associated files
    for (const hash of uniqueHashes.slice(0, 3)) {
      const filesOutput = await execGit(
        ["show", "--name-only", "--format=", hash],
        repoDir,
      );
      const filesInCommit = filesOutput
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);
      expect(filesInCommit.length).toBeGreaterThan(0);
    }

    // Contributors and co-changes should return data
    const [contributorData, coChangeData] = await Promise.all([
      analyzeContributors(repoDir, { pathPattern: "src/index.ts" }),
      analyzeCoChanges(repoDir, "src/index.ts", { minCoupling: 1 }),
    ]);

    expect(contributorData.stats.length).toBeGreaterThan(0);
    expect(coChangeData.results.length).toBeGreaterThan(0);
  });

  it("行範囲指定でblameを取得する", async () => {
    const blameOutput = await execGit(
      ["blame", "--porcelain", "-L", "3,4", "--", "src/index.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(blameOutput);

    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].startLine).toBeGreaterThanOrEqual(3);
  });
});
