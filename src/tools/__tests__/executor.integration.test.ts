import { describe, it, expect } from "vitest";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateGitRepo,
  validateFilePath,
  execGit,
} from "../../git/executor.js";
import { getRepoDir } from "./helpers.js";

describe("executor: validateGitRepo", () => {
  it("accepts a valid git repo", async () => {
    await expect(validateGitRepo(getRepoDir())).resolves.toBeUndefined();
  });

  it("rejects a non-git directory", async () => {
    const nonRepo = await mkdtemp(join(tmpdir(), "mcp-dig-nonrepo-"));
    try {
      await expect(validateGitRepo(nonRepo)).rejects.toThrow(
        "Not a git repository",
      );
    } finally {
      await rm(nonRepo, { recursive: true, force: true });
    }
  });
});

describe("executor: validateFilePath", () => {
  it("allows paths within the repo", async () => {
    await expect(
      validateFilePath(getRepoDir(), "src/index.ts"),
    ).resolves.toBeUndefined();
  });

  it("rejects path traversal", async () => {
    await expect(
      validateFilePath(getRepoDir(), "../../../etc/passwd"),
    ).rejects.toThrow("File path escapes repository root");
  });

  it("symlinkによるリポジトリ外脱出を拒否する", async () => {
    const repoDir = getRepoDir();
    const outsideDir = await mkdtemp(join(tmpdir(), "mcp-dig-outside-"));
    const secretFile = join(outsideDir, "secret.txt");
    await writeFile(secretFile, "secret-data");

    const linkPath = join(repoDir, "evil-link");
    try {
      await symlink(outsideDir, linkPath);
      await expect(
        validateFilePath(repoDir, "evil-link/secret.txt"),
      ).rejects.toThrow("File path escapes repository root");
    } finally {
      await rm(linkPath, { force: true });
      await rm(outsideDir, { recursive: true, force: true });
    }
  });
});

describe("executor: execGit 環境変数サニタイズ", () => {
  it("GIT_DIR環境変数が設定されていても正常に動作する", async () => {
    const originalGitDir = process.env["GIT_DIR"];
    try {
      process.env["GIT_DIR"] = "/nonexistent/evil/path";
      const result = await execGit(["rev-parse", "--git-dir"], getRepoDir());
      expect(result.trim()).toBe(".git");
    } finally {
      if (originalGitDir === undefined) {
        delete process.env["GIT_DIR"];
      } else {
        process.env["GIT_DIR"] = originalGitDir;
      }
    }
  });
});

describe("executor: execGit 制御文字サニタイズ", () => {
  it("git出力から制御文字が除去される", async () => {
    const result = await execGit(["rev-parse", "HEAD"], getRepoDir());
    // 正常なgit出力には制御文字が含まれないことを確認
    // eslint-disable-next-line no-control-regex
    expect(result).not.toMatch(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  });
});
