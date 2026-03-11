import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseStaleFiles } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_stale_files (end-to-end)", () => {
  it("finds stale files with threshold 0 days", async () => {
    const repoDir = getRepoDir();
    // All files should be "stale" with a 0-day threshold
    const trackedOutput = await execGit(["ls-files"], repoDir);
    const trackedFiles = trackedOutput
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    const dateLines: string[] = [];
    for (const file of trackedFiles) {
      const dateOutput = await execGit(
        ["log", "--format=%aI", "--max-count=1", "--", file],
        repoDir,
      );
      const date = dateOutput.trim();
      if (date) dateLines.push(`${date}\t${file}`);
    }

    const raw = dateLines.join("\n");
    const staleFiles = parseStaleFiles(raw, 0);

    expect(staleFiles.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty when no files exceed threshold", async () => {
    // With a very high threshold, no recently created files should match
    const raw = `2026-03-11T00:00:00+09:00\tsrc/index.ts`;
    const staleFiles = parseStaleFiles(raw, 999999);
    expect(staleFiles).toHaveLength(0);
  });
});
