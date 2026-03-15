import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeKnowledgeMap } from "../analysis/knowledge-map.js";
import { analyzeHotspotsAndChurn } from "../analysis/combined-log-analysis.js";
import { cachedAnalyzeKnowledgeMap, cachedAnalyzeHotspotsAndChurn } from "../analysis/cached-analysis.js";
import { computeCoordinationBottlenecks } from "../analysis/coordination-bottleneck.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import { riskLabel } from "../analysis/risk-classifiers.js";
import type { ToolContext } from "../index.js";

export function registerGitCoordinationBottleneck(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_coordination_bottleneck",
    {
      description: "Detect directories with high coordination cost: ranks directories by a composite score of change frequency, unique authors, and ownership distribution. High scores indicate areas where many people make frequent changes — potential merge conflict hotspots.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        since: z
          .string()
          .optional()
          .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
        depth: z
          .number()
          .int()
          .min(1)
          .max(3)
          .optional()
          .default(1)
          .describe("Directory depth for analysis (1-3, default: 1)"),
        top_n: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(10)
          .describe("Number of top directories to return (default: 10)"),
        max_commits: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(500)
          .describe("Number of commits to analyze (default: 500)"),
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
      since,
      depth,
      top_n,
      max_commits,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const commonOptions = {
          since,
          maxCommits: max_commits,
          timeoutMs: timeout_ms,
        };

        const [knowledgeMap, hotspotsResult] = await Promise.all([
          context
            ? cachedAnalyzeKnowledgeMap(context.cache, repo_path, { ...commonOptions, depth })
            : analyzeKnowledgeMap(repo_path, { ...commonOptions, depth }),
          context
            ? cachedAnalyzeHotspotsAndChurn(context.cache, repo_path, commonOptions)
            : analyzeHotspotsAndChurn(repo_path, commonOptions),
        ]);

        const results = computeCoordinationBottlenecks(
          knowledgeMap,
          hotspotsResult.hotspots,
          depth,
          top_n,
        );

        if (results.length === 0) {
          return successResponse(
            "No coordination bottlenecks found in the specified range.",
          );
        }

        const lines: string[] = [
          `Coordination bottleneck analysis (depth=${depth}, last ${max_commits} commits, top ${top_n})`,
          "",
          "Rank | Directory | Score | Authors | Changes | Dominant% | Risk",
          "─".repeat(72),
        ];

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          lines.push(
            `${String(i + 1).padStart(4)} | ${r.directory.padEnd(20)} | ` +
            `${r.coordinationScore.toFixed(0).padStart(7)} | ` +
            `${String(r.uniqueAuthors).padStart(7)} | ` +
            `${String(r.changeCount).padStart(7)} | ` +
            `${String(r.dominantAuthorPct).padStart(8)}% | ` +
            `${riskLabel(r.riskLevel)}`,
          );
        }

        lines.push("");
        lines.push("Score = changeCount × uniqueAuthors × (1 - dominantAuthorPct/100)");
        lines.push("High score = many authors making frequent changes with no dominant owner.");
        lines.push("");
        lines.push("Next actions:");
        lines.push("  → git_knowledge_map — ディレクトリ別の知識所有者を確認");
        lines.push("  → git_conflict_history — マージコンフリクトの実績を確認");
        lines.push("  → git_contributor_network — コントリビューター間の連携パターンを確認");

        const data = {
          depth,
          maxCommits: max_commits,
          topN: top_n,
          totalEntries: results.length,
          entries: results,
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
