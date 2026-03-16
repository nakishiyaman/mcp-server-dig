import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { detectVelocityAnomalies, type VelocityBucket } from "../analysis/velocity-anomaly.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

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

export function registerGitVelocityAnomalies(server: McpServer): void {
  server.registerTool(
    "git_velocity_anomalies",
    {
      description: "Detect statistical anomalies (spikes and drops) in commit frequency. Unlike git_commit_frequency (distribution view), this tool applies threshold-based anomaly detection (mean ± Nσ) to surface unusual periods of activity.",
      inputSchema: {
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
        threshold_sigma: z
          .number()
          .min(0.5)
          .max(5)
          .optional()
          .default(2)
          .describe("Anomaly threshold in standard deviations (default: 2.0)"),
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
          .describe("Timeout in ms for git operations (default: 30000, max: 300000)"),
        output_format: outputFormatSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ repo_path, granularity, since, max_commits, threshold_sigma, path_pattern, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "log",
          "--format=%H|%aI",
          `--max-count=${max_commits}`,
        ];
        if (since) args.push(`--since=${since}`);
        if (path_pattern) args.push("--", path_pattern);

        const output = await execGit(args, repo_path, timeout_ms);
        const lines = output.trim().split("\n").filter((l) => l.length > 0);

        if (lines.length === 0) {
          const sinceMsg = since ? ` since ${since}` : "";
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(
            `No commits found${sinceMsg}${pathMsg}.`,
          );
        }

        // Build period buckets
        const periodMap = new Map<string, number>();

        for (const line of lines) {
          const parts = line.split("|");
          if (parts.length >= 2 && parts[0].length === 40) {
            const periodKey = formatPeriodKey(parts[1], granularity);
            periodMap.set(periodKey, (periodMap.get(periodKey) ?? 0) + 1);
          }
        }

        const sortedPeriods = Array.from(periodMap.entries())
          .sort(([a], [b]) => a.localeCompare(b));

        const buckets: VelocityBucket[] = sortedPeriods.map(([period, count]) => ({
          period,
          count,
        }));

        const anomalyResult = detectVelocityAnomalies(buckets, threshold_sigma);

        const data = {
          granularity,
          since: since ?? null,
          pathPattern: path_pattern ?? null,
          thresholdSigma: threshold_sigma,
          totalCommits: lines.length,
          totalPeriods: anomalyResult.totalBuckets,
          mean: anomalyResult.mean,
          stddev: anomalyResult.stddev,
          anomalyCount: anomalyResult.anomalies.length,
          anomalies: anomalyResult.anomalies,
        };

        return formatResponse(data, () => {
          const sinceLabel = since ? ` (since ${since})` : "";
          const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
          const header = [
            `Velocity anomaly detection — ${granularity}, threshold=${threshold_sigma}σ${sinceLabel}${pathLabel}`,
            `Total: ${lines.length} commits across ${anomalyResult.totalBuckets} periods`,
            `Statistics: mean=${anomalyResult.mean}, stddev=${anomalyResult.stddev}`,
            "",
          ];

          if (anomalyResult.anomalies.length === 0) {
            header.push("No anomalies detected within the threshold.");
            return header.join("\n");
          }

          header.push(`Anomalies detected: ${anomalyResult.anomalies.length}`);
          header.push("");

          const anomalyLines = anomalyResult.anomalies.map((a) => {
            const icon = a.direction === "spike" ? "[SPIKE]" : "[DROP]";
            return `  ${icon} ${a.period} — ${a.count} commits (${a.magnitude}σ from mean)`;
          });

          const result = [...header, ...anomalyLines];

          // Next actions
          if (anomalyResult.anomalies.length > 0) {
            result.push("");
            result.push("Next actions:");
            result.push("  → git_commit_frequency — 期間別コミット頻度の詳細を確認");
            result.push("  → git_search_commits — 異常期間のコミット内容を調査");
            result.push("  → git_commit_cluster — 異常期間の関連コミット群を分析");
          }

          return result.join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
