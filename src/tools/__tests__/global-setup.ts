/**
 * Global setup for integration tests.
 * Creates a temporary git repository with known commits once,
 * shared across all test files via vitest provide/inject.
 */
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

let repoDir: string;

async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: repoDir });
  return stdout;
}

export async function setup({
  provide,
}: {
  provide: (key: string, value: unknown) => void;
}) {
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

  // Commit 5 (Bob): add an empty file for edge case testing
  await writeFile(join(repoDir, "src", "empty.ts"), "");
  await git("add", ".");
  await git("commit", "-m", "chore: add empty file");

  // Commit 6 (Bob): add binary file for edge case testing
  await mkdir(join(repoDir, "assets"), { recursive: true });
  const binaryContent = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG header
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  await writeFile(join(repoDir, "assets", "logo.png"), binaryContent);
  await git("add", ".");
  await git("commit", "-m", "chore: add binary file");

  // Commit 7 (Bob): add non-ASCII filename for edge case testing
  await writeFile(join(repoDir, "src", "日本語ファイル.ts"), "export const greeting = 'こんにちは';\n");
  await writeFile(join(repoDir, "src", "file with spaces.ts"), "export const spaced = true;\n");
  await git("add", ".");
  await git("commit", "-m", "chore: add non-ASCII and spaced filenames");

  // Commit 8 (Bob): rename a file for rename_history tests
  await git("mv", "src/utils.ts", "src/helpers.ts");
  await git("add", ".");
  await git("commit", "-m", "refactor: rename utils to helpers");

  // Create and merge a separate branch for commit_graph tests
  // (feature-branch must remain unmerged for merge_base tests)
  await git("checkout", "-b", "merge-test-branch");
  await writeFile(
    join(repoDir, "src", "merged-feature.ts"),
    "export const merged = true;\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add merged feature");
  await git("checkout", "main");
  await git("merge", "merge-test-branch", "--no-ff", "--no-edit");

  // Additional authors for knowledge-map contributor truncation testing
  const extraAuthors = [
    { name: "Carol", email: "carol@example.com" },
    { name: "Dave", email: "dave@example.com" },
    { name: "Eve", email: "eve@example.com" },
    { name: "Frank", email: "frank@example.com" },
  ];
  for (const author of extraAuthors) {
    await git("config", "user.name", author.name);
    await git("config", "user.email", author.email);
    await writeFile(
      join(repoDir, "src", `contrib-${author.name.toLowerCase()}.ts`),
      `export const author = "${author.name}";\n`,
    );
    await git("add", ".");
    await git("commit", "-m", `feat: add ${author.name}'s contribution`);
  }

  // Line history: create a function that gets modified across multiple commits
  await git("config", "user.name", "Alice");
  await git("config", "user.email", "alice@example.com");
  await writeFile(
    join(repoDir, "src", "calculator.ts"),
    "export function calculate(a: number, b: number) {\n  return a + b;\n}\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add calculator function");

  await writeFile(
    join(repoDir, "src", "calculator.ts"),
    "export function calculate(a: number, b: number) {\n  // validate inputs\n  if (isNaN(a) || isNaN(b)) throw new Error('invalid');\n  return a + b;\n}\n",
  );
  await git("add", ".");
  await git("commit", "-m", "fix: add input validation to calculator");

  await writeFile(
    join(repoDir, "src", "calculator.ts"),
    "export function calculate(a: number, b: number, op: string = '+') {\n  // validate inputs\n  if (isNaN(a) || isNaN(b)) throw new Error('invalid');\n  if (op === '-') return a - b;\n  return a + b;\n}\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: support subtraction in calculator");

  // Cherry-pick: pick a feature-branch commit into main for cherry-pick detection tests
  const featureCommitHash = (
    await git("log", "feature-branch", "--format=%H", "-1")
  ).trim();
  await git("cherry-pick", featureCommitHash);

  // Reset: create reflog entries for reflog analysis tests
  await git("config", "user.name", "Bob");
  await git("config", "user.email", "bob@example.com");
  await writeFile(
    join(repoDir, "src", "reflog-test.ts"),
    "export const reflog = true;\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add reflog test file");
  // Soft reset to create a reset entry in reflog
  await git("reset", "--soft", "HEAD~1");
  // Re-commit to restore
  await git("commit", "-m", "feat: add reflog test file (re-committed)");

  // Revert: create a revert commit for revert_analysis tests
  await git("config", "user.name", "Alice");
  await git("config", "user.email", "alice@example.com");
  await writeFile(
    join(repoDir, "src", "buggy.ts"),
    "export const buggy = true;\n",
  );
  await git("add", ".");
  await git("commit", "-m", "feat: add buggy feature");
  await git("revert", "HEAD", "--no-edit");

  // Commits (Bob): bulk commits for truncation testing
  await git("config", "user.name", "Bob");
  await git("config", "user.email", "bob@example.com");
  for (let i = 0; i < 50; i++) {
    await writeFile(
      join(repoDir, "src", "index.ts"),
      `const x = 1;\nconst y = 2;\nconst z = 3;\nconst w = 4;\n// iteration ${i}\n`,
    );
    await git("add", ".");
    await git("commit", "-m", `chore: bulk commit ${i}`);
  }

  provide("integrationRepoDir", repoDir);
}

export async function teardown() {
  if (repoDir) {
    await rm(repoDir, { recursive: true, force: true });
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    integrationRepoDir: string;
  }
}
