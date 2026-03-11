import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseLogOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_file_history (end-to-end)", () => {
  it("returns commit history for a file", async () => {
    const output = await execGit(
      [
        "log",
        "--follow",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
        "--",
        "src/index.ts",
      ],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);

    expect(commits.length).toBeGreaterThanOrEqual(3);
    expect(commits[0].subject).toBe("feat: add w variable");
    expect(commits[1].subject).toBe("feat: add z variable");
  });

  it("respects max_commits", async () => {
    const output = await execGit(
      [
        "log",
        "--follow",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=1",
        "--",
        "src/index.ts",
      ],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(1);
  });

  it("returns diff stats for a commit", async () => {
    const logOutput = await execGit(
      [
        "log",
        "--follow",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=1",
        "--",
        "src/index.ts",
      ],
      getRepoDir(),
    );
    const commits = parseLogOutput(logOutput);
    const stat = await execGit(
      ["show", "--stat", "--format=", commits[0].hash, "--", "src/index.ts"],
      getRepoDir(),
    );
    expect(stat).toContain("src/index.ts");
  });
});
