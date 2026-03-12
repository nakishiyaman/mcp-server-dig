import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseRenameOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_rename_history (end-to-end)", () => {
  it("リネーム履歴を検出する", async () => {
    const output = await execGit(
      [
        "log",
        "--follow",
        "--diff-filter=R",
        "--find-renames",
        "--format=%H|%an|%ae|%aI|%s",
        "--name-status",
        "--max-count=50",
        "--",
        "src/helpers.ts",
      ],
      getRepoDir(),
    );
    const renames = parseRenameOutput(output);

    expect(renames.length).toBeGreaterThanOrEqual(1);
    expect(renames[0].oldPath).toBe("src/utils.ts");
    expect(renames[0].newPath).toBe("src/helpers.ts");
    expect(renames[0].subject).toContain("rename");
  });

  it("リネームされていないファイルは空の結果を返す", async () => {
    const output = await execGit(
      [
        "log",
        "--follow",
        "--diff-filter=R",
        "--find-renames",
        "--format=%H|%an|%ae|%aI|%s",
        "--name-status",
        "--max-count=50",
        "--",
        "src/index.ts",
      ],
      getRepoDir(),
    );
    const renames = parseRenameOutput(output);
    expect(renames).toHaveLength(0);
  });
});
