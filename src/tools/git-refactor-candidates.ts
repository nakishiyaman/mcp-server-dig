import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
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
  type RiskLevel,
  type RiskDimension,
} from "../analysis/risk-classifiers.js";
import { errorResponse, formatResponse, outputFormatSchema } from "./response.js";
import type { ToolContext } from "../index.js";

function riskScore(level: RiskLevel): number {
  switch (level) {
    case "HIGH": return 3;
    case "MEDIUM": return 2;
    case "LOW": return 1;
  }
}

function totalScore(dimensions: RiskDimension[]): number {
  return dimensions.reduce((sum, d) => sum + riskScore(d.level), 0);
}

interface CandidateResult {
  filePath: string;
  score: number;
  overallRisk: RiskLevel;
  dimensions: {
    changeFrequency: RiskDimension;
    codeChurn: RiskDimension;
    knowledgeRisk: RiskDimension;
    coupling: RiskDimension;
    staleness: RiskDimension;
  };
}

export function registerGitRefactorCandidates(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_refactor_candidates",
    {
      description: "Identify and rank refactoring candidates across the repository using a 5-dimension risk assessment (change frequency, code churn, knowledge concentration, coupling, staleness). Returns a prioritized list of files that would benefit most from refactoring.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
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
        top_n: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(10)
          .describe("Number of top candidates to return (default: 10, max: 100)"),
        path_pattern: z
          .string()
          .optional()
          .describe('Filter files by path pattern, e.g. "src/" or "*.ts"'),
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
    async ({ repo_path, since, max_commits, top_n, path_pattern, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const hotspotsChurnOptions = {
          since,
          maxCommits: max_commits,
          hotspotsTopN: 100,
          churnTopN: 100,
          timeoutMs: timeout_ms,
          pathPattern: path_pattern,
        };

        // Step 1: Get hotspots + churn repo-wide
        const combined = context
          ? await cachedAnalyzeHotspotsAndChurn(context.cache, repo_path, hotspotsChurnOptions)
          : await analyzeHotspotsAndChurn(repo_path, hotspotsChurnOptions);

        const { hotspots, churn: churnFiles } = combined;

        // Step 2: Build candidate set from union of top hotspots and churn files
        const candidateSet = new Set<string>();
        for (const h of hotspots) candidateSet.add(h.filePath);
        for (const c of churnFiles) candidateSet.add(c.filePath);

        if (candidateSet.size === 0) {
          const emptyData = { candidates: [], totalAnalyzed: 0 };
          return formatResponse(
            emptyData,
            () => "No refactoring candidates found (no file activity detected).",
            output_format,
          );
        }

        // Step 3: Score each candidate with 5-dimension risk classification
        const candidates: CandidateResult[] = [];

        for (const filePath of candidateSet) {
          const contributorOptions = {
            since,
            maxCommits: max_commits,
            pathPattern: filePath,
            timeoutMs: timeout_ms,
          };

          const [contributorData, coChangeData, stalenessData] =
            await Promise.all([
              context
                ? cachedAnalyzeContributors(context.cache, repo_path, contributorOptions)
                : analyzeContributors(repo_path, contributorOptions),
              analyzeCoChanges(repo_path, filePath, {
                maxCommits: max_commits,
                minCoupling: 1,
                timeoutMs: timeout_ms,
              }),
              analyzeFileStaleness(repo_path, filePath),
            ]);

          const fileHotspot = hotspots.find((h) => h.filePath === filePath);
          const fileChurn = churnFiles.find((f) => f.filePath === filePath);

          const changeFreq = classifyChangeFrequency(
            fileHotspot?.changeCount ?? 0,
            hotspots,
          );
          const churn = classifyChurn(
            fileChurn?.totalChurn ?? 0,
            churnFiles,
          );
          const knowledgeRiskDim = classifyKnowledgeRisk(
            contributorData.stats.length,
            contributorData.stats[0]?.percentage ?? 0,
          );
          const coupling = classifyCoupling(coChangeData.results.length);
          const staleness = classifyStaleness(stalenessData.daysSinceLastChange);

          const dims = [changeFreq, churn, knowledgeRiskDim, coupling, staleness];
          const overall = overallRisk(dims);
          const score = totalScore(dims);

          candidates.push({
            filePath,
            score,
            overallRisk: overall,
            dimensions: {
              changeFrequency: changeFreq,
              codeChurn: churn,
              knowledgeRisk: knowledgeRiskDim,
              coupling,
              staleness,
            },
          });
        }

        // Step 4: Sort by score descending, then by file path for stability
        candidates.sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));

        const topCandidates = candidates.slice(0, top_n);

        // Format output
        const W = 19;
        const lines = [
          `Refactoring candidates (top ${topCandidates.length} of ${candidates.length} analyzed)`,
          "━".repeat(60),
        ];

        for (let i = 0; i < topCandidates.length; i++) {
          const c = topCandidates[i];
          const dims = c.dimensions;
          lines.push(
            "",
            `#${i + 1} ${c.filePath}`,
            `${"  Score:".padEnd(W)} ${c.score}/15 — ${riskLabel(c.overallRisk)}`,
            `${"  Change freq:".padEnd(W)} ${dims.changeFrequency.level} (${dims.changeFrequency.detail})`,
            `${"  Code churn:".padEnd(W)} ${dims.codeChurn.level} (${dims.codeChurn.detail})`,
            `${"  Knowledge:".padEnd(W)} ${dims.knowledgeRisk.level} (${dims.knowledgeRisk.detail})`,
            `${"  Coupling:".padEnd(W)} ${dims.coupling.level} (${dims.coupling.detail})`,
            `${"  Staleness:".padEnd(W)} ${dims.staleness.level} (${dims.staleness.detail})`,
          );
        }

        // Summary
        const highCount = topCandidates.filter((c) => c.overallRisk === "HIGH").length;
        const mediumCount = topCandidates.filter((c) => c.overallRisk === "MEDIUM").length;
        lines.push(
          "",
          "━".repeat(60),
          `Summary: ${highCount} HIGH, ${mediumCount} MEDIUM, ${topCandidates.length - highCount - mediumCount} LOW risk candidates`,
        );

        if (highCount > 0) {
          lines.push(
            "",
            "Next actions:",
            "  → git_file_risk_profile — 上位候補の詳細リスクを確認",
            "  → git_why — リスクの高いコードの経緯を調査",
            "  → git_impact_analysis — リファクタリングの影響範囲を確認",
          );
        }

        const data = {
          candidates: topCandidates.map((c) => ({
            filePath: c.filePath,
            score: c.score,
            overallRisk: c.overallRisk,
            dimensions: [
              { name: "changeFrequency", level: c.dimensions.changeFrequency.level, detail: c.dimensions.changeFrequency.detail },
              { name: "codeChurn", level: c.dimensions.codeChurn.level, detail: c.dimensions.codeChurn.detail },
              { name: "knowledgeRisk", level: c.dimensions.knowledgeRisk.level, detail: c.dimensions.knowledgeRisk.detail },
              { name: "coupling", level: c.dimensions.coupling.level, detail: c.dimensions.coupling.detail },
              { name: "staleness", level: c.dimensions.staleness.level, detail: c.dimensions.staleness.detail },
            ],
          })),
          totalAnalyzed: candidates.length,
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
