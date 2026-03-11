import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseFileFrequency } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_hotspots (end-to-end)", () => {
  it("identifies frequently changed files", async () => {
    const output = await execGit(
      ["log", "--format=", "--name-only", "--max-count=500"],
      getRepoDir(),
    );
    const hotspots = parseFileFrequency(output, 20);

    expect(hotspots.length).toBeGreaterThanOrEqual(1);

    // index.ts was changed in all 3 commits, should be top
    const indexTs = hotspots.find((h) => h.filePath === "src/index.ts");
    expect(indexTs).toBeDefined();
    // 4 original + 50 bulk = 54 changes
    expect(indexTs!.changeCount).toBeGreaterThanOrEqual(54);
  });

  it("filters by path pattern", async () => {
    const output = await execGit(
      [
        "log",
        "--format=",
        "--name-only",
        "--max-count=500",
        "--",
        "src/utils.ts",
      ],
      getRepoDir(),
    );
    const hotspots = parseFileFrequency(output, 20);

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].filePath).toBe("src/utils.ts");
  });
});
