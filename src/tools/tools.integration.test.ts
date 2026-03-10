/**
 * Integration tests for MCP tools.
 * Creates a temporary git repository with known commits,
 * then exercises each tool's core logic end-to-end.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { execGit, validateGitRepo, validateFilePath } from "../git/executor.js";
import { parseLogOutput, parseBlameOutput, parseShortlogOutput, parseNameOnlyLog } from "../git/parsers.js";

const execFileAsync = promisify(execFileCb);

let repoDir: string;

/** Run a git command in the test repo */
async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: repoDir });
  return stdout;
}

beforeAll(async () => {
  // Create a temporary git repo with known history
  repoDir = await mkdtemp(join(tmpdir(), "mcp-dig-test-"));

  await git("init", "-b", "main");
  await git("config", "user.name", "Alice");
  await git("config", "user.email", "alice@example.com");

  // Commit 1: create two files
  await mkdir(join(repoDir, "src"), { recursive: true });
  await writeFile(join(repoDir, "src", "index.ts"), "const x = 1;\n");
  await writeFile(join(repoDir, "src", "utils.ts"), "export function add(a: number, b: number) { return a + b; }\n");
  await git("add", ".");
  await git("commit", "-m", "feat: initial setup");

  // Commit 2 (Alice): modify index.ts and utils.ts together
  await writeFile(join(repoDir, "src", "index.ts"), "const x = 1;\nconst y = 2;\n");
  await writeFile(join(repoDir, "src", "utils.ts"), "export function add(a: number, b: number) { return a + b; }\nexport function sub(a: number, b: number) { return a - b; }\n");
  await git("add", ".");
  await git("commit", "-m", "feat: add y variable and sub function");

  // Commit 3 (Bob): modify only index.ts
  await git("config", "user.name", "Bob");
  await git("config", "user.email", "bob@example.com");
  await writeFile(join(repoDir, "src", "index.ts"), "const x = 1;\nconst y = 2;\nconst z = 3;\n");
  await git("add", ".");
  await git("commit", "-m", "feat: add z variable");
}, 30_000);

afterAll(async () => {
  if (repoDir) {
    await rm(repoDir, { recursive: true, force: true });
  }
});

// ─── executor validation ─────────────────────────────────

describe("executor: validateGitRepo", () => {
  it("accepts a valid git repo", async () => {
    await expect(validateGitRepo(repoDir)).resolves.toBeUndefined();
  });

  it("rejects a non-git directory", async () => {
    const nonRepo = await mkdtemp(join(tmpdir(), "mcp-dig-nonrepo-"));
    try {
      await expect(validateGitRepo(nonRepo)).rejects.toThrow("Not a git repository");
    } finally {
      await rm(nonRepo, { recursive: true, force: true });
    }
  });
});

describe("executor: validateFilePath", () => {
  it("allows paths within the repo", async () => {
    await expect(validateFilePath(repoDir, "src/index.ts")).resolves.toBeUndefined();
  });

  it("rejects path traversal", async () => {
    await expect(validateFilePath(repoDir, "../../../etc/passwd")).rejects.toThrow(
      "File path escapes repository root",
    );
  });
});

// ─── git_file_history ────────────────────────────────────

describe("git_file_history (end-to-end)", () => {
  it("returns commit history for a file", async () => {
    const output = await execGit(
      ["log", "--follow", "--format=%H|%an|%ae|%aI|%s", "--max-count=20", "--", "src/index.ts"],
      repoDir,
    );
    const commits = parseLogOutput(output);

    expect(commits).toHaveLength(3);
    expect(commits[0].subject).toBe("feat: add z variable");
    expect(commits[0].author).toBe("Bob");
    expect(commits[1].subject).toBe("feat: add y variable and sub function");
    expect(commits[2].subject).toBe("feat: initial setup");
  });

  it("respects max_commits", async () => {
    const output = await execGit(
      ["log", "--follow", "--format=%H|%an|%ae|%aI|%s", "--max-count=1", "--", "src/index.ts"],
      repoDir,
    );
    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(1);
  });

  it("returns diff stats for a commit", async () => {
    const logOutput = await execGit(
      ["log", "--follow", "--format=%H|%an|%ae|%aI|%s", "--max-count=1", "--", "src/index.ts"],
      repoDir,
    );
    const commits = parseLogOutput(logOutput);
    const stat = await execGit(
      ["show", "--stat", "--format=", commits[0].hash, "--", "src/index.ts"],
      repoDir,
    );
    expect(stat).toContain("src/index.ts");
  });
});

// ─── git_blame_context ───────────────────────────────────

describe("git_blame_context (end-to-end)", () => {
  it("returns blame blocks for a file", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "--", "src/index.ts"],
      repoDir,
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
      repoDir,
    );
    const blocks = parseBlameOutput(output);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].author).toBe("Bob");
    expect(blocks[0].startLine).toBe(3);
    expect(blocks[0].endLine).toBe(3);
  });
});

// ─── git_related_changes ─────────────────────────────────

describe("git_related_changes (end-to-end)", () => {
  it("finds co-changed files", async () => {
    // Get commits that touch index.ts
    const logOutput = await execGit(
      ["log", "--format=COMMIT:%H", "--name-only", "--max-count=100", "--", "src/index.ts"],
      repoDir,
    );
    const commitFiles = parseNameOnlyLog(logOutput);
    expect(commitFiles.size).toBe(3);

    // Build co-change map (same logic as the tool)
    const coChangeMap = new Map<string, number>();
    for (const [hash] of commitFiles) {
      const allFiles = await execGit(["show", "--name-only", "--format=", hash], repoDir);
      const files = allFiles.trim().split("\n").filter((f) => f.length > 0 && f !== "src/index.ts");
      for (const f of files) {
        coChangeMap.set(f, (coChangeMap.get(f) ?? 0) + 1);
      }
    }

    // utils.ts was changed in 2 of the 3 commits that touched index.ts
    expect(coChangeMap.get("src/utils.ts")).toBe(2);
  });
});

// ─── git_contributor_patterns ────────────────────────────

describe("git_contributor_patterns (end-to-end)", () => {
  it("returns contributor stats", async () => {
    const shortlogOutput = await execGit(
      ["shortlog", "-sne", "--max-count=500", "HEAD"],
      repoDir,
    );

    // Calculate total from shortlog
    const totalCommits = shortlogOutput
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .reduce((sum, line) => {
        const match = line.trim().match(/^(\d+)/);
        return sum + (match ? parseInt(match[1], 10) : 0);
      }, 0);

    expect(totalCommits).toBe(3);

    const stats = parseShortlogOutput(shortlogOutput, totalCommits);
    expect(stats).toHaveLength(2);

    const alice = stats.find((s) => s.name === "Alice");
    const bob = stats.find((s) => s.name === "Bob");

    expect(alice).toBeDefined();
    expect(alice!.commitCount).toBe(2);
    expect(bob).toBeDefined();
    expect(bob!.commitCount).toBe(1);
  });

  it("enriches with last active date", async () => {
    const lastDate = await execGit(
      ["log", "--format=%aI", "--max-count=1", "--author=bob@example.com"],
      repoDir,
    );
    expect(lastDate.trim()).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});
