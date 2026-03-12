import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

interface PeriodBucket {
  period: string;
  commits: number;
  authors: number;
  files: number;
}

export interface CommitFrequencyResult {
  granularity: string;
  since: string | null;
  pathPattern: string | null;
  totalCommits: number;
  totalAuthors: number;
  periods: PeriodBucket[];
}

function formatPeriodKey(dateStr: string, granularity: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  switch (granularity) {
    case "daily":
      return `${year}-${month}-${day}`;
    case "monthly":
      return `${year}-${month}`;
    case "weekly": {
      // ISO week: find the Monday of the week
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      d.setDate(diff);
      const wy = d.getFullYear();
      const wm = String(d.getMonth() + 1).padStart(2, "0");
      const wd = String(d.getDate()).padStart(2, "0");
      return `${wy}-${wm}-${wd}`;
    }
    default:
      return `${year}-${month}-${day}`;
  }
}

export function registerGitCommitFrequency(server: McpServer): void {
  server.tool(
    "git_commit_frequency",
    "Analyze commit frequency over time periods. Shows how active development is by grouping commits into daily, weekly, or monthly buckets. Useful for identifying development patterns, sprint rhythms, and periods of intense or quiet activity.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      granularity: z
        .enum(["daily", "weekly", "monthly"])
        .optional()
        .default("weekly")
        .describe("Time granularity: 'daily', 'weekly' (default), or 'monthly'"),
      since: z
        .string()
        .optional()
        .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1000)
        .describe("Maximum number of commits to analyze (default: 1000)"),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific path, e.g. 'src/'"),
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
    async ({ repo_path, granularity, since, max_commits, path_pattern, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "log",
          "--format=%H|%aI|%ae",
          "--name-only",
          `--max-count=${max_commits}`,
        ];
        if (since) args.push(`--since=${since}`);
        if (path_pattern) {
          args.push("--", path_pattern);
        }

        const output = await execGit(args, repo_path, timeout_ms);
        const lines = output.trim().split("\n").filter((l) => l.length > 0);

        if (lines.length === 0) {
          const sinceMsg = since ? ` since ${since}` : "";
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(
            `No commits found${sinceMsg}${pathMsg}.`,
          );
        }

        // Parse git log output: commit lines are "hash|date|email", file lines are just paths
        const periodMap = new Map<string, { commits: Set<string>; authors: Set<string>; files: Set<string> }>();
        const allAuthors = new Set<string>();
        let currentCommit: { hash: string; date: string; email: string } | null = null;
        let totalCommits = 0;

        for (const line of lines) {
          const parts = line.split("|");
          if (parts.length >= 3 && parts[0].length === 40) {
            // Commit line
            currentCommit = { hash: parts[0], date: parts[1], email: parts[2] };
            totalCommits++;
            allAuthors.add(currentCommit.email);

            const periodKey = formatPeriodKey(currentCommit.date, granularity);
            if (!periodMap.has(periodKey)) {
              periodMap.set(periodKey, { commits: new Set(), authors: new Set(), files: new Set() });
            }
            const bucket = periodMap.get(periodKey)!;
            bucket.commits.add(currentCommit.hash);
            bucket.authors.add(currentCommit.email);
          } else if (currentCommit && line.trim().length > 0) {
            // File line
            const periodKey = formatPeriodKey(currentCommit.date, granularity);
            const bucket = periodMap.get(periodKey);
            if (bucket) {
              bucket.files.add(line.trim());
            }
          }
        }

        // Sort periods chronologically
        const sortedPeriods = Array.from(periodMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, bucket]): PeriodBucket => ({
            period,
            commits: bucket.commits.size,
            authors: bucket.authors.size,
            files: bucket.files.size,
          }));

        const data: CommitFrequencyResult = {
          granularity,
          since: since ?? null,
          pathPattern: path_pattern ?? null,
          totalCommits,
          totalAuthors: allAuthors.size,
          periods: sortedPeriods,
        };

        return formatResponse(data, () => {
          const sinceLabel = since ? ` (since ${since})` : "";
          const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
          const header = [
            `Commit frequency — ${granularity}${sinceLabel}${pathLabel}`,
            `Total: ${totalCommits} commits by ${allAuthors.size} author(s)`,
            "",
          ];

          const periodLines = sortedPeriods.map((p) =>
            `  ${p.period}  ${String(p.commits).padStart(4)} commits  ${String(p.authors).padStart(2)} authors  ${String(p.files).padStart(4)} files`,
          );

          return [...header, ...periodLines].join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
