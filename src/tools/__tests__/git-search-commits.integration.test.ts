import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseLogOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_search_commits (end-to-end)", () => {
  it("finds commits matching a keyword", async () => {
    const output = await execGit(
      [
        "log",
        "--grep=initial",
        "--regexp-ignore-case",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
      ],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);

    expect(commits).toHaveLength(1);
    expect(commits[0].subject).toBe("feat: initial setup");
  });

  it("finds commits by author", async () => {
    const output = await execGit(
      [
        "log",
        "--grep=feat",
        "--regexp-ignore-case",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
        "--author=Bob",
      ],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);

    expect(commits.length).toBeGreaterThanOrEqual(2);
    expect(commits.every((c) => c.author === "Bob")).toBe(true);
  });

  it("returns empty for no matches", async () => {
    const output = await execGit(
      [
        "log",
        "--grep=nonexistent-keyword",
        "--regexp-ignore-case",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
      ],
      getRepoDir(),
    );
    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(0);
  });
});
