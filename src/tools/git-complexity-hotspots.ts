import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
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
  classifyConflictFrequency,
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

interface HotspotResult {
  filePath: string;
  score: number;
  overallRisk: RiskLevel;
  dimensions: {
    changeFrequency: RiskDimension;
    codeChurn: RiskDimension;
    knowledgeRisk: RiskDimension;
    coupling: RiskDimension;
    staleness: RiskDimension;
    conflictFrequency: RiskDimension;
  };
}

export function registerGitComplexityHotspots(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_complexity_hotspots",
    {
      description: "Identify and rank maintenance complexity hotspots using a 6-dimension assessment (change frequency, code churn, knowledge concentration, coupling, staleness, conflict frequency). Extends git_refactor_candidates with merge conflict analysis for a more complete picture of maintenance burden.",
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
          .describe("Number of top hotspots to return (default: 10, max: 100)"),
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
          const emptyData = { hotspots: [], totalAnalyzed: 0 };
          return formatResponse(
            emptyData,
            () => "No complexity hotspots found (no file activity detected).",
            output_format,
          );
        }

        // Step 3: Collect merge conflict frequency data
        const mergeArgs = [
          "log",
          "--merges",
          "--format=MERGE:%H",
          "--name-only",
          "--diff-merges=first-parent",
          `--max-count=${max_commits}`,
        ];
        if (since) mergeArgs.push(`--since=${since}`);
        if (path_pattern) mergeArgs.push("--", path_pattern);

        const mergeFileCounts = new Map<string, number>();
        let totalMerges = 0;

        const mergeOutput = await execGit(mergeArgs, repo_path, timeout_ms).catch(() => "");
        if (mergeOutput.trim()) {
          const sections = mergeOutput
            .split(/^MERGE:/m)
            .filter((s) => s.trim().length > 0);

          for (const section of sections) {
            const lines = section.trim().split("\n");
            totalMerges++;
            const files = lines
              .slice(1)
              .map((l) => l.trim())
              .filter((l) => l.length > 0);
            const uniqueFiles = new Set(files);
            for (const file of uniqueFiles) {
              mergeFileCounts.set(file, (mergeFileCounts.get(file) ?? 0) + 1);
            }
          }
        }

        // Step 4: Score each candidate with 6-dimension risk classification
        const results: HotspotResult[] = [];

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
          const conflictFreq = classifyConflictFrequency(
            mergeFileCounts.get(filePath) ?? 0,
            totalMerges,
          );

          const dims = [changeFreq, churn, knowledgeRiskDim, coupling, staleness, conflictFreq];
          const overall = overallRisk(dims);
          const score = totalScore(dims);

          results.push({
            filePath,
            score,
            overallRisk: overall,
            dimensions: {
              changeFrequency: changeFreq,
              codeChurn: churn,
              knowledgeRisk: knowledgeRiskDim,
              coupling,
              staleness,
              conflictFrequency: conflictFreq,
            },
          });
        }

        // Step 5: Sort by score descending, then by file path for stability
        results.sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));

        const topResults = results.slice(0, top_n);

        // Format output
        const W = 19;
        const lines = [
          `Complexity hotspots (top ${topResults.length} of ${results.length} analyzed)`,
          "━".repeat(60),
        ];

        for (let i = 0; i < topResults.length; i++) {
          const c = topResults[i];
          const dims = c.dimensions;
          lines.push(
            "",
            `#${i + 1} ${c.filePath}`,
            `${"  Score:".padEnd(W)} ${c.score}/18 — ${riskLabel(c.overallRisk)}`,
            `${"  Change freq:".padEnd(W)} ${dims.changeFrequency.level} (${dims.changeFrequency.detail})`,
            `${"  Code churn:".padEnd(W)} ${dims.codeChurn.level} (${dims.codeChurn.detail})`,
            `${"  Knowledge:".padEnd(W)} ${dims.knowledgeRisk.level} (${dims.knowledgeRisk.detail})`,
            `${"  Coupling:".padEnd(W)} ${dims.coupling.level} (${dims.coupling.detail})`,
            `${"  Staleness:".padEnd(W)} ${dims.staleness.level} (${dims.staleness.detail})`,
            `${"  Conflicts:".padEnd(W)} ${dims.conflictFrequency.level} (${dims.conflictFrequency.detail})`,
          );
        }

        // Summary
        const highCount = topResults.filter((c) => c.overallRisk === "HIGH").length;
        const mediumCount = topResults.filter((c) => c.overallRisk === "MEDIUM").length;
        lines.push(
          "",
          "━".repeat(60),
          `Summary: ${highCount} HIGH, ${mediumCount} MEDIUM, ${topResults.length - highCount - mediumCount} LOW risk hotspots`,
        );

        if (highCount > 0) {
          lines.push(
            "",
            "Next actions:",
            "  → git_file_risk_profile — 上位候補の詳細リスクを確認",
            "  → git_why — リスクの高いコードの経緯を調査",
            "  → git_impact_analysis — リファクタリングの影響範囲を確認",
            "  → git_conflict_history — コンフリクト頻出ファイルの詳細を確認",
          );
        }

        const data = {
          hotspots: topResults.map((c) => ({
            filePath: c.filePath,
            score: c.score,
            overallRisk: c.overallRisk,
            dimensions: [
              { name: "changeFrequency", level: c.dimensions.changeFrequency.level, detail: c.dimensions.changeFrequency.detail },
              { name: "codeChurn", level: c.dimensions.codeChurn.level, detail: c.dimensions.codeChurn.detail },
              { name: "knowledgeRisk", level: c.dimensions.knowledgeRisk.level, detail: c.dimensions.knowledgeRisk.detail },
              { name: "coupling", level: c.dimensions.coupling.level, detail: c.dimensions.coupling.detail },
              { name: "staleness", level: c.dimensions.staleness.level, detail: c.dimensions.staleness.detail },
              { name: "conflictFrequency", level: c.dimensions.conflictFrequency.level, detail: c.dimensions.conflictFrequency.detail },
            ],
          })),
          totalAnalyzed: results.length,
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
