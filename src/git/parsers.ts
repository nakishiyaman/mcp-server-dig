import type { BlameBlock, CommitInfo, ContributorStats } from "./types.js";

const LOG_SEPARATOR = "|";

export function parseLogOutput(raw: string): CommitInfo[] {
  const lines = raw.trim().split("\n").filter((l) => l.length > 0);
  const commits: CommitInfo[] = [];

  for (const line of lines) {
    const parts = line.split(LOG_SEPARATOR);
    if (parts.length < 5) continue;

    commits.push({
      hash: parts[0],
      author: parts[1],
      email: parts[2],
      date: parts[3],
      subject: parts.slice(4).join(LOG_SEPARATOR),
    });
  }

  return commits;
}

export function parseBlameOutput(raw: string): BlameBlock[] {
  const lines = raw.split("\n");
  const blocks: BlameBlock[] = [];
  let current: Partial<BlameBlock> & { lineNum?: number } = {};
  for (const line of lines) {
    if (line.length === 0) continue;

    const headerMatch = line.match(
      /^([0-9a-f]{40}) (\d+) (\d+)(?: (\d+))?$/,
    );
    if (headerMatch) {
      current.commitHash = headerMatch[1];
      current.lineNum = parseInt(headerMatch[3], 10);
      continue;
    }

    if (line.startsWith("author ")) {
      current.author = line.slice(7);
    } else if (line.startsWith("author-mail ")) {
      current.email = line.slice(12).replace(/^<|>$/g, "");
    } else if (line.startsWith("author-time ")) {
      const timestamp = parseInt(line.slice(12), 10);
      current.date = new Date(timestamp * 1000).toISOString();
    } else if (line.startsWith("summary ")) {
      current.summary = line.slice(8);
    } else if (line.startsWith("\t")) {
      const content = line.slice(1);
      const lineNum = current.lineNum ?? 0;

      // Try to merge with the last block if same commit
      const lastBlock = blocks[blocks.length - 1];
      if (
        lastBlock &&
        lastBlock.commitHash === current.commitHash &&
        lastBlock.endLine === lineNum - 1
      ) {
        lastBlock.endLine = lineNum;
        lastBlock.lines.push(content);
      } else {
        blocks.push({
          commitHash: current.commitHash ?? "",
          author: current.author ?? "",
          email: current.email ?? "",
          date: current.date ?? "",
          summary: current.summary ?? "",
          startLine: lineNum,
          endLine: lineNum,
          lines: [content],
        });
      }

      current = {};
    }
  }

  return blocks;
}

export function parseShortlogOutput(
  raw: string,
  totalCommits: number,
): ContributorStats[] {
  const lines = raw.trim().split("\n").filter((l) => l.length > 0);
  const stats: ContributorStats[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\t(.+?) <(.+?)>$/);
    if (!match) continue;

    const count = parseInt(match[1], 10);
    stats.push({
      name: match[2],
      email: match[3],
      commitCount: count,
      percentage: totalCommits > 0 ? Math.round((count / totalCommits) * 100) : 0,
      lastActive: "",
    });
  }

  return stats;
}

export function parseNameOnlyLog(raw: string): Map<string, string[]> {
  const commitFiles = new Map<string, string[]>();
  const sections = raw.split(/^COMMIT:/m).filter((s) => s.trim().length > 0);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const hash = lines[0]?.trim();
    if (!hash) continue;

    const files = lines
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    commitFiles.set(hash, files);
  }

  return commitFiles;
}
