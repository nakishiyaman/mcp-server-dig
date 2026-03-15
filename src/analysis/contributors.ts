import { execGit } from "../git/executor.js";
import { parseShortlogOutput } from "../git/parsers.js";
import type { ContributorStats } from "../git/types.js";

export interface ContributorsOptions {
  pathPattern?: string;
  since?: string;
  until?: string;
  maxCommits?: number;
  timeoutMs?: number;
}

export async function analyzeContributors(
  repoPath: string,
  options: ContributorsOptions = {},
): Promise<{ stats: ContributorStats[]; totalCommits: number }> {
  const { pathPattern, since, until, maxCommits = 500, timeoutMs } = options;

  const shortlogArgs = ["shortlog", "-sne", `--max-count=${maxCommits}`];
  if (since) shortlogArgs.push(`--since=${since}`);
  if (until) shortlogArgs.push(`--until=${until}`);
  shortlogArgs.push("HEAD");
  if (pathPattern) shortlogArgs.push("--", pathPattern);

  const shortlogOutput = await execGit(shortlogArgs, repoPath, timeoutMs);

  const totalCommits = shortlogOutput
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .reduce((sum, line) => {
      const match = line.trim().match(/^(\d+)/);
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0);

  const stats = parseShortlogOutput(shortlogOutput, totalCommits);

  const failedLookups: string[] = [];
  for (const contributor of stats) {
    try {
      const logArgs = [
        "log",
        "--format=%aI",
        "--max-count=1",
        `--author=${contributor.email}`,
      ];
      if (pathPattern) logArgs.push("--", pathPattern);

      const lastDate = await execGit(logArgs, repoPath, timeoutMs);
      contributor.lastActive = lastDate.trim().slice(0, 10);
    } catch {
      contributor.lastActive = "unknown";
      failedLookups.push(contributor.name);
    }
  }

  return { stats, totalCommits };
}
