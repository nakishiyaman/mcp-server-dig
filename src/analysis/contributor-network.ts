import { execGit } from "../git/executor.js";

export interface ContributorEdge {
  author1: string;
  author2: string;
  sharedFiles: number;
  sharedCommits: number;
}

export interface ContributorNode {
  email: string;
  commits: number;
  files: number;
}

export interface ContributorNetworkResult {
  nodes: ContributorNode[];
  edges: ContributorEdge[];
  density: number; // edges / max possible edges
}

export interface ContributorNetworkOptions {
  since?: string;
  maxCommits?: number;
  pathPattern?: string;
  minSharedFiles?: number;
  timeoutMs?: number;
}

/**
 * Analyze contributor collaboration network.
 *
 * Builds a graph where nodes are contributors and edges connect
 * contributors who have worked on the same files.
 */
export async function analyzeContributorNetwork(
  repoPath: string,
  options: ContributorNetworkOptions = {},
): Promise<ContributorNetworkResult> {
  const {
    since,
    maxCommits = 500,
    pathPattern,
    minSharedFiles = 1,
    timeoutMs,
  } = options;

  const args = [
    "log",
    "--format=AUTHOR:%ae",
    "--name-only",
    `--max-count=${maxCommits}`,
  ];
  if (since) args.push(`--since=${since}`);
  if (pathPattern) args.push("--", pathPattern);

  const output = await execGit(args, repoPath, timeoutMs);
  if (!output.trim()) {
    return { nodes: [], edges: [], density: 0 };
  }

  // Parse: each section starts with AUTHOR:<email>, followed by file paths
  const fileAuthors = new Map<string, Set<string>>();
  const authorStats = new Map<string, { commits: number; files: Set<string> }>();

  const sections = output.split(/^AUTHOR:/m).filter((s) => s.trim().length > 0);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const email = lines[0]?.trim();
    if (!email) continue;

    const files = lines
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Update author stats
    const stats = authorStats.get(email) ?? { commits: 0, files: new Set<string>() };
    stats.commits += 1;
    for (const file of files) {
      stats.files.add(file);
    }
    authorStats.set(email, stats);

    // Update file -> authors mapping
    for (const file of files) {
      const authors = fileAuthors.get(file) ?? new Set<string>();
      authors.add(email);
      fileAuthors.set(file, authors);
    }
  }

  // Build nodes
  const nodes: ContributorNode[] = [...authorStats.entries()]
    .map(([email, stats]) => ({
      email,
      commits: stats.commits,
      files: stats.files.size,
    }))
    .sort((a, b) => b.commits - a.commits);

  // Build edges: for each file, generate edges between all authors who touched it
  const edgeMap = new Map<string, { sharedFiles: number; sharedCommits: number }>();

  for (const [, authors] of fileAuthors) {
    const authorList = [...authors].sort();
    for (let i = 0; i < authorList.length; i++) {
      for (let j = i + 1; j < authorList.length; j++) {
        const key = `${authorList[i]}::${authorList[j]}`;
        const edge = edgeMap.get(key) ?? { sharedFiles: 0, sharedCommits: 0 };
        edge.sharedFiles += 1;
        edgeMap.set(key, edge);
      }
    }
  }

  // Compute sharedCommits: count commits where both authors touched the same file in the same commit
  // Re-parse sections to track per-commit file sets per author
  const commitFilesByAuthor = new Map<string, string[][]>();
  for (const section of sections) {
    const lines = section.trim().split("\n");
    const email = lines[0]?.trim();
    if (!email) continue;

    const files = lines
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const existing = commitFilesByAuthor.get(email) ?? [];
    existing.push(files);
    commitFilesByAuthor.set(email, existing);
  }

  // For each edge, count how many commits have overlapping files from both authors
  for (const [key, edge] of edgeMap) {
    const [author1, author2] = key.split("::");
    const commits1 = commitFilesByAuthor.get(author1) ?? [];
    const commits2 = commitFilesByAuthor.get(author2) ?? [];

    let sharedCommitCount = 0;
    // For each commit by author1, check if author2 has a commit touching any of the same files
    const author2FileSet = new Set<string>();
    for (const files of commits2) {
      for (const f of files) {
        author2FileSet.add(f);
      }
    }
    for (const files of commits1) {
      if (files.some((f) => author2FileSet.has(f))) {
        sharedCommitCount++;
      }
    }
    edge.sharedCommits = sharedCommitCount;
  }

  // Filter edges by minSharedFiles and build result
  const edges: ContributorEdge[] = [];
  for (const [key, edge] of edgeMap) {
    if (edge.sharedFiles >= minSharedFiles) {
      const [author1, author2] = key.split("::");
      edges.push({
        author1,
        author2,
        sharedFiles: edge.sharedFiles,
        sharedCommits: edge.sharedCommits,
      });
    }
  }
  edges.sort((a, b) => b.sharedFiles - a.sharedFiles);

  // Compute density: actual edges / max possible edges
  const n = nodes.length;
  const maxEdges = (n * (n - 1)) / 2;
  const density = maxEdges > 0 ? edges.length / maxEdges : 0;

  return { nodes, edges, density };
}
