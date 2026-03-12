import { describe, it, expect } from "vitest";
import { _generateRepoSummaryForTest as generateRepoSummary } from "./repo-summary.js";
import { getRepoDir } from "../tools/__tests__/helpers.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

describe("repo-summary", () => {
  it("リポジトリサマリーを生成する", async () => {
    const text = await generateRepoSummary(getRepoDir());

    expect(text).toContain("Repository Summary");
    expect(text).toContain("Current branch");
    expect(text).toContain("File Types");
    expect(text).toContain("Top Contributors");
    expect(text).toContain("Recent Commits");
    expect(text).toContain("Recent Tags");
  });

  it("タグなしリポジトリでもサマリーを生成できる", async () => {
    // Create a temp repo with no tags
    const tmpRepo = await mkdtemp(join(tmpdir(), "mcp-dig-notag-"));
    try {
      const git = async (...args: string[]) => {
        await execFileAsync("git", args, { cwd: tmpRepo });
      };
      await git("init", "-b", "main");
      await git("config", "user.name", "Test");
      await git("config", "user.email", "test@example.com");
      await writeFile(join(tmpRepo, "file.txt"), "hello\n");
      await git("add", ".");
      await git("commit", "-m", "init");

      const text = await generateRepoSummary(tmpRepo);

      expect(text).toContain("Repository Summary");
      expect(text).toContain("File Types");
      // No "Recent Tags" section when there are no tags
      expect(text).not.toContain("Recent Tags");
    } finally {
      await rm(tmpRepo, { recursive: true, force: true });
    }
  });
});
