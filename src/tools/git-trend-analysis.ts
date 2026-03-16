import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeTrend } from "../analysis/trend-analysis.js";
import { cachedAnalyzeTrend } from "../analysis/cached-analysis.js";
import { errorResponse, formatResponse, outputFormatSchema } from "./response.js";
import type { ToolContext } from "../index.js";

export function registerGitTrendAnalysis(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_trend_analysis",
    {
      description: "Analyze trends over time by comparing metrics across multiple time periods. Tracks whether hotspot count, code churn, contributor count, or commit activity is improving, stable, or worsening. Useful for detecting quality trajectory changes.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        metric: z
          .enum(["hotspots", "churn", "contributors", "commit_count"])
          .describe("Metric to track: hotspots (file change count), churn (total lines changed), contributors (active contributor count), commit_count (total commits)"),
        period_length: z
          .enum(["week", "month", "quarter"])
          .optional()
          .default("month")
          .describe("Length of each period (default: month)"),
        num_periods: z
          .number()
          .int()
          .min(2)
          .max(6)
          .optional()
          .default(3)
          .describe("Number of periods to compare (2-6, default: 3)"),
        path_pattern: z
          .string()
          .optional()
          .describe("Limit analysis to files matching this path pattern"),
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
    async ({
      repo_path,
      metric,
      period_length,
      num_periods,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const analysisOptions = {
          metric,
          periodLength: period_length,
          numPeriods: num_periods,
          pathPattern: path_pattern,
          timeoutMs: timeout_ms,
        };

        const result = context
          ? await cachedAnalyzeTrend(context.cache, repo_path, analysisOptions)
          : await analyzeTrend(repo_path, analysisOptions);

        if (result.periods.every((p) => p.value === 0)) {
          const emptyMsg =
            `No ${metric} data found across ${num_periods} ${period_length} periods.` +
            (path_pattern ? ` (scope: ${path_pattern})` : "");
          const emptyData = {
            metric: result.metric,
            periodLength: result.periodLength,
            direction: result.direction,
            delta: result.delta,
            deltaPercentage: result.deltaPercentage,
            pathPattern: path_pattern ?? null,
            periods: result.periods,
          };
          return formatResponse(emptyData, () => emptyMsg, output_format);
        }

        const directionLabel = result.direction === "improving"
          ? "IMPROVING"
          : result.direction === "worsening"
            ? "WORSENING"
            : "STABLE";

        const scope = path_pattern ? `\nScope: ${path_pattern}` : "";
        const lines: string[] = [
          `Trend analysis: ${metric} (${period_length} × ${num_periods} periods)${scope}`,
          `Direction: ${directionLabel}`,
          "",
          "Period breakdown:",
        ];

        const maxLabelLen = Math.max(...result.periods.map((p) => p.label.length));
        for (const p of result.periods) {
          const label = p.label.padEnd(maxLabelLen);
          lines.push(`  ${label}  ${formatMetricValue(metric, p.value)}`);
        }

        lines.push("");
        const deltaSign = result.delta >= 0 ? "+" : "";
        const pctStr = result.deltaPercentage !== null ? ` (${deltaSign}${result.deltaPercentage}%)` : "";
        lines.push(`Change: ${deltaSign}${result.delta}${pctStr} — ${directionLabel}`);

        // Interpretation
        lines.push("");
        lines.push(interpretTrend(metric, result.direction));

        // Next actions
        if (result.direction === "worsening") {
          lines.push("");
          lines.push("Next actions:");
          if (metric === "hotspots" || metric === "churn") {
            lines.push("  → git_hotspots — 変更集中ファイルを特定");
            lines.push("  → git_file_risk_profile — リスクの高いファイルを詳細分析");
          }
          if (metric === "contributors") {
            lines.push("  → git_knowledge_loss_risk — コントリビューター減少の影響を評価");
            lines.push("  → git_knowledge_map — 知識集中度を確認");
          }
        }

        const data = {
          metric: result.metric,
          periodLength: result.periodLength,
          direction: result.direction,
          delta: result.delta,
          deltaPercentage: result.deltaPercentage,
          pathPattern: path_pattern ?? null,
          periods: result.periods,
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}

export function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case "hotspots":
      return `${value} files changed`;
    case "churn":
      return `${value.toLocaleString()} lines churned`;
    case "contributors":
      return `${value} contributors`;
    case "commit_count":
      return `${value} commits`;
    default:
      return String(value);
  }
}

export function interpretTrend(metric: string, direction: string): string {
  if (direction === "stable") {
    return `Interpretation: ${metric} is stable — no significant change between periods.`;
  }

  switch (metric) {
    case "hotspots":
      return direction === "worsening"
        ? "Interpretation: More files are being changed — code may be becoming less modular."
        : "Interpretation: Fewer files are being changed — codebase may be stabilizing.";
    case "churn":
      return direction === "worsening"
        ? "Interpretation: Code churn is increasing — more rewriting, potential quality concern."
        : "Interpretation: Code churn is decreasing — codebase may be maturing.";
    case "contributors":
      return direction === "worsening"
        ? "Interpretation: Contributor count is declining — knowledge concentration risk increasing."
        : "Interpretation: More contributors are active — knowledge distribution improving.";
    case "commit_count":
      return direction === "improving"
        ? "Interpretation: Commit activity is increasing."
        : "Interpretation: Commit activity is decreasing.";
    default:
      return `${metric}: ${direction}`;
  }
}
