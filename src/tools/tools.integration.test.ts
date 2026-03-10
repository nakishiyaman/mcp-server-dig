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
import {
  parseLogOutput,
  parseBlameOutput,
  parseShortlogOutput,
  parseNameOnlyLog,
  parseDiffStatOutput,
  parseFileFrequency,
  parseNumstatOutput,
  parseStaleFiles,
  parseTagOutput,
} from "../git/parsers.js";

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
  await writeFile(
    join(repoDir, "src", "utils.ts"),
    "export function add(a: number, b: number) { return a + b; }\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: initial setup");

  // Commit 2 (Alice): modify index.ts and utils.ts together
  await writeFile(
    join(repoDir, "src", "index.ts"),
    "const x = 1;\nconst y = 2;\n",
  );
  await writeFile(
    join(repoDir, "src", "utils.ts"),
    "export function add(a: number, b: number) { return a + b; }\nexport function sub(a: number, b: number) { return a - b; }\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add y variable and sub function");

  // Commit 3 (Bob): modify only index.ts
  await git("config", "user.name", "Bob");
  await git("config", "user.email", "bob@example.com");
  await writeFile(
    join(repoDir, "src", "index.ts"),
    "const x = 1;\nconst y = 2;\nconst z = 3;\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add z variable");

  // Add a tag for tag_list tests
  await git("tag", "-a", "v0.1.0", "-m", "Initial release");

  // Create a feature branch for merge_base tests
  await git("checkout", "-b", "feature-branch");
  await writeFile(
    join(repoDir, "src", "feature.ts"),
    "export const feature = true;\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add feature module");
  await git("checkout", "main");

  // Add one more commit on main for merge_base divergence
  await writeFile(
    join(repoDir, "src", "index.ts"),
    "const x = 1;\nconst y = 2;\nconst z = 3;\nconst w = 4;\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add w variable");
  await git("tag", "-a", "v0.2.0", "-m", "Second release");
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
      validateFilePath(repoDir, "src/index.ts"),
    ).resolves.toBeUndefined();
  });

  it("rejects path traversal", async () => {
    await expect(
      validateFilePath(repoDir, "../../../etc/passwd"),
    ).rejects.toThrow("File path escapes repository root");
  });
});

// ─── git_file_history ────────────────────────────────────

