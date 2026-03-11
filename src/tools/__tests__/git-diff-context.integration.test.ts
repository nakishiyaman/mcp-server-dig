import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseDiffStatOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_diff_context (end-to-end)", () => {
  it("shows diff stat between two commits", async () => {
    const repoDir = getRepoDir();
    const logOutput = await execGit(
      ["log", "--format=%H", "--max-count=3"],
      repoDir,
    );
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const statOutput = await execGit(
      ["diff", "--stat", oldest, newest],
      repoDir,
    );
    const stat = parseDiffStatOutput(statOutput);

    expect(stat.filesChanged).toBeGreaterThanOrEqual(1);
    expect(stat.insertions).toBeGreaterThan(0);
  });

  it("shows full diff for a specific file", async () => {
    const repoDir = getRepoDir();
    const logOutput = await execGit(
      ["log", "--format=%H", "--max-count=3"],
      repoDir,
    );
    const hashes = logOutput.trim().split("\n");

    const output = await execGit(
      [
        "diff",
        "-U3",
        hashes[hashes.length - 1],
        hashes[0],
        "--",
        "src/index.ts",
      ],
      repoDir,
    );

    expect(output).toContain("const y = 2;");
    expect(output).toContain("const z = 3;");
  });
});
