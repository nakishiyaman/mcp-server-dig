import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseBlameOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("git_blame_context (end-to-end)", () => {
  it("returns blame blocks for a file", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "--", "src/index.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);

    expect(blocks.length).toBeGreaterThanOrEqual(1);

    // Line 1-2 should be from Alice (commit 2 modified them or they're from earlier)
    // Line 3 should be from Bob
    const bobBlock = blocks.find((b) => b.author === "Bob");
    expect(bobBlock).toBeDefined();
    expect(bobBlock!.lines).toContain("const z = 3;");
  });

  it("respects line range", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "-L", "3,3", "--", "src/index.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].author).toBe("Bob");
    expect(blocks[0].startLine).toBe(3);
    expect(blocks[0].endLine).toBe(3);
  });
});
