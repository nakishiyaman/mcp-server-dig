/**
 * Shared helpers for integration tests.
 */
import { inject } from "vitest";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

export function getRepoDir(): string {
  return inject("integrationRepoDir");
}

export async function git(repoDir: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: repoDir });
  return stdout;
}
