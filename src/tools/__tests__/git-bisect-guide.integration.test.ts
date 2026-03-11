import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { getRepoDir } from "./helpers.js";

describe("git_bisect_guide (end-to-end)", () => {
  it("範囲内のコミット数を取得する", async () => {
    const repoDir = getRepoDir();

    // Get first and last commit
    const firstCommit = (
      await execGit(["rev-list", "--max-parents=0", "HEAD"], repoDir)
    ).trim();

    const countOutput = await execGit(
      ["rev-list", "--count", `${firstCommit}..HEAD`],
      repoDir,
    );
    const count = parseInt(countOutput.trim(), 10);
    expect(count).toBeGreaterThan(0);
  });

  it("範囲内のコミット一覧を取得する", async () => {
    const repoDir = getRepoDir();

    const firstCommit = (
      await execGit(["rev-list", "--max-parents=0", "HEAD"], repoDir)
    ).trim();

    const logOutput = await execGit(
      ["log", "--format=%H|%an|%ae|%aI|%s", `${firstCommit}..HEAD`],
      repoDir,
    );
    const lines = logOutput
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("ファイル指定で絞り込める", async () => {
    const repoDir = getRepoDir();

    const firstCommit = (
      await execGit(["rev-list", "--max-parents=0", "HEAD"], repoDir)
    ).trim();

    const logOutput = await execGit(
      [
        "log",
        "--format=%H|%an|%ae|%aI|%s",
        `${firstCommit}..HEAD`,
        "--",
        "src/index.ts",
      ],
      repoDir,
    );
    const lines = logOutput
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("範囲内のホットスポットを取得する", async () => {
    const repoDir = getRepoDir();

    const firstCommit = (
      await execGit(["rev-list", "--max-parents=0", "HEAD"], repoDir)
    ).trim();

    const output = await execGit(
      ["log", "--format=", "--name-only", `${firstCommit}..HEAD`],
      repoDir,
    );
    const lines = output
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("タグ名をgood_refとして使える", async () => {
    const repoDir = getRepoDir();

    const countOutput = await execGit(
      ["rev-list", "--count", "v0.1.0..HEAD"],
      repoDir,
    );
    const count = parseInt(countOutput.trim(), 10);
    expect(count).toBeGreaterThan(0);
  });
});