describe("git_file_history (end-to-end)", () => {
  it("returns commit history for a file", async () => {
    const output = await execGit(
      [
        "log",
        "--follow",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
        "--",
        "src/index.ts",
      ],
      repoDir,
    );
    const commits = parseLogOutput(output);

    expect(commits.length).toBeGreaterThanOrEqual(3);
    expect(commits[0].subject).toBe("feat: add w variable");
    expect(commits[1].subject).toBe("feat: add z variable");
  });

  it("respects max_commits", async () => {
    const output = await execGit(
      [
        "log",
        "--follow",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=1",
        "--",
        "src/index.ts",
      ],
      repoDir,
    );
    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(1);
  });

  it("returns diff stats for a commit", async () => {
    const logOutput = await execGit(
      [
        "log",
        "--follow",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=1",
        "--",
        "src/index.ts",
      ],
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
    expect(commitFiles.size).toBe(4);

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

    expect(totalCommits).toBe(4);

    const stats = parseShortlogOutput(shortlogOutput, totalCommits);
    expect(stats).toHaveLength(2);

    const alice = stats.find((s) => s.name === "Alice");
    const bob = stats.find((s) => s.name === "Bob");

    expect(alice).toBeDefined();
    expect(alice!.commitCount).toBe(2);
    expect(bob).toBeDefined();
    expect(bob!.commitCount).toBe(2);
  });

  it("enriches with last active date", async () => {
    const lastDate = await execGit(
      ["log", "--format=%aI", "--max-count=1", "--author=bob@example.com"],
      repoDir,
    );
    expect(lastDate.trim()).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

// ─── git_search_commits ──────────────────────────────────

describe("git_search_commits (end-to-end)", () => {
  it("finds commits matching a keyword", async () => {
    const output = await execGit(
      [
        "log",
        "--grep=initial",
        "--regexp-ignore-case",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
      ],
      repoDir,
    );
    const commits = parseLogOutput(output);

    expect(commits).toHaveLength(1);
    expect(commits[0].subject).toBe("feat: initial setup");
  });

  it("finds commits by author", async () => {
    const output = await execGit(
      [
        "log",
        "--grep=feat",
        "--regexp-ignore-case",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
        "--author=Bob",
      ],
      repoDir,
    );
    const commits = parseLogOutput(output);

    expect(commits).toHaveLength(2);
    expect(commits[0].author).toBe("Bob");
  });

  it("returns empty for no matches", async () => {
    const output = await execGit(
      [
        "log",
        "--grep=nonexistent-keyword",
        "--regexp-ignore-case",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
      ],
      repoDir,
    );
    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(0);
  });
});

// ─── git_commit_show ─────────────────────────────────────

describe("git_commit_show (end-to-end)", () => {
  it("shows commit metadata and stat", async () => {
    const output = await execGit(
      ["show", "--stat", "--format=%H|%an|%ae|%aI|%P%n%B", "HEAD"],
      repoDir,
    );

    expect(output).toContain("Bob");
    expect(output).toContain("feat: add w variable");
    expect(output).toContain("src/index.ts");
  });

  it("shows diff for a commit", async () => {
    const output = await execGit(["show", "-U3", "--format=", "HEAD"], repoDir);

    expect(output).toContain("const w = 4;");
  });
});

// ─── git_diff_context ────────────────────────────────────

describe("git_diff_context (end-to-end)", () => {
  it("shows diff stat between two commits", async () => {
    const logOutput = await execGit(
      ["log", "--format=%H", "--max-count=3"],
      repoDir,
    );
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const statOutput = await execGit(
      ["diff", "--stat", oldest, newest],
      repoDir,
    );
    const stat = parseDiffStatOutput(statOutput);

    expect(stat.filesChanged).toBeGreaterThanOrEqual(1);
    expect(stat.insertions).toBeGreaterThan(0);
  });

  it("shows full diff for a specific file", async () => {
    const logOutput = await execGit(
      ["log", "--format=%H", "--max-count=3"],
      repoDir,
    );
    const hashes = logOutput.trim().split("\n");

    const output = await execGit(
      [
        "diff",
        "-U3",
        hashes[hashes.length - 1],
        hashes[0],
        "--",
        "src/index.ts",
      ],
      repoDir,
    );

    expect(output).toContain("const y = 2;");
    expect(output).toContain("const z = 3;");
  });
});

// ─── git_hotspots ────────────────────────────────────────

describe("git_hotspots (end-to-end)", () => {
  it("identifies frequently changed files", async () => {
    const output = await execGit(
      ["log", "--format=", "--name-only", "--max-count=500"],
      repoDir,
    );
    const hotspots = parseFileFrequency(output, 20);

    expect(hotspots.length).toBeGreaterThanOrEqual(1);

    // index.ts was changed in all 3 commits, should be top
    const indexTs = hotspots.find((h) => h.filePath === "src/index.ts");
    expect(indexTs).toBeDefined();
    expect(indexTs!.changeCount).toBe(4);
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
      repoDir,
    );
    const hotspots = parseFileFrequency(output, 20);

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].filePath).toBe("src/utils.ts");
  });
});

// ─── git_pickaxe ─────────────────────────────────────────

describe("git_pickaxe (end-to-end)", () => {
  it("finds commits that introduced a string", async () => {
    const output = await execGit(
      ["log", "-Sconst z", "--format=%H|%an|%ae|%aI|%s", "--max-count=20"],
      repoDir,
    );
    const commits = parseLogOutput(output);

    expect(commits.length).toBeGreaterThanOrEqual(1);
    expect(commits[0].subject).toBe("feat: add z variable");
  });

  it("finds commits with regex search", async () => {
    const output = await execGit(
      ["log", "-Gconst [wz]", "--format=%H|%an|%ae|%aI|%s", "--max-count=20"],
      repoDir,
    );
    const commits = parseLogOutput(output);

    expect(commits.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty for no matches", async () => {
    const output = await execGit(
      [
        "log",
        "-Snonexistent_string_xyz",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=20",
      ],
      repoDir,
    );
    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(0);
  });
});

// ─── git_code_churn ──────────────────────────────────────

describe("git_code_churn (end-to-end)", () => {
  it("returns churn stats per file", async () => {
    const output = await execGit(
      ["log", "--numstat", "--format=COMMIT:%H", "--max-count=500"],
      repoDir,
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
      repoDir,
    );
    const churnFiles = parseNumstatOutput(output, 20);

    expect(churnFiles).toHaveLength(1);
    expect(churnFiles[0].filePath).toBe("src/utils.ts");
  });
});

// ─── git_stale_files ─────────────────────────────────────

describe("git_stale_files (end-to-end)", () => {
  it("finds stale files with threshold 0 days", async () => {
    // All files should be "stale" with a 0-day threshold
    const trackedOutput = await execGit(["ls-files"], repoDir);
    const trackedFiles = trackedOutput
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    const dateLines: string[] = [];
    for (const file of trackedFiles) {
      const dateOutput = await execGit(
        ["log", "--format=%aI", "--max-count=1", "--", file],
        repoDir,
      );
      const date = dateOutput.trim();
      if (date) dateLines.push(`${date}\t${file}`);
    }

    const raw = dateLines.join("\n");
    const staleFiles = parseStaleFiles(raw, 0);

    expect(staleFiles.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty when no files exceed threshold", async () => {
    // With a very high threshold, no recently created files should match
    const raw = `2026-03-11T00:00:00+09:00\tsrc/index.ts`;
    const staleFiles = parseStaleFiles(raw, 999999);
    expect(staleFiles).toHaveLength(0);
  });
});

// ─── git_merge_base ──────────────────────────────────────

describe("git_merge_base (end-to-end)", () => {
  it("finds merge base between main and feature branch", async () => {
    const mergeBaseOutput = await execGit(
      ["merge-base", "main", "feature-branch"],
      repoDir,
    );
    const mergeBase = mergeBaseOutput.trim();

    expect(mergeBase).toHaveLength(40);

    // Commits on main since merge base (should have "feat: add w variable")
    const mainOutput = await execGit(
      [
        "log",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=50",
        `${mergeBase}..main`,
      ],
      repoDir,
    );
    const mainCommits = parseLogOutput(mainOutput);
    expect(mainCommits.length).toBeGreaterThanOrEqual(1);
    expect(mainCommits[0].subject).toBe("feat: add w variable");

    // Commits on feature-branch since merge base
    const featureOutput = await execGit(
      [
        "log",
        "--format=%H|%an|%ae|%aI|%s",
        "--max-count=50",
        `${mergeBase}..feature-branch`,
      ],
      repoDir,
    );
    const featureCommits = parseLogOutput(featureOutput);
    expect(featureCommits.length).toBeGreaterThanOrEqual(1);
    expect(featureCommits[0].subject).toBe("feat: add feature module");
  });
});

// ─── git_tag_list ────────────────────────────────────────

describe("git_tag_list (end-to-end)", () => {
  it("lists tags sorted by newest first", async () => {
    const output = await execGit(
      [
        "tag",
        "-l",
        "--sort=-creatordate",
        "--format=%(refname:short)|%(creatordate:iso-strict)|%(subject)",
      ],
      repoDir,
    );
    const tags = parseTagOutput(output);

    expect(tags).toHaveLength(2);
    const tagNames = tags.map((t) => t.name);
    expect(tagNames).toContain("v0.1.0");
    expect(tagNames).toContain("v0.2.0");
  });

  it("filters tags by pattern", async () => {
    const output = await execGit(
      [
        "tag",
        "-l",
        "--sort=-creatordate",
        "--format=%(refname:short)|%(creatordate:iso-strict)|%(subject)",
        "v0.1*",
      ],
      repoDir,
    );
    const tags = parseTagOutput(output);

    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("v0.1.0");
    expect(tags[0].subject).toBe("Initial release");
  });
});
