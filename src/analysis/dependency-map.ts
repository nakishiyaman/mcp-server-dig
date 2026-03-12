import { execGit } from "../git/executor.js";
import { parseNameOnlyLog } from "../git/parsers.js";

export interface DirectoryPair {
  source: string;
  target: string;
  coChangeCount: number;
  percentage: number;
}

export interface DependencyMapOptions {
  depth?: number;
  since?: string;
  maxCommits?: number;
  minCoupling?: number;
  pathPattern?: string;
  timeoutMs?: number;
}

/**
 * Analyze co-change coupling between directories/modules.
 *
 * For each commit, group changed files by directory at the given depth,
 * then count how often pairs of directories change together.
 */
export async function analyzeDependencyMap(
  repoPath: string,
  options: DependencyMapOptions = {},
): Promise<{ pairs: DirectoryPair[]; totalCommits: number }> {
  const {
    depth = 1,
    since,
    maxCommits = 500,
    minCoupling = 2,
    pathPattern,
    timeoutMs,
  } = options;

  const args = [
    "log",
    "--format=COMMIT:%H",
    "--name-only",
    `--max-count=${maxCommits}`,
  ];
  if (since) args.push(`--since=${since}`);
  if (pathPattern) args.push("--", pathPattern);

  const output = await execGit(args, repoPath, timeoutMs);
  if (!output.trim()) return { pairs: [], totalCommits: 0 };

  const commitFiles = parseNameOnlyLog(output);
  const totalCommits = commitFiles.size;

  if (totalCommits === 0) return { pairs: [], totalCommits: 0 };

  // Count co-changes between directory pairs
  const pairCounts = new Map<string, number>();

  for (const [, files] of commitFiles) {
    // Group files into directories at the specified depth
    const dirs = new Set<string>();
    for (const file of files) {
      dirs.add(getDirectoryAtDepth(file, depth));
    }

    // Count all pairs
    const dirArray = [...dirs].sort();
    for (let i = 0; i < dirArray.length; i++) {
      for (let j = i + 1; j < dirArray.length; j++) {
        const key = `${dirArray[i]}\t${dirArray[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const pairs = [...pairCounts.entries()]
    .filter(([, count]) => count >= minCoupling)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const [source, target] = key.split("\t");
      return {
        source,
        target,
        coChangeCount: count,
        percentage: Math.round((count / totalCommits) * 100),
      };
    });

  return { pairs, totalCommits };
}

/**
 * Extract directory at the given depth from a file path.
 */
function getDirectoryAtDepth(filePath: string, depth: number): string {
  const parts = filePath.split("/");
  if (parts.length <= depth) {
    return parts.length <= 1 ? "." : parts.slice(0, -1).join("/") || ".";
  }
  return parts.slice(0, depth).join("/");
}
