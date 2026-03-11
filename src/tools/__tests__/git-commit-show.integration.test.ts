import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { getRepoDir } from "./helpers.js";

describe("git_commit_show (end-to-end)", () => {
  it("shows commit metadata and stat", async () => {
    const output = await execGit(
      ["show", "--stat", "--format=%H|%an|%ae|%aI|%P%n%B", "HEAD~1"],
      getRepoDir(),
    );

    expect(output).toContain("Bob");
    // HEAD~1 is "chore: bulk commit 48" (second-to-last bulk commit)
    expect(output).toMatch(/chore: bulk commit \d+/);
    expect(output).toContain("src/index.ts");
  });

  it("shows diff for a commit", async () => {
    const output = await execGit(
      ["show", "-U3", "--format=", "HEAD~1"],
      getRepoDir(),
    );

    // Bulk commits modify src/index.ts with iteration comments
    expect(output).toContain("iteration");
  });
});
