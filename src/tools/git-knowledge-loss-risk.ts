import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeKnowledgeLossRisk } from "../analysis/knowledge-loss-risk.js";
import { cachedAnalyzeKnowledgeLossRisk } from "../analysis/cached-analysis.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import type { ToolContext } from "../index.js";

export function registerGitKnowledgeLossRisk(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_knowledge_loss_risk",
    {
      description: "Assess knowledge loss risk per contributor: identifies directories where a single person owns most of the code (bus factor = 1) and estimates recovery cost if they leave. Combines knowledge map, bus factor analysis, and contributor patterns.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        target_author: z
          .string()
          .optional()
          .describe("Filter to a specific author (email substring match). If omitted, analyzes all contributors."),
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
          .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
        max_commits: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(500)
          .describe("Number of commits to analyze (default: 500)"),
        min_ownership_pct: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(30)
          .describe("Minimum ownership percentage to include a contributor (default: 30)"),
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
      target_author,
      depth,
      since,
      max_commits,
      min_ownership_pct,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const analysisOptions = {
          targetAuthor: target_author,
          depth,
          since,
          maxCommits: max_commits,
          minOwnershipPct: min_ownership_pct,
          timeoutMs: timeout_ms,
        };

        const results = context
          ? await cachedAnalyzeKnowledgeLossRisk(context.cache, repo_path, analysisOptions)
          : await analyzeKnowledgeLossRisk(repo_path, analysisOptions);

        if (results.length === 0) {
          return successResponse(
            "No knowledge loss risks found in the specified range." +
            (target_author ? ` (filter: ${target_author})` : ""),
          );
        }

        const scope = target_author ? `\nFilter: ${target_author}` : "";
        const lines: string[] = [
          `Knowledge loss risk analysis (last ${max_commits} commits, depth=${depth})${scope}`,
          `Contributors analyzed: ${results.length}`,
          "",
        ];

        for (const r of results) {
          const riskIcon = r.recoveryCost === "HIGH" ? "[HIGH RISK]" : r.recoveryCost === "MEDIUM" ? "[MEDIUM]" : "[LOW]";
          lines.push(`${riskIcon} ${r.author}`);
          lines.push(`  Directories owned: ${r.totalOwnedDirectories}, sole owner: ${r.soleOwnerDirectories}, recovery cost: ${r.recoveryCost}`);

          if (r.highRiskDirectories.length > 0) {
            lines.push("  High risk (bus factor=1, ownership>=50%):");
            for (const d of r.highRiskDirectories) {
              lines.push(`    ${d.directory}/ — ${d.ownershipPercentage}% (${d.commits}/${d.totalCommits} commits)`);
            }
          }
          if (r.mediumRiskDirectories.length > 0) {
            lines.push("  Medium risk (bus factor<=2, ownership>=50%):");
            for (const d of r.mediumRiskDirectories) {
              lines.push(`    ${d.directory}/ — ${d.ownershipPercentage}% (${d.commits}/${d.totalCommits} commits)`);
            }
          }
          if (r.lowRiskDirectories.length > 0) {
            lines.push(`  Low risk: ${r.lowRiskDirectories.length} directories`);
          }
          lines.push("");
        }

        // Next actions
        const highRiskAuthors = results.filter((r) => r.recoveryCost === "HIGH");
        if (highRiskAuthors.length > 0) {
          lines.push("Next actions:");
          lines.push("  → git_knowledge_map — ディレクトリ別の知識分散を詳細に確認");
          lines.push("  → git_contributor_patterns — 他のコントリビューターの活動パターンを確認");
          lines.push("  → git_author_timeline — 主要コントリビューターの活動期間を確認");
        }

        const data = {
          depth,
          targetAuthor: target_author ?? null,
          maxCommits: max_commits,
          minOwnershipPct: min_ownership_pct,
          totalContributors: results.length,
          contributors: results.map((r) => ({
            author: r.author,
            totalOwnedDirectories: r.totalOwnedDirectories,
            soleOwnerDirectories: r.soleOwnerDirectories,
            recoveryCost: r.recoveryCost,
            highRiskDirectories: r.highRiskDirectories,
            mediumRiskDirectories: r.mediumRiskDirectories,
            lowRiskDirectories: r.lowRiskDirectories,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
