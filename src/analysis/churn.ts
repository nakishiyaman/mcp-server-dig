import { execGit } from "../git/executor.js";
import { parseNumstatOutput } from "../git/parsers.js";
import type { FileChurn } from "../git/types.js";

export interface ChurnOptions {
  pathPattern?: string;
  since?: string;
  maxCommits?: number;
  topN?: number;
  timeoutMs?: number;
}

export async function analyzeChurn(
  repoPath: string,
  options: ChurnOptions = {},
): Promise<FileChurn[]> {
  const { pathPattern, since, maxCommits = 500, topN = 20, timeoutMs } = options;

  const args = [
    "log",
    "--numstat",
    "--format=COMMIT:%H",
    `--max-count=${maxCommits}`,
  ];

  if (since) args.push(`--since=${since}`);
  if (pathPattern) args.push("--", pathPattern);

  const output = await execGit(args, repoPath, timeoutMs);
  return parseNumstatOutput(output, topN);
}
