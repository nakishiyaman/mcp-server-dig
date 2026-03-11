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
    expect(output).toContain("feat: add w variable");
    expect(output).toContain("src/index.ts");
  });

  it("shows diff for a commit", async () => {
    const output = await execGit(
      ["show", "-U3", "--format=", "HEAD~1"],
      getRepoDir(),
    );

    expect(output).toContain("const w = 4;");
  });
});
