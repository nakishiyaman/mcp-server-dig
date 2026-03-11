/**
 * Global setup for integration tests.
 * Creates a temporary git repository with known commits once,
 * shared across all test files via vitest provide/inject.
 */
import type { GlobalSetupContext } from "vitest/node";
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

export async function setup({ provide }: GlobalSetupContext) {
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
