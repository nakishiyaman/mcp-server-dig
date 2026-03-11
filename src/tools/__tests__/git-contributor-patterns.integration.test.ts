import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseShortlogOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_contributor_patterns (end-to-end)", () => {
  it("returns contributor stats", async () => {
    const shortlogOutput = await execGit(
      ["shortlog", "-sne", "--max-count=500", "HEAD"],
      getRepoDir(),
    );

    // Calculate total from shortlog
    const totalCommits = shortlogOutput
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .reduce((sum, line) => {
        const match = line.trim().match(/^(\d+)/);
        return sum + (match ? parseInt(match[1], 10) : 0);
      }, 0);

    expect(totalCommits).toBe(5);

    const stats = parseShortlogOutput(shortlogOutput, totalCommits);
    expect(stats).toHaveLength(2);

    const alice = stats.find((s) => s.name === "Alice");
    const bob = stats.find((s) => s.name === "Bob");

    expect(alice).toBeDefined();
    expect(alice!.commitCount).toBe(2);
    expect(bob).toBeDefined();
    expect(bob!.commitCount).toBe(3);
  });

  it("enriches with last active date", async () => {
    const lastDate = await execGit(
      ["log", "--format=%aI", "--max-count=1", "--author=bob@example.com"],
      getRepoDir(),
    );
    expect(lastDate.trim()).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});
