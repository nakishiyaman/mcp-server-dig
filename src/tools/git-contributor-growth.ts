import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { computeBusFactor } from "../analysis/knowledge-map.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

type PeriodType = "monthly" | "quarterly";

interface PeriodEntry {
  period: string;
  newContributors: string[];
  departedContributors: string[];
  activeContributors: string[];
  totalActive: number;
  busFactor: number;
  retentionRate: number | null;
}

type TrendDirection = "growing" | "stable" | "shrinking";

export interface ContributorGrowthResult {
  totalContributors: number;
  periods: PeriodEntry[];
  trend: TrendDirection;
  overallRetentionRate: number | null;
}

function toPeriodKey(date: Date, period: PeriodType): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (period === "quarterly") {
    const quarter = Math.ceil(month / 3);
    return `${year}-Q${quarter}`;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function determineTrend(periods: PeriodEntry[]): TrendDirection {
  if (periods.length < 2) return "stable";

  // Compare first half vs second half active counts
  const mid = Math.floor(periods.length / 2);
  const firstHalf = periods.slice(0, mid);
  const secondHalf = periods.slice(mid);

  const firstAvg =
    firstHalf.reduce((s, p) => s + p.totalActive, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((s, p) => s + p.totalActive, 0) / secondHalf.length;

  const ratio = secondAvg / firstAvg;
  if (ratio > 1.1) return "growing";
  if (ratio < 0.9) return "shrinking";
  return "stable";
}

export function registerGitContributorGrowth(server: McpServer): void {
  server.registerTool(
    "git_contributor_growth",
    {
      description:
        "Analyze contributor growth and retention over time. Tracks new/departed contributors per period (monthly or quarterly), computes retention rates, bus factor trends, and classifies overall trajectory as growing/stable/shrinking.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        period: z
          .enum(["monthly", "quarterly"])
          .optional()
          .describe("Aggregation period (default: monthly)"),
        since: z
          .string()
          .optional()
          .describe('Date filter (e.g. "2024-01-01", "1 year ago")'),
        path_pattern: z
          .string()
          .optional()
          .describe('Filter commits affecting paths matching pattern (e.g. "src/")'),
        max_commits: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Maximum number of commits to analyze (default: 10000)"),
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
      period,
      since,
      path_pattern,
      max_commits,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const periodType: PeriodType = period ?? "monthly";
        const limit = max_commits ?? 10000;

        const args = ["log", "--all", `--format=%aI%x00%aN`, `-${limit}`];
        if (since) args.push(`--since=${since}`);
        if (path_pattern) {
          args.push("--");
          args.push(path_pattern);
        }

        const raw = await execGit(args, repo_path, timeout_ms);
        const lines = raw.split("\n").filter((l) => l.trim());

        if (lines.length === 0) {
          return successResponse("No commits found matching the criteria.");
        }

        // Group authors by period
        const periodAuthors = new Map<string, Set<string>>();
        const allAuthors = new Set<string>();

        for (const line of lines) {
          const sepIdx = line.indexOf("\0");
          if (sepIdx === -1) continue;
          const dateStr = line.slice(0, sepIdx);
          const author = line.slice(sepIdx + 1);
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;

          allAuthors.add(author);
          const key = toPeriodKey(date, periodType);
          let authors = periodAuthors.get(key);
          if (!authors) {
            authors = new Set<string>();
            periodAuthors.set(key, authors);
          }
          authors.add(author);
        }

        // Sort periods chronologically
        const sortedKeys = [...periodAuthors.keys()].sort();

        // Build period entries
        const seenBefore = new Set<string>();
        const periods: PeriodEntry[] = [];
        let previousActive = new Set<string>();

        for (const key of sortedKeys) {
          const currentAuthors = periodAuthors.get(key)!;
          const activeArr = [...currentAuthors];

          const newContributors = activeArr.filter((a) => !seenBefore.has(a));
          const departedContributors = [...previousActive].filter(
            (a) => !currentAuthors.has(a),
          );

          // Retention: of authors active in previous period, how many are still active?
          let retentionRate: number | null = null;
          if (previousActive.size > 0) {
            const retained = [...previousActive].filter((a) =>
              currentAuthors.has(a),
            ).length;
            retentionRate = Math.round((retained / previousActive.size) * 100);
          }

          // Bus factor for this period
          // We need commit counts per author for this period, approximate with equal weight
          const authorCommitCounts = new Map<string, number>();
          for (const line of lines) {
            const sepIdx = line.indexOf("\0");
            if (sepIdx === -1) continue;
            const dateStr = line.slice(0, sepIdx);
            const author = line.slice(sepIdx + 1);
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) continue;
            if (toPeriodKey(date, periodType) !== key) continue;
            authorCommitCounts.set(
              author,
              (authorCommitCounts.get(author) ?? 0) + 1,
            );
          }
          const counts = [...authorCommitCounts.values()].sort((a, b) => b - a);
          const totalCommits = counts.reduce((a, b) => a + b, 0);
          const busFactor = computeBusFactor(counts, totalCommits);

          periods.push({
            period: key,
            newContributors,
            departedContributors,
            activeContributors: activeArr,
            totalActive: activeArr.length,
            busFactor,
            retentionRate,
          });

          for (const a of activeArr) seenBefore.add(a);
          previousActive = currentAuthors;
        }

        // Overall retention: across all consecutive periods
        const retentionRates = periods
          .map((p) => p.retentionRate)
          .filter((r): r is number => r !== null);
        const overallRetentionRate =
          retentionRates.length > 0
            ? Math.round(
                retentionRates.reduce((a, b) => a + b, 0) /
                  retentionRates.length,
              )
            : null;

        const trend = determineTrend(periods);

        const data: ContributorGrowthResult = {
          totalContributors: allAuthors.size,
          periods,
          trend,
          overallRetentionRate,
        };

        return formatResponse(
          data,
          () => {
            const out: string[] = [
              "Contributor Growth Analysis",
              `Total unique contributors: ${allAuthors.size}`,
              `Trend: ${trend}`,
            ];

            if (overallRetentionRate !== null) {
              out.push(`Overall retention rate: ${overallRetentionRate}%`);
            }

            out.push("");
            out.push(
              `${"Period".padEnd(10)} ${"Active".padStart(6)} ${"New".padStart(4)} ${"Left".padStart(5)} ${"BF".padStart(3)} ${"Ret%".padStart(5)}`,
            );
            out.push("-".repeat(38));

            for (const p of periods) {
              const ret =
                p.retentionRate !== null ? `${p.retentionRate}%` : "  -";
              out.push(
                `${p.period.padEnd(10)} ${String(p.totalActive).padStart(6)} ${String(p.newContributors.length).padStart(4)} ${String(p.departedContributors.length).padStart(5)} ${String(p.busFactor).padStart(3)} ${ret.padStart(5)}`,
              );
            }

            // Show new contributors per period
            const periodsWithNew = periods.filter(
              (p) => p.newContributors.length > 0,
            );
            if (periodsWithNew.length > 0) {
              out.push("");
              out.push("New contributors by period:");
              for (const p of periodsWithNew) {
                out.push(
                  `  ${p.period}: ${p.newContributors.join(", ")}`,
                );
              }
            }

            return out.join("\n");
          },
          output_format,
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
