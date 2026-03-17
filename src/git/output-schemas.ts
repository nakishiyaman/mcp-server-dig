/**
 * Zod runtime schemas corresponding to types.ts interfaces.
 * Used in property tests to validate parser output structure.
 */
import { z } from "zod";

export const CommitInfoSchema = z.object({
  hash: z.string(),
  author: z.string(),
  email: z.string(),
  date: z.string(),
  subject: z.string(),
  filesChanged: z.number().optional(),
  insertions: z.number().optional(),
  deletions: z.number().optional(),
});

export const BlameBlockSchema = z.object({
  commitHash: z.string().min(1),
  author: z.string(),
  email: z.string(),
  date: z.string(),
  summary: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  lines: z.array(z.string()),
});

export const FileCoChangeSchema = z.object({
  filePath: z.string(),
  coChangeCount: z.number(),
  percentage: z.number(),
});

export const ContributorStatsSchema = z.object({
  name: z.string(),
  email: z.string(),
  commitCount: z.number(),
  percentage: z.number(),
  lastActive: z.string(),
});

export const DiffFileStatSchema = z.object({
  path: z.string(),
  insertions: z.number(),
  deletions: z.number(),
});

export const DiffStatSchema = z.object({
  filesChanged: z.number(),
  insertions: z.number().min(0),
  deletions: z.number().min(0),
  files: z.array(DiffFileStatSchema),
});

export const FileHotspotSchema = z.object({
  filePath: z.string(),
  changeCount: z.number(),
  percentage: z.number(),
});

export const FileChurnSchema = z.object({
  filePath: z.string(),
  insertions: z.number(),
  deletions: z.number(),
  totalChurn: z.number(),
  commits: z.number(),
});

export const StaleFileSchema = z.object({
  filePath: z.string(),
  lastModified: z.string(),
  daysSinceLastChange: z.number().min(0),
});

export const TagInfoSchema = z.object({
  name: z.string(),
  date: z.string(),
  subject: z.string(),
});

export const RenameEntrySchema = z.object({
  hash: z.string(),
  author: z.string(),
  email: z.string(),
  date: z.string(),
  subject: z.string(),
  oldPath: z.string(),
  newPath: z.string(),
});

export const CommitFrequencyBucketSchema = z.object({
  period: z.string(),
  commits: z.number(),
  authors: z.number(),
  files: z.number(),
});

export const ReflogEntrySchema = z.object({
  hash: z.string(),
  action: z.string(),
  detail: z.string(),
  date: z.string(),
  message: z.string(),
});

export const CherryPickEntrySchema = z.object({
  status: z.enum(["equivalent", "not-applied"]),
  hash: z.string(),
  subject: z.string(),
});

export const LineHistoryEntrySchema = z.object({
  hash: z.string(),
  author: z.string(),
  email: z.string(),
  date: z.string(),
  subject: z.string(),
  diff: z.string(),
});

export const CommitClusterSchema = z.object({
  id: z.number(),
  commits: z.array(CommitInfoSchema),
  startDate: z.string(),
  endDate: z.string(),
  sharedFiles: z.array(z.string()),
});
