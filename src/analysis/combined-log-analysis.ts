import { execGit } from "../git/executor.js";
import {
  parseCombinedNumstat,
  type CombinedNumstatResult,
} from "../git/parsers.js";

export interface CombinedAnalysisOptions {
  pathPattern?: string;
  since?: string;
  until?: string;
  maxCommits?: number;
  hotspotsTopN?: number;
  churnTopN?: number;
  timeoutMs?: number;
}

/**
 * Run a single `git log --numstat` scan and extract both hotspots and churn.
 * Replaces separate `analyzeHotspots()` + `analyzeChurn()` calls,
 * halving the number of git subprocess spawns.
 */
export async function analyzeHotspotsAndChurn(
  repoPath: string,
  options: CombinedAnalysisOptions = {},
): Promise<CombinedNumstatResult> {
  const {
    pathPattern,
    since,
    until,
    maxCommits = 500,
    hotspotsTopN = 20,
    churnTopN = 20,
    timeoutMs,
  } = options;

  const args = [
    "log",
    "--numstat",
    "--format=COMMIT:%H",
    `--max-count=${maxCommits}`,
  ];

  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  if (pathPattern) args.push("--", pathPattern);

  const output = await execGit(args, repoPath, timeoutMs);
  return parseCombinedNumstat(output, { hotspotsTopN, churnTopN });
}

/**
 * Count stale files efficiently using a single git log scan with --since.
 * Files tracked by git but NOT modified since the threshold are stale.
 */
export async function countStaleFiles(
  repoPath: string,
  trackedFiles: string[],
  thresholdDays: number,
  timeoutMs?: number,
): Promise<number> {
  if (trackedFiles.length === 0) return 0;

  const output = await execGit(
    ["log", "--format=", "--name-only", `--since=${thresholdDays} days ago`],
    repoPath,
    timeoutMs,
  );

  const recentlyModified = new Set(
    output
      .trim()
      .split("\n")
      .filter((l) => l.length > 0),
  );

  return trackedFiles.filter((f) => !recentlyModified.has(f)).length;
}
