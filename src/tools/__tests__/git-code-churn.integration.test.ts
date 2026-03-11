import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseNumstatOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_code_churn (end-to-end)", () => {
  it("returns churn stats per file", async () => {
    const output = await execGit(
      ["log", "--numstat", "--format=COMMIT:%H", "--max-count=500"],
      getRepoDir(),
    );
    const churnFiles = parseNumstatOutput(output, 20);

    expect(churnFiles.length).toBeGreaterThanOrEqual(1);

    // index.ts should have the highest churn
    const indexTs = churnFiles.find((f) => f.filePath === "src/index.ts");
    expect(indexTs).toBeDefined();
    expect(indexTs!.totalChurn).toBeGreaterThan(0);
    expect(indexTs!.commits).toBeGreaterThanOrEqual(3);
  });

  it("filters by path", async () => {
    const output = await execGit(
      [
        "log",
        "--numstat",
        "--format=COMMIT:%H",
        "--max-count=500",
        "--",
        "src/utils.ts",
      ],
      getRepoDir(),
    );
    const churnFiles = parseNumstatOutput(output, 20);

    expect(churnFiles).toHaveLength(1);
    expect(churnFiles[0].filePath).toBe("src/utils.ts");
  });
});
