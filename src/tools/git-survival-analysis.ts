import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

interface SurvivalPeriod {
  period: string;
  additions: number;
  deletions: number;
  netChange: number;
  commits: number;
  churnRate: number; // deletions / (additions + deletions), 0 if no changes
}

export interface SurvivalAnalysisResult {
  granularity: string;
  since: string | null;
  pathPattern: string | null;
  totalAdditions: number;
  totalDeletions: number;
  overallChurnRate: number;
  periods: SurvivalPeriod[];
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

export function registerGitSurvivalAnalysis(server: McpServer): void {
  server.registerTool(
    "git_survival_analysis",
    {
      description: "Analyze code churn trends over time. Shows additions, deletions, net change, and churn rate per period. Useful for identifying periods of heavy refactoring, growth phases, or code instability.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      granularity: z
        .enum(["daily", "weekly", "monthly"])
        .optional()
        .default("weekly")
        .describe(
          "Time granularity: 'daily', 'weekly' (default), or 'monthly'",
        ),
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
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({
      repo_path,
      granularity,
      since,
      max_commits,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        // Use git log with numstat to get per-commit additions/deletions
        const args = [
          "log",
          "--format=COMMIT:%H|%aI",
          "--numstat",
          `--max-count=${max_commits}`,
        ];
        if (since) args.push(`--since=${since}`);
        if (path_pattern) args.push("--", path_pattern);

        const output = await execGit(args, repo_path, timeout_ms);

        if (!output.trim()) {
          const sinceMsg = since ? ` since ${since}` : "";
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(`No commits found${sinceMsg}${pathMsg}.`);
        }

        // Parse: COMMIT:<hash>|<date> followed by numstat lines (<ins>\t<del>\t<path>)
        const periodMap = new Map<
          string,
          { additions: number; deletions: number; commits: Set<string> }
        >();
        let currentDate = "";
        let currentHash = "";
        let totalAdditions = 0;
        let totalDeletions = 0;

        const lines = output.trim().split("\n");
        for (const line of lines) {
          if (line.startsWith("COMMIT:")) {
            const parts = line.slice(7).split("|");
            currentHash = parts[0];
            currentDate = parts[1] ?? "";

            if (currentDate) {
              const periodKey = formatPeriodKey(currentDate, granularity);
              if (!periodMap.has(periodKey)) {
                periodMap.set(periodKey, {
                  additions: 0,
                  deletions: 0,
                  commits: new Set(),
                });
              }
              periodMap.get(periodKey)!.commits.add(currentHash);
            }
            continue;
          }

          // numstat line: <additions>\t<deletions>\t<path>
          const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
          if (match && currentDate) {
            const ins = match[1] === "-" ? 0 : parseInt(match[1], 10);
            const del = match[2] === "-" ? 0 : parseInt(match[2], 10);
            totalAdditions += ins;
            totalDeletions += del;

            const periodKey = formatPeriodKey(currentDate, granularity);
            const bucket = periodMap.get(periodKey);
            if (bucket) {
              bucket.additions += ins;
              bucket.deletions += del;
            }
          }
        }

        if (periodMap.size === 0) {
          return successResponse("No commit data found to analyze.");
        }

        const sortedPeriods: SurvivalPeriod[] = Array.from(
          periodMap.entries(),
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, bucket]) => {
            const total = bucket.additions + bucket.deletions;
            return {
              period,
              additions: bucket.additions,
              deletions: bucket.deletions,
              netChange: bucket.additions - bucket.deletions,
              commits: bucket.commits.size,
              churnRate:
                total > 0
                  ? Math.round((bucket.deletions / total) * 100) / 100
                  : 0,
            };
          });

        const totalTotal = totalAdditions + totalDeletions;
        const overallChurnRate =
          totalTotal > 0
            ? Math.round((totalDeletions / totalTotal) * 100) / 100
            : 0;

        const data: SurvivalAnalysisResult = {
          granularity,
          since: since ?? null,
          pathPattern: path_pattern ?? null,
          totalAdditions,
          totalDeletions,
          overallChurnRate,
          periods: sortedPeriods,
        };

        return formatResponse(
          data,
          () => {
            const sinceLabel = since ? ` (since ${since})` : "";
            const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
            const header = [
              `Code churn analysis — ${granularity}${sinceLabel}${pathLabel}`,
              `Total: +${totalAdditions} -${totalDeletions} (churn rate: ${(overallChurnRate * 100).toFixed(0)}%)`,
              "",
              "  Period          Adds   Dels    Net  Commits  Churn",
            ];

            const periodLines = sortedPeriods.map(
              (p) =>
                `  ${p.period.padEnd(14)} ${String(p.additions).padStart(6)} ${String(p.deletions).padStart(6)} ${(p.netChange >= 0 ? "+" : "") + String(p.netChange).padStart(5)} ${String(p.commits).padStart(7)}  ${(p.churnRate * 100).toFixed(0)}%`,
            );

            return [...header, ...periodLines].join("\n");
          },
          output_format,
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
