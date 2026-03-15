import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { computePeriodBoundaries } from "../analysis/trend-analysis.js";
import { errorResponse, formatResponse, outputFormatSchema } from "./response.js";

type Granularity = "weekly" | "monthly" | "quarterly";

interface PeriodMergeData {
  label: string;
  since: string;
  until: string;
  mergeCount: number;
  uniqueBranches: string[];
  topBranches: { name: string; count: number }[];
  filesChanged: number;
}

interface MergeTimelineResult {
  granularity: Granularity;
  periods: PeriodMergeData[];
  totalMerges: number;
  averagePerPeriod: number;
  trend: "increasing" | "stable" | "decreasing";
}

function granularityToPeriodLength(g: Granularity): "week" | "month" | "quarter" {
  switch (g) {
    case "weekly": return "week";
    case "monthly": return "month";
    case "quarterly": return "quarter";
  }
}

function classifyTrend(periods: PeriodMergeData[]): "increasing" | "stable" | "decreasing" {
  if (periods.length < 2) return "stable";

  const first = periods[0].mergeCount;
  const last = periods[periods.length - 1].mergeCount;

  if (first === 0 && last === 0) return "stable";
  if (first === 0) return "increasing";

  const changeRatio = (last - first) / first;
  if (changeRatio > 0.1) return "increasing";
  if (changeRatio < -0.1) return "decreasing";
  return "stable";
}

export function registerGitMergeTimeline(server: McpServer): void {
  server.registerTool(
    "git_merge_timeline",
    {
      description: "Analyze merge frequency over time. Shows merge counts, branch activity, and trend direction per period (weekly/monthly/quarterly). Useful for understanding integration patterns and team collaboration rhythm.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        granularity: z
          .enum(["weekly", "monthly", "quarterly"])
          .optional()
          .default("monthly")
          .describe("Time period granularity (default: monthly)"),
        num_periods: z
          .number()
          .int()
          .min(1)
          .max(24)
          .optional()
          .default(6)
          .describe("Number of periods to analyze (default: 6, max: 24)"),
        path_pattern: z
          .string()
          .optional()
          .describe('Filter to a specific path, e.g. "src/"'),
        since: z
          .string()
          .optional()
          .describe('Override start date, e.g. "2024-01-01"'),
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
    async ({ repo_path, granularity, num_periods, path_pattern, since, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const periodLength = granularityToPeriodLength(granularity);
        const boundaries = computePeriodBoundaries(periodLength, num_periods);

        const periods: PeriodMergeData[] = [];

        for (const boundary of boundaries) {
          // Get merge commits in this period
          const effectiveSince = since && since > boundary.since ? since : boundary.since;

          const args = [
            "log",
            "--merges",
            "--format=%H|%s",
            `--since=${effectiveSince}`,
            `--until=${boundary.until}`,
          ];
          if (path_pattern) args.push("--", path_pattern);

          const output = await execGit(args, repo_path, timeout_ms).catch(() => "");
          const lines = output.trim().split("\n").filter((l) => l.length > 0);

          // Parse branch names from merge commit subjects
          const branchCounts = new Map<string, number>();
          for (const line of lines) {
            const subject = line.split("|").slice(1).join("|");
            const branchMatch = subject.match(/Merge (?:pull request #\d+ from |branch '?)(\S+)/);
            const branchName = branchMatch?.[1]?.replace(/'$/, "") ?? "unknown";
            branchCounts.set(branchName, (branchCounts.get(branchName) ?? 0) + 1);
          }

          // Get files changed in merge commits for this period
          let filesChanged = 0;
          if (lines.length > 0) {
            const fileArgs = [
              "log",
              "--merges",
              "--name-only",
              "--format=",
              "--diff-merges=first-parent",
              `--since=${effectiveSince}`,
              `--until=${boundary.until}`,
            ];
            if (path_pattern) fileArgs.push("--", path_pattern);

            const fileOutput = await execGit(fileArgs, repo_path, timeout_ms).catch(() => "");
            const uniqueFiles = new Set(
              fileOutput.trim().split("\n").map((l) => l.trim()).filter((l) => l.length > 0),
            );
            filesChanged = uniqueFiles.size;
          }

          const topBranches = [...branchCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

          periods.push({
            label: boundary.label,
            since: boundary.since,
            until: boundary.until,
            mergeCount: lines.length,
            uniqueBranches: [...branchCounts.keys()],
            topBranches,
            filesChanged,
          });
        }

        const totalMerges = periods.reduce((sum, p) => sum + p.mergeCount, 0);
        const averagePerPeriod = periods.length > 0
          ? Math.round((totalMerges / periods.length) * 10) / 10
          : 0;
        const trend = classifyTrend(periods);

        if (totalMerges === 0) {
          const emptyData: MergeTimelineResult = {
            granularity,
            periods: [],
            totalMerges: 0,
            averagePerPeriod: 0,
            trend: "stable",
          };
          return formatResponse(
            emptyData,
            () => "No merge commits found in the analyzed period.",
            output_format,
          );
        }

        const data: MergeTimelineResult = {
          granularity,
          periods,
          totalMerges,
          averagePerPeriod,
          trend,
        };

        return formatResponse(
          data,
          () => {
            const trendIcon = trend === "increasing" ? "↑" : trend === "decreasing" ? "↓" : "→";
            const lines: string[] = [
              `Merge timeline (${granularity}, ${periods.length} periods)`,
              "━".repeat(60),
              "",
            ];

            for (const p of periods) {
              const branchInfo = p.topBranches.length > 0
                ? ` | branches: ${p.topBranches.map((b) => b.name).join(", ")}`
                : "";
              lines.push(
                `${p.label}: ${p.mergeCount} merges, ${p.filesChanged} files${branchInfo}`,
              );
            }

            lines.push(
              "",
              "━".repeat(60),
              `Total: ${totalMerges} merges | Avg: ${averagePerPeriod}/period | Trend: ${trendIcon} ${trend}`,
            );

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
