import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeExpertiseDecay } from "../analysis/expertise-decay.js";
import { cachedAnalyzeExpertiseDecay } from "../analysis/cached-analysis.js";
import { riskLabel } from "../analysis/risk-classifiers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import type { ToolContext } from "../index.js";

export function registerGitExpertiseDecay(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_expertise_decay",
    {
      description: "Track expertise freshness: detect directories where dominant code owners have become inactive or are fading. Unlike git_knowledge_loss_risk (bus factor focus), this tool measures recency of contributor activity to surface knowledge decay risks.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        depth: z
          .number()
          .int()
          .min(1)
          .max(3)
          .optional()
          .default(1)
          .describe("Directory depth for knowledge map (1-3, default: 1)"),
        since: z
          .string()
          .optional()
          .describe('Date filter for knowledge map, e.g. "2024-01-01" or "6 months ago"'),
        max_commits: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(500)
          .describe("Number of commits to analyze for knowledge map (default: 500)"),
        inactivity_threshold_days: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(90)
          .describe("Days without activity to classify as inactive (default: 90)"),
        fading_threshold_days: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(30)
          .describe("Days without activity to classify as fading (default: 30)"),
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
    async ({
      repo_path,
      depth,
      since,
      max_commits,
      inactivity_threshold_days,
      fading_threshold_days,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const analysisOptions = {
          depth,
          since,
          maxCommits: max_commits,
          inactivityThresholdDays: inactivity_threshold_days,
          fadingThresholdDays: fading_threshold_days,
          pathPattern: path_pattern,
          timeoutMs: timeout_ms,
        };

        const result = context
          ? await cachedAnalyzeExpertiseDecay(context.cache, repo_path, analysisOptions)
          : await analyzeExpertiseDecay(repo_path, analysisOptions);

        if (result.entries.length === 0) {
          return successResponse(
            "No directories found for expertise decay analysis." +
            (path_pattern ? ` (path: ${path_pattern})` : ""),
          );
        }

        const lines: string[] = [
          `Expertise decay analysis (last ${max_commits} commits, depth=${depth})`,
          `Thresholds: active ≤${fading_threshold_days}d, fading ≤${inactivity_threshold_days}d, inactive >${inactivity_threshold_days}d`,
          `Directories: ${result.summary.totalDirectories} (HIGH: ${result.summary.highRisk}, MEDIUM: ${result.summary.mediumRisk}, LOW: ${result.summary.lowRisk})`,
          "",
        ];

        for (const entry of result.entries) {
          const label = riskLabel(entry.riskLevel);
          lines.push(`[${label}] ${entry.directory}/ (bus factor: ${entry.busFactor})`);

          for (const owner of entry.owners) {
            const statusIcon = owner.status === "active" ? "+" : owner.status === "fading" ? "~" : "-";
            const daysStr = owner.daysSinceLastActivity !== null
              ? `${owner.daysSinceLastActivity}d ago`
              : "unknown";
            lines.push(
              `  ${statusIcon} ${owner.email} — ${owner.percentage}% (${owner.commits} commits, last: ${daysStr}, ${owner.status})`,
            );
          }
          lines.push("");
        }

        // Next actions for high risk
        if (result.summary.highRisk > 0) {
          lines.push("Next actions:");
          lines.push("  → git_knowledge_map — ディレクトリ別の知識分散を詳細に確認");
          lines.push("  → git_author_timeline — 主要コントリビューターの活動期間を確認");
          lines.push("  → git_offboarding_simulation — 離脱シミュレーションでインパクトを確認");
        }

        const data = {
          depth,
          maxCommits: max_commits,
          inactivityThresholdDays: inactivity_threshold_days,
          fadingThresholdDays: fading_threshold_days,
          pathPattern: path_pattern ?? null,
          summary: result.summary,
          entries: result.entries.map((e) => ({
            directory: e.directory,
            busFactor: e.busFactor,
            riskLevel: e.riskLevel,
            owners: e.owners.map((o) => ({
              email: o.email,
              commits: o.commits,
              percentage: o.percentage,
              lastActivityDate: o.lastActivityDate,
              daysSinceLastActivity: o.daysSinceLastActivity,
              status: o.status,
            })),
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
