import { execGit } from "../git/executor.js";
import { parseFileFrequency } from "../git/parsers.js";
import type { FileHotspot } from "../git/types.js";

export interface HotspotsOptions {
  pathPattern?: string;
  since?: string;
  maxCommits?: number;
  topN?: number;
}

export async function analyzeHotspots(
  repoPath: string,
  options: HotspotsOptions = {},
): Promise<FileHotspot[]> {
  const { pathPattern, since, maxCommits = 500, topN = 20 } = options;

  const args = [
    "log",
    "--format=",
    "--name-only",
    `--max-count=${maxCommits}`,
  ];

  if (since) args.push(`--since=${since}`);
  if (pathPattern) args.push("--", pathPattern);

  const output = await execGit(args, repoPath);
  return parseFileFrequency(output, topN);
}
