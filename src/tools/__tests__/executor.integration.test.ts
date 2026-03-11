import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateGitRepo, validateFilePath } from "../../git/executor.js";
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
});
