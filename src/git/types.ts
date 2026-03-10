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
