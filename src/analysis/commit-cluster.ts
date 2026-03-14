import { execGit } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import type { CommitCluster, CommitInfo } from "../git/types.js";

export interface CommitClusterOptions {
  since?: string;
  author?: string;
  maxCommits?: number;
  timeWindowMinutes?: number;
  minSharedFiles?: number;
  pathPattern?: string;
  timeoutMs?: number;
}

export interface CommitClusterResult {
  clusters: CommitCluster[];
  totalCommits: number;
  clusteredCommits: number;
  singletonCommits: number;
}

/**
 * Cluster commits by time proximity and file similarity.
 *
 * Two commits are grouped into the same cluster if:
 * 1. They are within `timeWindowMinutes` of each other, AND
 * 2. They share at least `minSharedFiles` changed files
 *
 * Uses union-find for efficient clustering.
 */
export async function clusterCommits(
  repoPath: string,
  options: CommitClusterOptions = {},
): Promise<CommitClusterResult> {
  const {
    since,
    author,
    maxCommits = 200,
    timeWindowMinutes = 120,
    minSharedFiles = 1,
    pathPattern,
    timeoutMs,
  } = options;

  // Fetch commits with format
  const logArgs = [
    "log",
    `--format=%H|%an|%ae|%aI|%s`,
    `--max-count=${maxCommits}`,
  ];
  if (since) logArgs.push(`--since=${since}`);
  if (author) logArgs.push(`--author=${author}`);
  if (pathPattern) logArgs.push("--", pathPattern);

  const logOutput = await execGit(logArgs, repoPath, timeoutMs);
  if (!logOutput.trim()) {
    return { clusters: [], totalCommits: 0, clusteredCommits: 0, singletonCommits: 0 };
  }

  const commits = parseLogOutput(logOutput);

  // Fetch files for each commit
  const nameArgs = [
    "log",
    "--format=COMMIT:%H",
    "--name-only",
    `--max-count=${maxCommits}`,
  ];
  if (since) nameArgs.push(`--since=${since}`);
  if (author) nameArgs.push(`--author=${author}`);
  if (pathPattern) nameArgs.push("--", pathPattern);

  const nameOutput = await execGit(nameArgs, repoPath, timeoutMs);
  const commitFiles = new Map<string, Set<string>>();
  const sections = nameOutput.split(/^COMMIT:/m).filter((s) => s.trim().length > 0);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const hash = lines[0]?.trim();
    if (!hash) continue;
    const files = new Set(
      lines
        .slice(1)
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    );
    commitFiles.set(hash, files);
  }

  if (commits.length === 0) {
    return { clusters: [], totalCommits: 0, clusteredCommits: 0, singletonCommits: 0 };
  }

  // Union-Find
  const parent = new Map<number, number>();
  const rank = new Map<number, number>();

  function find(x: number): number {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: number, y: number): void {
    const px = find(x);
    const py = find(y);
    if (px === py) return;
    const rx = rank.get(px) ?? 0;
    const ry = rank.get(py) ?? 0;
    if (rx < ry) {
      parent.set(px, py);
    } else if (rx > ry) {
      parent.set(py, px);
    } else {
      parent.set(py, px);
      rank.set(px, rx + 1);
    }
  }

  for (let i = 0; i < commits.length; i++) {
    parent.set(i, i);
    rank.set(i, 0);
  }

  const timeWindowMs = timeWindowMinutes * 60 * 1000;

  // Compare pairs within time window
  for (let i = 0; i < commits.length; i++) {
    const dateI = new Date(commits[i].date).getTime();
    const filesI = commitFiles.get(commits[i].hash) ?? new Set<string>();

    for (let j = i + 1; j < commits.length; j++) {
      const dateJ = new Date(commits[j].date).getTime();

      // Since commits are sorted newest-first, once gap exceeds window we can break
      if (Math.abs(dateI - dateJ) > timeWindowMs) break;

      const filesJ = commitFiles.get(commits[j].hash) ?? new Set<string>();

      // Count shared files
      let shared = 0;
      for (const f of filesI) {
        if (filesJ.has(f)) shared++;
      }

      if (shared >= minSharedFiles) {
        union(i, j);
      }
    }
  }

  // Build clusters
  const clusterMap = new Map<number, number[]>();
  for (let i = 0; i < commits.length; i++) {
    const root = find(i);
    const group = clusterMap.get(root) ?? [];
    group.push(i);
    clusterMap.set(root, group);
  }

  const clusters: CommitCluster[] = [];
  let clusterId = 1;

  for (const [, indices] of clusterMap) {
    if (indices.length < 2) continue;

    const clusterCommits: CommitInfo[] = indices.map((i) => commits[i]);
    const dates = clusterCommits.map((c) => c.date).sort();

    // Collect shared files across the cluster
    const allFiles = new Set<string>();
    for (const c of clusterCommits) {
      const files = commitFiles.get(c.hash) ?? new Set<string>();
      for (const f of files) allFiles.add(f);
    }

    // Find files that appear in at least 2 commits of the cluster
    const fileCount = new Map<string, number>();
    for (const c of clusterCommits) {
      const files = commitFiles.get(c.hash) ?? new Set<string>();
      for (const f of files) {
        fileCount.set(f, (fileCount.get(f) ?? 0) + 1);
      }
    }
    const sharedFiles = [...fileCount.entries()]
      .filter(([, count]) => count >= 2)
      .map(([file]) => file)
      .sort();

    clusters.push({
      id: clusterId++,
      commits: clusterCommits,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      sharedFiles,
    });
  }

  // Sort clusters by start date descending
  clusters.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const clusteredCommits = clusters.reduce((sum, c) => sum + c.commits.length, 0);

  return {
    clusters,
    totalCommits: commits.length,
    clusteredCommits,
    singletonCommits: commits.length - clusteredCommits,
  };
}
