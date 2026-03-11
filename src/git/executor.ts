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
          const errnoCode = (error as NodeJS.ErrnoException).code;
          const exitCode =
            "exitCode" in error && typeof error.exitCode === "number"
              ? error.exitCode
              : undefined;
          const cmd = `git ${args.join(" ")}`;

          if (errnoCode === "ENOENT") {
            reject(
              new GitExecutorError(
                `git is not installed or not found in PATH. Install git and ensure it is available on your system PATH. (command: ${cmd})`,
              ),
            );
            return;
          }

          const stderrStr = stderr || error.message;
          const isNotRepo =
            stderrStr.includes("not a git repository") ||
            stderrStr.includes("not a git repository (or any");
          if (isNotRepo) {
            reject(
              new GitExecutorError(
                `Not a git repository: ${resolvedCwd}. Run this tool on a directory that contains a .git folder, or initialize one with 'git init'.`,
              ),
            );
            return;
          }

          reject(
            new GitExecutorError(
              `${cmd} failed: ${stderrStr}`,
              exitCode,
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
