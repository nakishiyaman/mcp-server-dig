import { execGit } from "../git/executor.js";

export interface DirectoryKnowledge {
  directory: string;
  contributors: { email: string; commits: number; percentage: number }[];
  totalCommits: number;
  busFactor: number;
}

export interface KnowledgeMapOptions {
  depth?: number;
  since?: string;
  maxCommits?: number;
  pathPattern?: string;
  timeoutMs?: number;
}

/**
 * Analyze knowledge ownership per directory and compute bus factor.
 *
 * Bus factor = minimum number of contributors whose cumulative
 * contribution exceeds 50% of total commits for that directory.
 */
export async function analyzeKnowledgeMap(
  repoPath: string,
  options: KnowledgeMapOptions = {},
): Promise<DirectoryKnowledge[]> {
  const { depth = 1, since, maxCommits = 500, pathPattern, timeoutMs } = options;

  const args = [
    "log",
    "--format=AUTHOR:%ae",
    "--name-only",
    `--max-count=${maxCommits}`,
  ];
  if (since) args.push(`--since=${since}`);
  if (pathPattern) args.push("--", pathPattern);

  const output = await execGit(args, repoPath, timeoutMs);
  if (!output.trim()) return [];

  // Parse: each section starts with AUTHOR:<email>, followed by file paths
  const dirMap = new Map<
    string,
    Map<string, number>
  >();

  const sections = output.split(/^AUTHOR:/m).filter((s) => s.trim().length > 0);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const email = lines[0]?.trim();
    if (!email) continue;

    const files = lines
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const dirs = new Set<string>();
    for (const file of files) {
      const dir = getDirectoryAtDepth(file, depth);
      dirs.add(dir);
    }

    for (const dir of dirs) {
      const contributors = dirMap.get(dir) ?? new Map<string, number>();
      contributors.set(email, (contributors.get(email) ?? 0) + 1);
      dirMap.set(dir, contributors);
    }
  }

  const results: DirectoryKnowledge[] = [];

  for (const [directory, contributors] of dirMap) {
    const totalCommits = [...contributors.values()].reduce((a, b) => a + b, 0);
    const sorted = [...contributors.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([email, commits]) => ({
        email,
        commits,
        percentage:
          totalCommits > 0 ? Math.round((commits / totalCommits) * 100) : 0,
      }));

    const busFactor = computeBusFactor(sorted.map((c) => c.commits), totalCommits);

    results.push({
      directory,
      contributors: sorted,
      totalCommits,
      busFactor,
    });
  }

  return results.sort((a, b) => a.busFactor - b.busFactor);
}

/**
 * Extract directory at the given depth from a file path.
 * depth=1: "src/tools/foo.ts" -> "src"
 * depth=2: "src/tools/foo.ts" -> "src/tools"
 * If path has fewer segments, returns the dirname portion.
 */
export function getDirectoryAtDepth(filePath: string, depth: number): string {
  const parts = filePath.split("/");
  if (parts.length <= depth) {
    // File is at or above the requested depth, use parent dir or root
    return parts.length <= 1 ? "." : parts.slice(0, -1).join("/") || ".";
  }
  return parts.slice(0, depth).join("/");
}

/**
 * Compute bus factor: minimum number of contributors whose cumulative
 * contribution exceeds 50% of total commits.
 * Assumes counts are sorted descending.
 */
export function computeBusFactor(
  sortedCounts: number[],
  total: number,
): number {
  if (total === 0 || sortedCounts.length === 0) return 0;

  const threshold = total * 0.5;
  let cumulative = 0;

  for (let i = 0; i < sortedCounts.length; i++) {
    cumulative += sortedCounts[i];
    if (cumulative > threshold) {
      return i + 1;
    }
  }

  return sortedCounts.length;
}
