import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?(?:\+([\w.]+))?$/;

export interface TagEntry {
  name: string;
  date: string;
  objectType: string; // "tag" (annotated) or "commit" (lightweight)
}

interface SemverDistribution {
  major: number;
  minor: number;
  patch: number;
  preRelease: number;
  nonSemver: number;
}

interface ReleaseIntervals {
  count: number;
  meanDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
}

interface TagAnalysisResult {
  pattern: string | null;
  totalTags: number;
  semverDistribution: SemverDistribution;
  tagTypes: { annotated: number; lightweight: number };
  releaseIntervals: ReleaseIntervals | null;
  trend: string | null; // "accelerating" | "stable" | "decelerating"
  namingPrefixes: Record<string, number>;
  tags: Array<{ name: string; date: string; type: string; semver: boolean }>;
}

function classifySemverBump(
  prev: RegExpMatchArray,
  curr: RegExpMatchArray,
): "major" | "minor" | "patch" | "preRelease" {
  if (curr[4]) return "preRelease";
  if (parseInt(curr[1]) > parseInt(prev[1])) return "major";
  if (parseInt(curr[2]) > parseInt(prev[2])) return "minor";
  return "patch";
}

export function parseTags(output: string): TagEntry[] {
  const lines = output.trim().split("\n").filter((l) => l.length > 0);
  const tags: TagEntry[] = [];

  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length < 3) continue;
    tags.push({
      name: parts[0],
      date: parts[1],
      objectType: parts[2],
    });
  }

  return tags;
}

export function analyzeSemver(tags: TagEntry[]): SemverDistribution {
  const dist: SemverDistribution = {
    major: 0,
    minor: 0,
    patch: 0,
    preRelease: 0,
    nonSemver: 0,
  };

  let prevMatch: RegExpMatchArray | null = null;
  // Sort tags by semver for proper bump classification
  const semverTags = tags
    .map((t) => ({ tag: t, match: t.name.match(SEMVER_RE) }))
    .filter((t) => t.match !== null)
    .sort((a, b) => {
      const am = a.match!;
      const bm = b.match!;
      const majDiff = parseInt(am[1]) - parseInt(bm[1]);
      if (majDiff !== 0) return majDiff;
      const minDiff = parseInt(am[2]) - parseInt(bm[2]);
      if (minDiff !== 0) return minDiff;
      return parseInt(am[3]) - parseInt(bm[3]);
    });

  for (const { match } of semverTags) {
    if (match![4]) {
      dist.preRelease++;
    } else if (prevMatch) {
      const bump = classifySemverBump(prevMatch, match!);
      dist[bump]++;
    } else {
      // First semver tag — count as patch (initial release)
      dist.patch++;
    }
    if (!match![4]) prevMatch = match;
  }

  dist.nonSemver = tags.length - semverTags.length;
  return dist;
}

