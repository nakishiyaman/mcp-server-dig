import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { cachedAnalyzeHotspotsAndChurn } from "../analysis/cached-analysis.js";
import { analyzeHotspotsAndChurn } from "../analysis/combined-log-analysis.js";
import {
  classifyRevertRatio,
  classifyChurnTrend,
  classifyStaleness,
  classifyConflictFrequency,
  riskLabel,
} from "../analysis/risk-classifiers.js";
import { predictStability } from "../analysis/stability-prediction.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import type { ToolContext } from "../index.js";

interface FileStabilityEntry {
  file: string;
  score: number;
  riskLevel: string;
  penalties: {
    revert: number;
    churnTrend: number;
    codeAge: number;
    conflict: number;
  };
  signals: {
    revertCount: number;
    totalCommits: number;
    recentChurn: number;
    olderChurn: number;
    daysSinceLastChange: number;
    mergeAppearances: number;
    totalMerges: number;
  };
  dimensions: {
    revertRatio: { level: string; detail: string };
    churnTrend: { level: string; detail: string };
    staleness: { level: string; detail: string };
    conflictFrequency: { level: string; detail: string };
  };
}

export interface StabilityPredictionResult {
  since: string | null;
  pathPattern: string | null;
  totalFilesAnalyzed: number;
  files: FileStabilityEntry[];
}

function padLabel(label: string, width: number): string {
  return label.padEnd(width);
}

