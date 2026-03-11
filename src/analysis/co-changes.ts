import { execGit } from "../git/executor.js";
import { parseNameOnlyLog } from "../git/parsers.js";

export interface CoChangeResult {
  filePath: string;
  coChangeCount: number;
  percentage: number;
}

export interface CoChangesOptions {
  maxCommits?: number;
  minCoupling?: number;
  timeoutMs?: number;
}

export async function analyzeCoChanges(
  repoPath: string,
  filePath: string,
  options: CoChangesOptions = {},
): Promise<{ results: CoChangeResult[]; totalCommits: number; skipped: string[] }> {
  const { maxCommits = 100, minCoupling = 2, timeoutMs } = options;

  const output = await execGit(
    [
      "log",
      "--format=COMMIT:%H",
      "--name-only",
      `--max-count=${maxCommits}`,
      "--",
      filePath,
    ],
    repoPath,
    timeoutMs,
  );

  const commitFiles = parseNameOnlyLog(output);
  const totalCommits = commitFiles.size;

  if (totalCommits === 0) {
    return { results: [], totalCommits: 0, skipped: [] };
  }

  const coChangeMap = new Map<string, number>();
  const skipped: string[] = [];

  for (const [hash] of commitFiles) {
    try {
      const allFiles = await execGit(
        ["show", "--name-only", "--format=", hash],
        repoPath,
        timeoutMs,
      );
      const files = allFiles
        .trim()
        .split("\n")
        .filter((f) => f.length > 0 && f !== filePath);

      for (const f of files) {
        coChangeMap.set(f, (coChangeMap.get(f) ?? 0) + 1);
      }
    } catch {
      skipped.push(hash.slice(0, 8));
    }
  }

  const results = Array.from(coChangeMap.entries())
    .filter(([, count]) => count >= minCoupling)
    .sort((a, b) => b[1] - a[1])
    .map(([fp, count]) => ({
      filePath: fp,
      coChangeCount: count,
      percentage: Math.round((count / totalCommits) * 100),
    }));

  return { results, totalCommits, skipped };
}
