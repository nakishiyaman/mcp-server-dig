import type {
  BlameBlock,
  CommitInfo,
  ContributorStats,
  DiffFileStat,
  DiffStat,
  FileChurn,
  FileHotspot,
  StaleFile,
  TagInfo,
} from "./types.js";

const LOG_SEPARATOR = "|";

export function parseLogOutput(raw: string): CommitInfo[] {
  const lines = raw
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
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

    const headerMatch = line.match(/^([0-9a-f]{40}) (\d+) (\d+)(?: (\d+))?$/);
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

      // Skip blocks with no commit hash (malformed data)
      if (!current.commitHash) {
        current = {};
        continue;
      }

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
          commitHash: current.commitHash,
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
  const lines = raw
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
  const stats: ContributorStats[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\t(.+?) <(.+?)>$/);
    if (!match) continue;

    const count = parseInt(match[1], 10);
    stats.push({
      name: match[2],
      email: match[3],
      commitCount: count,
      percentage:
        totalCommits > 0 ? Math.round((count / totalCommits) * 100) : 0,
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

export function parseDiffStatOutput(raw: string): DiffStat {
  const lines = raw
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
  const files: DiffFileStat[] = [];
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const line of lines) {
    // Skip binary diff stat lines like: " image.png | Bin 0 -> 1234 bytes"
    if (/\|\s+Bin\s/.test(line)) continue;

    // Match file stat lines like: " src/index.ts | 5 +++--"
    const fileMatch = line.match(/^\s*(.+?)\s+\|\s+(\d+)\s*([+-]*)\s*$/);
    if (fileMatch) {
      const path = fileMatch[1].trim();
      const plusCount = (fileMatch[3].match(/\+/g) ?? []).length;
      const minusCount = (fileMatch[3].match(/-/g) ?? []).length;
      const total = parseInt(fileMatch[2], 10);

      let ins: number;
      let del: number;
      if (plusCount + minusCount > 0) {
        const ratio = total / (plusCount + minusCount);
        ins = Math.round(plusCount * ratio);
        del = Math.round(minusCount * ratio);
      } else {
        ins = total;
        del = 0;
      }

      files.push({ path, insertions: ins, deletions: del });
      continue;
    }

    // Match summary line: " 3 files changed, 10 insertions(+), 5 deletions(-)"
    const summaryMatch = line.match(
      /(\d+) files? changed(?:,\s*(\d+) insertions?\(\+\))?(?:,\s*(\d+) deletions?\(-\))?/,
    );
    if (summaryMatch) {
      totalInsertions = parseInt(summaryMatch[2] ?? "0", 10);
      totalDeletions = parseInt(summaryMatch[3] ?? "0", 10);
    }
  }

  return {
    filesChanged: files.length,
    insertions: totalInsertions,
    deletions: totalDeletions,
    files,
  };
}

export function parseFileFrequency(
  raw: string,
  topN: number = 20,
): FileHotspot[] {
  const lines = raw
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
  const counts = new Map<string, number>();

  for (const line of lines) {
    const path = line.trim();
    if (path.length === 0) continue;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  return sorted.map(([filePath, changeCount]) => ({
    filePath,
    changeCount,
    percentage: total > 0 ? Math.round((changeCount / total) * 100) : 0,
  }));
}

/**
 * Parse `git log --numstat --format=COMMIT:%H` output into per-file churn stats.
 */
export function parseNumstatOutput(
  raw: string,
  topN: number = 20,
): FileChurn[] {
  return parseCombinedNumstat(raw, { churnTopN: topN }).churn;
}

export interface CombinedNumstatResult {
  hotspots: FileHotspot[];
  churn: FileChurn[];
}

/**
 * Parse `git log --numstat --format=COMMIT:%H` output into both hotspots and churn.
 * A single numstat scan contains file paths (for frequency/hotspots) AND
 * insertions/deletions (for churn), eliminating the need for separate git calls.
 */
export function parseCombinedNumstat(
  raw: string,
  options: { hotspotsTopN?: number; churnTopN?: number } = {},
): CombinedNumstatResult {
  const { hotspotsTopN = 20, churnTopN = 20 } = options;

  const lines = raw.trim().split("\n");
  const fileMap = new Map<
    string,
    { insertions: number; deletions: number; commits: Set<string> }
  >();
  let currentHash = "";

  for (const line of lines) {
    if (line.startsWith("COMMIT:")) {
      currentHash = line.slice(7).trim();
      continue;
    }
    // numstat lines: <ins>\t<del>\t<path>  (binary files show - - path)
    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!match) continue;

    const ins = match[1] === "-" ? 0 : parseInt(match[1], 10);
    const del = match[2] === "-" ? 0 : parseInt(match[2], 10);
    const path = match[3];

    const existing = fileMap.get(path) ?? {
      insertions: 0,
      deletions: 0,
      commits: new Set<string>(),
    };
    existing.insertions += ins;
    existing.deletions += del;
    if (currentHash) existing.commits.add(currentHash);
    fileMap.set(path, existing);
  }

  // Build hotspots (sorted by commit count = change frequency)
  const totalChanges = [...fileMap.values()].reduce(
    (sum, d) => sum + d.commits.size,
    0,
  );
  const hotspots = [...fileMap.entries()]
    .map(([filePath, data]) => ({
      filePath,
      changeCount: data.commits.size,
      percentage:
        totalChanges > 0
          ? Math.round((data.commits.size / totalChanges) * 100)
          : 0,
    }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, hotspotsTopN);

  // Build churn (sorted by total churn)
  const churn = [...fileMap.entries()]
    .map(([filePath, data]) => ({
      filePath,
      insertions: data.insertions,
      deletions: data.deletions,
      totalChurn: data.insertions + data.deletions,
      commits: data.commits.size,
    }))
    .sort((a, b) => b.totalChurn - a.totalChurn)
    .slice(0, churnTopN);

  return { hotspots, churn };
}

/**
 * Parse stale file data from `git log` output.
 * Input format: lines of "ISO_DATE\tFILE_PATH"
 */
export function parseStaleFiles(
  raw: string,
  thresholdDays: number,
  now: Date = new Date(),
): StaleFile[] {
  const lines = raw
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
  const fileMap = new Map<string, string>(); // path -> most recent date

  for (const line of lines) {
    const tabIdx = line.indexOf("\t");
    if (tabIdx === -1) continue;
    const date = line.slice(0, tabIdx).trim();
    const path = line.slice(tabIdx + 1).trim();
    if (!path) continue;

    const existing = fileMap.get(path);
    if (!existing || date > existing) {
      fileMap.set(path, date);
    }
  }

  const results: StaleFile[] = [];
  const nowMs = now.getTime();

  for (const [filePath, lastModified] of fileMap) {
    const modMs = new Date(lastModified).getTime();
    const daysSinceLastChange = Math.floor(
      (nowMs - modMs) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastChange >= thresholdDays) {
      results.push({ filePath, lastModified, daysSinceLastChange });
    }
  }

  return results.sort((a, b) => b.daysSinceLastChange - a.daysSinceLastChange);
}

/**
 * Parse `git tag -l --sort=-creatordate --format=...` output.
 */
export function parseTagOutput(raw: string): TagInfo[] {
  const lines = raw
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
  const tags: TagInfo[] = [];

  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length < 2) continue;
    tags.push({
      name: parts[0],
      date: parts[1],
      subject: parts.slice(2).join("|"),
    });
  }

  return tags;
}
