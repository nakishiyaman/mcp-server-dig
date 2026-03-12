import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateFilePath, validateGitRepo } from "../git/executor.js";
import { analyzeHotspotsAndChurn } from "../analysis/combined-log-analysis.js";
import { analyzeContributors } from "../analysis/contributors.js";
import { analyzeCoChanges } from "../analysis/co-changes.js";
import { analyzeFileStaleness } from "../analysis/staleness.js";
import { cachedAnalyzeHotspotsAndChurn, cachedAnalyzeContributors } from "../analysis/cached-analysis.js";
import {
  classifyChangeFrequency,
  classifyChurn,
  classifyKnowledgeRisk,
  classifyCoupling,
  classifyStaleness,
  overallRisk,
  riskLabel,
} from "../analysis/risk-classifiers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import type { ToolContext } from "../index.js";

function padLabel(label: string, width: number): string {
  return label.padEnd(width);
}

export function registerGitFileRiskProfile(server: McpServer, context?: ToolContext): void {
  server.tool(
    "git_file_risk_profile",
    "Comprehensive risk assessment for a single file by combining multiple analyses: change frequency, code churn, knowledge concentration, implicit coupling, and staleness. Returns a multi-dimensional risk profile to help prioritize review and refactoring efforts.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      file_path: z
        .string()
        .describe("Relative path to the file within the repo"),
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
    async ({ repo_path, file_path, since, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        const analysisOptions = { since, maxCommits: max_commits, timeoutMs: timeout_ms };

        // Run independent analyses in parallel
        // Combined hotspots+churn uses a single git log --numstat scan
        const hotspotsChurnOptions = {
          ...analysisOptions,
          hotspotsTopN: 100,
          churnTopN: 100,
        };
        const contributorOptions = {
          ...analysisOptions,
          pathPattern: file_path,
        };

        const [combined, contributorData, coChangeData, stalenessData] =
          await Promise.all([
            context
              ? cachedAnalyzeHotspotsAndChurn(context.cache, repo_path, hotspotsChurnOptions)
              : analyzeHotspotsAndChurn(repo_path, hotspotsChurnOptions),
            context
              ? cachedAnalyzeContributors(context.cache, repo_path, contributorOptions)
              : analyzeContributors(repo_path, contributorOptions),
            analyzeCoChanges(repo_path, file_path, {
              maxCommits: max_commits,
              minCoupling: 1,
              timeoutMs: timeout_ms,
            }),
            analyzeFileStaleness(repo_path, file_path),
          ]);

        const { hotspots, churn: churnFiles } = combined;

        // Extract file-specific data from repo-wide analyses
        const fileHotspot = hotspots.find((h) => h.filePath === file_path);
        const fileChurn = churnFiles.find((f) => f.filePath === file_path);

        // Classify each dimension
        const changeFreq = classifyChangeFrequency(
          fileHotspot?.changeCount ?? 0,
          hotspots,
        );
        const churn = classifyChurn(
          fileChurn?.totalChurn ?? 0,
          churnFiles,
        );
        const knowledgeRisk = classifyKnowledgeRisk(
          contributorData.stats.length,
          contributorData.stats[0]?.percentage ?? 0,
        );
        const coupling = classifyCoupling(coChangeData.results.length);
        const staleness = classifyStaleness(stalenessData.daysSinceLastChange);

        const dimensions = [changeFreq, churn, knowledgeRisk, coupling, staleness];
        const overall = overallRisk(dimensions);

        const W = 19; // label column width
        const lines = [
          `Risk profile for: ${file_path}`,
          "━".repeat(50),
          `${padLabel("Change frequency:", W)} ${changeFreq.level} (${changeFreq.detail})`,
          `${padLabel("Code churn:", W)} ${churn.level} (${churn.detail})`,
          `${padLabel("Knowledge risk:", W)} ${knowledgeRisk.level} (${knowledgeRisk.detail})`,
          `${padLabel("Coupling:", W)} ${coupling.level} (${coupling.detail})`,
          `${padLabel("Staleness:", W)} ${staleness.level} (${staleness.detail})`,
          "",
          `Overall: ${riskLabel(overall)}`,
        ];

        // Add summary explanation
        const concerns: string[] = [];
        const highDims = dimensions.filter((d) => d.level === "HIGH");
        if (highDims.length > 0) {
          if (changeFreq.level === "HIGH") concerns.push("frequently changing");
          if (churn.level === "HIGH") concerns.push("high code churn");
          if (knowledgeRisk.level === "HIGH") concerns.push("knowledge concentrated");
          if (coupling.level === "HIGH") concerns.push("highly coupled");
          if (staleness.level === "HIGH") concerns.push("stale/unmaintained");
          lines.push(`Concerns: ${concerns.join(", ")}`);
        }

        // Add top co-changed files if any
        if (coChangeData.results.length > 0) {
          const topCoChanges = coChangeData.results.slice(0, 5);
          lines.push(
            "",
            `Top co-changed files (${coChangeData.results.length} total):`,
          );
          for (const r of topCoChanges) {
            lines.push(`  ${r.coChangeCount}x (${r.percentage}%) ${r.filePath}`);
          }
        }

        // Add contributor details
        if (contributorData.stats.length > 0) {
          lines.push("", "Contributors:");
          for (const s of contributorData.stats) {
            lines.push(
              `  ${s.commitCount} commits (${s.percentage}%) ${s.name} <${s.email}> last active: ${s.lastActive}`,
            );
          }
        }

        // Next actions
        const actions: string[] = [];
        if (changeFreq.level === "HIGH" || churn.level === "HIGH") {
          actions.push(`git_file_history — ${file_path} の変更履歴を確認`);
        }
        if (knowledgeRisk.level === "HIGH") {
          actions.push(`git_knowledge_map — 知識分散の改善候補を特定`);
        }
        if (coupling.level === "HIGH") {
          actions.push(`git_dependency_map — 結合関係の詳細を確認`);
        }
        if (overall === "HIGH") {
          actions.push(`git_why — リスクの高いコード行の経緯を調査`);
        }
        if (actions.length > 0) {
          lines.push("", "Next actions:");
          for (const a of actions) {
            lines.push(`  → ${a}`);
          }
        }

        const data = {
          file: file_path,
          overallRisk: overall,
          overallScore: overall,
          dimensions: [
            { name: "changeFrequency", level: changeFreq.level, detail: changeFreq.detail },
            { name: "codeChurn", level: churn.level, detail: churn.detail },
            { name: "knowledgeRisk", level: knowledgeRisk.level, detail: knowledgeRisk.detail },
            { name: "coupling", level: coupling.level, detail: coupling.detail },
            { name: "staleness", level: staleness.level, detail: staleness.detail },
          ],
          concerns,
          contributors: contributorData.stats,
          coChangedFiles: coChangeData.results.slice(0, 5).map((r) => ({
            filePath: r.filePath,
            coChangeCount: r.coChangeCount,
            percentage: r.percentage,
          })),
          staleness: stalenessData,
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