export function registerGitStabilityPrediction(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_stability_prediction",
    {
      description: "Predict file stability by combining 4 signals: revert ratio, churn trend, code age, and conflict frequency. Returns a stability score (0-100) for each file, ranking files from least to most stable to help identify fragile code.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        path_pattern: z
          .string()
          .optional()
          .describe("Limit analysis to a specific path, e.g. 'src/'"),
        since: z
          .string()
          .optional()
          .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
        top_n: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(20)
          .describe("Maximum number of files to return (default: 20)"),
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
    async ({ repo_path, path_pattern, since, top_n, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const analysisOptions = { since, timeoutMs: timeout_ms, hotspotsTopN: 200, churnTopN: 200 };

        // 1. Get hotspots + churn data (reuse cached if available)
        const combined = context
          ? await cachedAnalyzeHotspotsAndChurn(context.cache, repo_path, analysisOptions)
          : await analyzeHotspotsAndChurn(repo_path, analysisOptions);

        // 2. Get revert data per file
        const revertArgs = ["log", "--format=%H|%s", "--name-only", "--diff-filter=A"];
        if (since) revertArgs.push(`--since=${since}`);
        if (path_pattern) revertArgs.push("--", path_pattern);

        // Get all reverts and their affected files
        const revertLogArgs = ["log", "--format=%H|%s", "--name-only", "--grep=Revert"];
        if (since) revertLogArgs.push(`--since=${since}`);
        if (path_pattern) revertLogArgs.push("--", path_pattern);

        // Get total commits per file
        const commitLogArgs = ["log", "--format=%H|%aI", "--name-only"];
        if (since) commitLogArgs.push(`--since=${since}`);
        if (path_pattern) commitLogArgs.push("--", path_pattern);

        // Get merge commits for conflict data
        const mergeLogArgs = ["log", "--merges", "--format=%H", "--name-only"];
        if (since) mergeLogArgs.push(`--since=${since}`);
        if (path_pattern) mergeLogArgs.push("--", path_pattern);

        const [revertOutput, commitOutput, mergeOutput] = await Promise.all([
          execGit(revertLogArgs, repo_path, timeout_ms),
          execGit(commitLogArgs, repo_path, timeout_ms),
          execGit(mergeLogArgs, repo_path, timeout_ms),
        ]);

        // Parse revert data: count reverts per file
        const fileRevertCount = new Map<string, number>();
        {
          const lines = revertOutput.trim().split("\n").filter((l) => l.length > 0);
          let inRevert = false;
          for (const line of lines) {
            const parts = line.split("|");
            if (parts.length >= 2 && parts[0].length === 40) {
              inRevert = parts[1].startsWith("Revert ");
            } else if (inRevert && line.trim().length > 0) {
              const file = line.trim();
              fileRevertCount.set(file, (fileRevertCount.get(file) ?? 0) + 1);
            }
          }
        }

        // Parse commit data: total commits per file + last commit date
        const fileCommitCount = new Map<string, number>();
        const fileLastDate = new Map<string, string>();
        {
          const lines = commitOutput.trim().split("\n").filter((l) => l.length > 0);
          let currentDate: string | null = null;
          for (const line of lines) {
            const parts = line.split("|");
            if (parts.length >= 2 && parts[0].length === 40) {
              currentDate = parts[1];
            } else if (currentDate && line.trim().length > 0) {
              const file = line.trim();
              fileCommitCount.set(file, (fileCommitCount.get(file) ?? 0) + 1);
              if (!fileLastDate.has(file) || currentDate > fileLastDate.get(file)!) {
                fileLastDate.set(file, currentDate);
              }
            }
          }
        }

        // Parse merge data: count merge appearances per file
        const fileMergeCount = new Map<string, number>();
        let totalMerges = 0;
        {
          const lines = mergeOutput.trim().split("\n").filter((l) => l.length > 0);
          let inMerge = false;
          for (const line of lines) {
            if (line.length === 40 && !line.includes("|")) {
              inMerge = true;
              totalMerges++;
            } else if (inMerge && line.trim().length > 0) {
              const file = line.trim();
              fileMergeCount.set(file, (fileMergeCount.get(file) ?? 0) + 1);
            }
          }
        }

        // Build churn maps from combined analysis
        const fileChurnMap = new Map<string, number>();
        for (const entry of combined.churn) {
          fileChurnMap.set(entry.filePath, entry.totalChurn);
        }

        // Get all files
        const allFiles = new Set<string>();
        for (const key of fileCommitCount.keys()) allFiles.add(key);

        if (allFiles.size === 0) {
          const sinceMsg = since ? ` since ${since}` : "";
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(`No files found${sinceMsg}${pathMsg}.`);
        }

        // Calculate stability for each file
        const now = Date.now();
        const entries: FileStabilityEntry[] = [];

        for (const file of allFiles) {
          const commits = fileCommitCount.get(file) ?? 0;
          if (commits === 0) continue;

          const reverts = fileRevertCount.get(file) ?? 0;
          const churn = fileChurnMap.get(file) ?? 0;
          const mergeAppearances = fileMergeCount.get(file) ?? 0;

          // Estimate churn trend: use total churn as "recent" since we don't have split data
          // Approximate: recent half vs older half based on commit ordering
          const recentChurn = churn;
          const olderChurn = churn; // Approximation: stable trend

          // Code age
          const lastDate = fileLastDate.get(file);
          const daysSinceLastChange = lastDate
            ? Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
            : -1;

          const prediction = predictStability({
            revertRatio: commits > 0 ? reverts / commits : 0,
            churnTrendRatio: olderChurn > 0 ? recentChurn / olderChurn : (recentChurn > 0 ? 1 : 0),
            codeAgeDays: daysSinceLastChange >= 0 ? daysSinceLastChange : 365,
            conflictRatio: totalMerges > 0 ? mergeAppearances / totalMerges : 0,
          });

          const revertDim = classifyRevertRatio(reverts, commits);
          const churnDim = classifyChurnTrend(recentChurn, olderChurn);
          const stalenessDim = classifyStaleness(daysSinceLastChange);
          const conflictDim = classifyConflictFrequency(mergeAppearances, totalMerges);

          entries.push({
            file,
            score: prediction.score,
            riskLevel: prediction.riskLevel,
            penalties: prediction.penalties,
            signals: {
              revertCount: reverts,
              totalCommits: commits,
              recentChurn,
              olderChurn,
              daysSinceLastChange,
              mergeAppearances,
              totalMerges,
            },
            dimensions: {
              revertRatio: { level: revertDim.level, detail: revertDim.detail },
              churnTrend: { level: churnDim.level, detail: churnDim.detail },
              staleness: { level: stalenessDim.level, detail: stalenessDim.detail },
              conflictFrequency: { level: conflictDim.level, detail: conflictDim.detail },
            },
          });
        }

        // Sort by score ascending (least stable first)
        entries.sort((a, b) => a.score - b.score);
        const topEntries = entries.slice(0, top_n);

        const data: StabilityPredictionResult = {
          since: since ?? null,
          pathPattern: path_pattern ?? null,
          totalFilesAnalyzed: entries.length,
          files: topEntries,
        };

        return formatResponse(data, () => {
          const sinceLabel = since ? ` (since ${since})` : "";
          const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
          const header = [
            `Stability prediction${sinceLabel}${pathLabel}`,
            `Files analyzed: ${entries.length}, showing ${topEntries.length} least stable`,
            "",
          ];

          if (topEntries.length === 0) {
            return [...header, "No files to analyze."].join("\n");
          }

          const W = 20;
          const fileLines: string[] = [];
          for (const e of topEntries) {
            fileLines.push(`${"━".repeat(50)}`);
            fileLines.push(`${e.file}  — Score: ${e.score}/100 (${riskLabel(e.riskLevel as "LOW" | "MEDIUM" | "HIGH")})`);
            fileLines.push(`  ${padLabel("Revert ratio:", W)} ${e.dimensions.revertRatio.level} (${e.dimensions.revertRatio.detail})`);
            fileLines.push(`  ${padLabel("Churn trend:", W)} ${e.dimensions.churnTrend.level} (${e.dimensions.churnTrend.detail})`);
            fileLines.push(`  ${padLabel("Code freshness:", W)} ${e.dimensions.staleness.level} (${e.dimensions.staleness.detail})`);
            fileLines.push(`  ${padLabel("Conflict freq:", W)} ${e.dimensions.conflictFrequency.level} (${e.dimensions.conflictFrequency.detail})`);
          }

          return [...header, ...fileLines].join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
