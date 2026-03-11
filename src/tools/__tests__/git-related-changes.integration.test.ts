import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseNameOnlyLog } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_related_changes (end-to-end)", () => {
  it("finds co-changed files", async () => {
    const repoDir = getRepoDir();
    // Get commits that touch index.ts
    const logOutput = await execGit(
      [
        "log",
        "--format=COMMIT:%H",
        "--name-only",
        "--max-count=100",
        "--",
        "src/index.ts",
      ],
      repoDir,
    );
    const commitFiles = parseNameOnlyLog(logOutput);
    // 4 original + 50 bulk commits touch src/index.ts = 54
    expect(commitFiles.size).toBeGreaterThanOrEqual(54);

    // Build co-change map (same logic as the tool)
    const coChangeMap = new Map<string, number>();
    for (const [hash] of commitFiles) {
      const allFiles = await execGit(
        ["show", "--name-only", "--format=", hash],
        repoDir,
      );
      const files = allFiles
        .trim()
        .split("\n")
        .filter((f) => f.length > 0 && f !== "src/index.ts");
      for (const f of files) {
        coChangeMap.set(f, (coChangeMap.get(f) ?? 0) + 1);
      }
    }

    // utils.ts was changed in 2 of the 3 commits that touched index.ts
    expect(coChangeMap.get("src/utils.ts")).toBe(2);
  });
});
