export interface CommitInfo {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
}

export interface BlameBlock {
  commitHash: string;
  author: string;
  email: string;
  date: string;
  summary: string;
  startLine: number;
  endLine: number;
  lines: string[];
}

export interface FileCoChange {
  filePath: string;
  coChangeCount: number;
  percentage: number;
}

export interface ContributorStats {
  name: string;
  email: string;
  commitCount: number;
  percentage: number;
  lastActive: string;
}

export interface DiffFileStat {
  path: string;
  insertions: number;
  deletions: number;
}

export interface DiffStat {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: DiffFileStat[];
}

export interface FileHotspot {
  filePath: string;
  changeCount: number;
  percentage: number;
}

export interface FileChurn {
  filePath: string;
  insertions: number;
  deletions: number;
  totalChurn: number;
  commits: number;
}

export interface StaleFile {
  filePath: string;
  lastModified: string;
  daysSinceLastChange: number;
}

export interface TagInfo {
  name: string;
  date: string;
  subject: string;
}

export interface RenameEntry {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  oldPath: string;
  newPath: string;
}

export interface CommitFrequencyBucket {
  period: string;
  commits: number;
  authors: number;
  files: number;
}

export interface ReflogEntry {
  hash: string;
  action: string;
  detail: string;
  date: string;
  message: string;
}

export interface CherryPickEntry {
  status: "equivalent" | "not-applied";
  hash: string;
  subject: string;
}

export interface LineHistoryEntry {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  diff: string;
}

export interface CommitCluster {
  id: number;
  commits: CommitInfo[];
  startDate: string;
  endDate: string;
  sharedFiles: string[];
}
