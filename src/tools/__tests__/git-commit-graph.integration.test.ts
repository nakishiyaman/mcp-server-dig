import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_graph (end-to-end)", () => {
  it("コミット統計を取得する", async () => {
    const output = await execGit(
      ["log", "--format=%H|%aI|%s", "--max-count=1000"],
      getRepoDir(),
    );

    const lines = output
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("マージコミットを検出する", async () => {
    const output = await execGit(
      ["log", "--merges", "--format=%H|%aI|%s", "--max-count=1000"],
      getRepoDir(),
    );

    const lines = output
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    // The test repo has at least one merge (feature-branch into main)
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("マージソースを解析する", async () => {
    const output = await execGit(
      ["log", "--merges", "--format=%s", "--max-count=1000"],
      getRepoDir(),
    );

    const subjects = output
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    // At least one merge subject should exist
    expect(subjects.length).toBeGreaterThanOrEqual(1);
    expect(subjects.some((s) => s.includes("Merge") || s.includes("merge"))).toBe(true);
  });
});
