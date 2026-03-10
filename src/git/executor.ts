import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_TIMEOUT_MS = 30_000;

export class GitExecutorError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "GitExecutorError";
  }
}

export async function execGit(
  args: string[],
  cwd: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const resolvedCwd = resolve(cwd);

  await access(resolvedCwd).catch(() => {
    throw new GitExecutorError(`Directory does not exist: ${resolvedCwd}`);
  });

  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd: resolvedCwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const code = (error as NodeJS.ErrnoException & { code?: number })
            .code;
          reject(
            new GitExecutorError(
              `git ${args[0]} failed: ${stderr || error.message}`,
              typeof code === "number" ? code : undefined,
            ),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

export async function validateGitRepo(cwd: string): Promise<void> {
  try {
    await execGit(["rev-parse", "--git-dir"], cwd);
  } catch {
    throw new GitExecutorError(`Not a git repository: ${resolve(cwd)}`);
  }
}

export async function validateFilePath(
  repoPath: string,
  filePath: string,
): Promise<void> {
  const resolved = resolve(repoPath, filePath);
  const repoResolved = resolve(repoPath);
  if (!resolved.startsWith(repoResolved)) {
    throw new GitExecutorError(
      `File path escapes repository root: ${filePath}`,
    );
  }
}