export function computeIntervals(tags: TagEntry[]): ReleaseIntervals | null {
  // Sort by date ascending
  const sorted = [...tags]
    .filter((t) => t.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs =
      new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
    intervals.push(Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  intervals.sort((a, b) => a - b);
  const sum = intervals.reduce((a, b) => a + b, 0);

  const medianIdx = Math.floor(intervals.length / 2);
  const median =
    intervals.length % 2 === 0
      ? Math.round((intervals[medianIdx - 1] + intervals[medianIdx]) / 2)
      : intervals[medianIdx];

  return {
    count: intervals.length,
    meanDays: Math.round(sum / intervals.length),
    medianDays: median,
    minDays: intervals[0],
    maxDays: intervals[intervals.length - 1],
  };
}

export function detectTrend(tags: TagEntry[]): string | null {
  const sorted = [...tags]
    .filter((t) => t.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 4) return null;

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs =
      new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
    intervals.push(diffMs / (1000 * 60 * 60 * 24));
  }

  // Compare first half vs second half average
  const mid = Math.floor(intervals.length / 2);
  const firstHalf = intervals.slice(0, mid);
  const secondHalf = intervals.slice(mid);

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const ratio = avgSecond / avgFirst;
  if (ratio < 0.7) return "accelerating"; // intervals shrinking = more frequent
  if (ratio > 1.3) return "decelerating"; // intervals growing = less frequent
  return "stable";
}

export function extractPrefixes(tags: TagEntry[]): Record<string, number> {
  const prefixes: Record<string, number> = {};
  for (const tag of tags) {
    const match = tag.name.match(/^([a-zA-Z]+)/);
    const prefix = match ? match[1] : "(none)";
    prefixes[prefix] = (prefixes[prefix] ?? 0) + 1;
  }
  return prefixes;
}

export function registerGitTagAnalysis(server: McpServer): void {
  server.registerTool(
    "git_tag_analysis",
    {
      description:
        "Analyze tag-based release patterns. Shows semver distribution (major/minor/patch/pre-release), annotated vs lightweight tags, release interval statistics, frequency trend (accelerating/stable/decelerating), and naming prefix distribution. Complements git_tag_list (data) with pattern analysis.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        pattern: z
          .string()
          .optional()
          .describe('Glob pattern to filter tags, e.g. "v1.*" or "release-*"'),
        timeout_ms: z
          .number()
          .int()
          .min(1000)
          .max(300000)
          .optional()
          .describe(
            "Timeout in ms for git operations (default: 30000, max: 300000)",
          ),
        output_format: outputFormatSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ repo_path, pattern, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "tag",
          "-l",
          "--sort=creatordate",
          "--format=%(refname:short)|%(creatordate:iso-strict)|%(objecttype)",
        ];
        if (pattern) args.push(pattern);

        const output = await execGit(args, repo_path, timeout_ms);
        const tags = parseTags(output);

        if (tags.length === 0) {
          const filterMsg = pattern ? ` matching "${pattern}"` : "";
          return successResponse(`No tags found${filterMsg}.`);
        }

        const semverDist = analyzeSemver(tags);
        const tagTypes = {
          annotated: tags.filter((t) => t.objectType === "tag").length,
          lightweight: tags.filter((t) => t.objectType !== "tag").length,
        };
        const intervals = computeIntervals(tags);
        const trend = detectTrend(tags);
        const prefixes = extractPrefixes(tags);

        const data: TagAnalysisResult = {
          pattern: pattern ?? null,
          totalTags: tags.length,
          semverDistribution: semverDist,
          tagTypes,
          releaseIntervals: intervals,
          trend,
          namingPrefixes: prefixes,
          tags: tags.map((t) => ({
            name: t.name,
            date: t.date,
            type: t.objectType === "tag" ? "annotated" : "lightweight",
            semver: SEMVER_RE.test(t.name),
          })),
        };

        return formatResponse(
          data,
          () => {
            const filterLabel = pattern ? ` (filter: "${pattern}")` : "";
            const lines: string[] = [
              `Tag analysis${filterLabel} — ${tags.length} tag(s)`,
              "",
            ];

            // Semver distribution
            const semverTotal =
              semverDist.major +
              semverDist.minor +
              semverDist.patch +
              semverDist.preRelease;
            lines.push("semver distribution:");
            if (semverTotal > 0) {
              lines.push(
                `  major: ${semverDist.major}  minor: ${semverDist.minor}  patch: ${semverDist.patch}  pre-release: ${semverDist.preRelease}`,
              );
            }
            if (semverDist.nonSemver > 0) {
              lines.push(`  non-semver: ${semverDist.nonSemver}`);
            }
            lines.push("");

            // Tag types
            lines.push("Tag types:");
            lines.push(
              `  annotated: ${tagTypes.annotated}  lightweight: ${tagTypes.lightweight}`,
            );
            lines.push("");

            // Release intervals
            if (intervals) {
              lines.push("Release intervals (days):");
              lines.push(
                `  mean: ${intervals.meanDays}  median: ${intervals.medianDays}  min: ${intervals.minDays}  max: ${intervals.maxDays}`,
              );
              if (trend) {
                lines.push(`  trend: ${trend}`);
              }
              lines.push("");
            }

            // Naming prefixes
            lines.push("Naming prefixes:");
            for (const [prefix, count] of Object.entries(prefixes)) {
              lines.push(`  "${prefix}": ${count}`);
            }
            lines.push("");

            // Tag list
            lines.push("Tags:");
            for (const tag of tags) {
              const type = tag.objectType === "tag" ? "annotated" : "lightweight";
              const dateStr = tag.date ? tag.date.slice(0, 10) : "N/A";
              lines.push(`  ${tag.name.padEnd(20)} ${dateStr}  ${type}`);
            }

            return lines.join("\n");
          },
          output_format,
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
