import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeKnowledgeMap } from "../analysis/knowledge-map.js";
import { cachedAnalyzeKnowledgeMap } from "../analysis/cached-analysis.js";
import { simulateOffboarding } from "../analysis/offboarding-simulation.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import { riskLabel } from "../analysis/risk-classifiers.js";
import type { ToolContext } from "../index.js";

export function registerGitOffboardingSimulation(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_offboarding_simulation",
    {
      description: "Simulate the impact of a contributor leaving the project: recomputes bus factor per directory after removing the specified author's contributions. Identifies new single-points-of-failure and high-risk knowledge gaps.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        author: z
          .string()
          .describe("Author to simulate leaving (email substring match, case-insensitive)"),
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
        path_pattern: z
          .string()
          .optional()
          .describe("Limit analysis to files matching this path prefix"),
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
      author,
      since,
      depth,
      path_pattern,
      max_commits,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const kmOptions = {
          depth,
          since,
          maxCommits: max_commits,
          pathPattern: path_pattern,
          timeoutMs: timeout_ms,
        };

        const knowledgeMap = context
          ? await cachedAnalyzeKnowledgeMap(context.cache, repo_path, kmOptions)
          : await analyzeKnowledgeMap(repo_path, kmOptions);

        const result = simulateOffboarding(knowledgeMap, { author });

        if (result.impactedDirectories === 0) {
          return successResponse(
            `No impact found for author "${author}". ` +
            "The author may not exist in the analyzed commit range, or has no significant contributions.",
          );
        }

        const lines: string[] = [
          `Off-boarding simulation: "${author}" (depth=${depth}, last ${max_commits} commits)`,
          `Matched emails: ${result.matchedEmails.join(", ")}`,
          `Overall risk: ${riskLabel(result.overallRisk)}`,
          "",
          `Directories analyzed: ${result.totalDirectories}`,
          `Impacted directories: ${result.impactedDirectories}`,
          `New single-points-of-failure: ${result.newSinglePointOfFailure}`,
          "",
          "Directory impact (before → after):",
          "─".repeat(72),
        ];

        for (const d of result.directories) {
          const icon = d.riskLevel === "HIGH" ? "[HIGH]" : d.riskLevel === "MEDIUM" ? "[MED]" : "[LOW]";
          lines.push(
            `${icon} ${d.directory}/`,
          );
          lines.push(
            `  Bus factor: ${d.beforeBusFactor} → ${d.afterBusFactor}` +
            `  |  Contributors: ${d.beforeContributors} → ${d.afterContributors}` +
            `  |  Ownership: ${d.ownershipPct}%`,
          );
        }

        lines.push("");
        lines.push("Next actions:");
        lines.push("  → git_knowledge_map — ディレクトリ別の知識分散を詳細に確認");
        lines.push("  → git_contributor_patterns — 他のコントリビューターの活動パターンを確認");
        lines.push("  → git_knowledge_loss_risk — 著者別の知識喪失リスクを包括的に評価");

        const data = {
          targetAuthor: result.targetAuthor,
          matchedEmails: result.matchedEmails,
          overallRisk: result.overallRisk,
          depth,
          maxCommits: max_commits,
          totalDirectories: result.totalDirectories,
          impactedDirectories: result.impactedDirectories,
          newSinglePointOfFailure: result.newSinglePointOfFailure,
          directories: result.directories,
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
