import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseLogOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_merge_base (end-to-end)", () => {
  it("finds merge base between main and feature branch", async () => {
    const repoDir = getRepoDir();
    const mergeBaseOutput = await execGit(
      ["merge-base", "main", "feature-branch"],
      repoDir,
    );
    const mergeBase = mergeBaseOutput.trim();

    expect(mergeBase).toHaveLength(40);

    // Commits on main since merge base (should have "feat: add w variable")
    const mainOutput = await execGit(
      [
        "log",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=100",
        `${mergeBase}..main`,
      ],
      repoDir,
    );
    const mainCommits = parseLogOutput(mainOutput);
    // original post-merge-base + rename + merge-test-branch + 50 bulk
    expect(mainCommits.length).toBeGreaterThanOrEqual(54);
    const mainSubjects = mainCommits.map((c) => c.subject);
    expect(mainSubjects).toContain("feat: add w variable");

    // Commits on feature-branch since merge base
    const featureOutput = await execGit(
      [
        "log",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=50",
        `${mergeBase}..feature-branch`,
      ],
      repoDir,
    );
    const featureCommits = parseLogOutput(featureOutput);
    expect(featureCommits.length).toBeGreaterThanOrEqual(1);
    expect(featureCommits[0].subject).toBe("feat: add feature module");
  });
});
