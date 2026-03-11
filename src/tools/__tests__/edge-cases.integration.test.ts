import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseBlameOutput } from "../../git/parsers.js";
import { getRepoDir } from "./helpers.js";

describe("エッジケース", () => {
  it("空ファイルのblameは空ブロックを返す", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "--", "src/empty.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);
    expect(blocks).toHaveLength(0);
  });

  it("存在しないファイルへのblameはエラーを返す", async () => {
    await expect(
      execGit(["blame", "--porcelain", "--", "nonexistent.ts"], getRepoDir()),
    ).rejects.toThrow();
  });

  it("end_lineのみ指定でblameが動作する", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "-L", "1,2", "--", "src/index.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].startLine).toBe(1);
  });
});
