import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeAtRef } from "../analysis/ref-comparison.js";
import { cachedAnalyzeAtRef } from "../analysis/cached-analysis.js";
import { errorResponse, formatResponse, outputFormatSchema } from "./response.js";
import type { ToolContext } from "../index.js";

function formatDelta(base: number, target: number): string {
  const diff = target - base;
  if (diff === 0) return "→ (no change)";
  const sign = diff > 0 ? "+" : "";
  const pct = base > 0 ? ` (${sign}${Math.round((diff / base) * 100)}%)` : "";
  return `→ ${sign}${diff}${pct}`;
}

export function registerGitReleaseComparison(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_release_comparison",
    {
      description: "Compare repository metrics between two git refs (tags, branches, or commits). Shows how hotspots, churn, contributor count, and bus factor changed between two points in history. Useful for assessing the impact of releases, sprints, or major changes.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        base_ref: z
          .string()
          .describe("Base ref to compare from (e.g. v1.0.0, main~10, abc1234)"),
        target_ref: z
          .string()
          .describe("Target ref to compare to (e.g. v2.0.0, HEAD, def5678)"),
        path_pattern: z
          .string()
          .optional()
          .describe('Filter files by path pattern, e.g. "src/" or "*.ts"'),
        max_commits: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(500)
          .describe("Number of commits to analyze per ref (default: 500)"),
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
    async ({ repo_path, base_ref, target_ref, path_pattern, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const refOptions = {
          maxCommits: max_commits,
          pathPattern: path_pattern,
          timeoutMs: timeout_ms,
        };

        // Analyze both refs in parallel
        const [baseMetrics, targetMetrics] = await Promise.all([
          context
            ? cachedAnalyzeAtRef(context.cache, repo_path, base_ref, refOptions)
            : analyzeAtRef(repo_path, base_ref, refOptions),
          context
            ? cachedAnalyzeAtRef(context.cache, repo_path, target_ref, refOptions)
            : analyzeAtRef(repo_path, target_ref, refOptions),
        ]);

        const W = 24;
        const lines = [
          `Release comparison: ${base_ref} → ${target_ref}`,
          "━".repeat(60),
          "",
          "Metric".padEnd(W) + base_ref.padEnd(12) + target_ref.padEnd(12) + "Delta",
          "─".repeat(60),
          `${"Hotspot files:".padEnd(W)}${String(baseMetrics.hotspotCount).padEnd(12)}${String(targetMetrics.hotspotCount).padEnd(12)}${formatDelta(baseMetrics.hotspotCount, targetMetrics.hotspotCount)}`,
          `${"Total churn:".padEnd(W)}${String(baseMetrics.totalChurn).padEnd(12)}${String(targetMetrics.totalChurn).padEnd(12)}${formatDelta(baseMetrics.totalChurn, targetMetrics.totalChurn)}`,
          `${"Active contributors:".padEnd(W)}${String(baseMetrics.activeContributors).padEnd(12)}${String(targetMetrics.activeContributors).padEnd(12)}${formatDelta(baseMetrics.activeContributors, targetMetrics.activeContributors)}`,
          `${"Avg bus factor:".padEnd(W)}${String(baseMetrics.avgBusFactor).padEnd(12)}${String(targetMetrics.avgBusFactor).padEnd(12)}${formatDelta(baseMetrics.avgBusFactor, targetMetrics.avgBusFactor)}`,
        ];

        // Show top hotspots at target ref
        if (targetMetrics.topHotspots.length > 0) {
          lines.push(
            "",
            `Top hotspots at ${target_ref}:`,
          );
          for (const h of targetMetrics.topHotspots.slice(0, 5)) {
            lines.push(`  ${h.changeCount}x ${h.filePath}`);
          }
        }

        // Assessment
        const churnDelta = targetMetrics.totalChurn - baseMetrics.totalChurn;
        const contributorDelta = targetMetrics.activeContributors - baseMetrics.activeContributors;
        const busFactorDelta = targetMetrics.avgBusFactor - baseMetrics.avgBusFactor;

        const assessments: string[] = [];
        if (churnDelta > 0) assessments.push("churn increased (more volatility)");
        if (churnDelta < 0) assessments.push("churn decreased (more stability)");
        if (contributorDelta > 0) assessments.push("contributor base grew");
        if (contributorDelta < 0) assessments.push("contributor base shrank");
        if (busFactorDelta > 0) assessments.push("bus factor improved");
        if (busFactorDelta < 0) assessments.push("bus factor decreased (higher risk)");

        if (assessments.length > 0) {
          lines.push("", "Assessment:");
          for (const a of assessments) {
            lines.push(`  • ${a}`);
          }
        }

        const data = {
          baseRef: base_ref,
          targetRef: target_ref,
          base: baseMetrics,
          target: targetMetrics,
          delta: {
            hotspotCount: targetMetrics.hotspotCount - baseMetrics.hotspotCount,
            totalChurn: churnDelta,
            activeContributors: contributorDelta,
            avgBusFactor: Math.round(busFactorDelta * 10) / 10,
          },
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
