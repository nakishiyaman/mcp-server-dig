import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseLogOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_pickaxe (end-to-end)", () => {
  it("finds commits that introduced a string", async () => {
    const output = await execGit(
      ["log", "-Sconst z", "--format=%H|%an|%ae|%aI|%s", "--max-count=20"],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);

    expect(commits.length).toBeGreaterThanOrEqual(1);
    expect(commits[0].subject).toBe("feat: add z variable");
  });

  it("finds commits with regex search", async () => {
    const output = await execGit(
      ["log", "-Gconst [wz]", "--format=%H|%an|%ae|%aI|%s", "--max-count=20"],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);

    expect(commits.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty for no matches", async () => {
    const output = await execGit(
      [
        "log",
        "-Snonexistent_string_xyz",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
      ],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(0);
  });
});
