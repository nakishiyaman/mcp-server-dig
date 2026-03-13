import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeCoChanges } from "../analysis/co-changes.js";
import { analyzeContributors } from "../analysis/contributors.js";
import { analyzeDependencyMap } from "../analysis/dependency-map.js";
import { cachedAnalyzeContributors } from "../analysis/cached-analysis.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import type { ToolContext } from "../index.js";

interface CoChangedFile {
  filePath: string;
  coChangeCount: number;
  percentage: number;
}

interface AffectedDirectory {
  directory: string;
  fileCount: number;
  coupling: number;
}

interface ImpactAnalysisData {
  targetPath: string;
  directImpact: {
    coChangedFiles: CoChangedFile[];
    totalCoChanges: number;
  };
  indirectImpact: {
    affectedDirectories: AffectedDirectory[];
  };
  contributorOverlap: {
    sharedContributors: { name: string; email: string; commitCount: number }[];
    reviewerSuggestions: string[];
  };
  riskSummary: {
    blastRadius: "low" | "medium" | "high";
    coChangedFileCount: number;
    affectedDirectoryCount: number;
    topRiskFile: string | null;
  };
}

function classifyBlastRadius(coChangedCount: number): "low" | "medium" | "high" {
  if (coChangedCount >= 10) return "high";
  if (coChangedCount >= 3) return "medium";
  return "low";
}

export function registerGitImpactAnalysis(server: McpServer, context?: ToolContext): void {
  server.registerTool(
    "git_impact_analysis",
    {
      description: "Analyze the blast radius of changes to a file or directory. Combines co-change networks, contributor overlap, and directory coupling to assess how far changes might ripple.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      target_path: z
        .string()
        .describe("File or directory path to analyze impact for"),
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
        .describe("Maximum commits to analyze (default: 500)"),
      min_coupling: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(2)
        .describe("Minimum co-change count to include (default: 2)"),
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
    async ({ repo_path, target_path, since, max_commits, min_coupling, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Run analyses in parallel
        const [coChangeData, contributorData, depMapData] = await Promise.all([
          analyzeCoChanges(repo_path, target_path, {
            maxCommits: max_commits,
            minCoupling: min_coupling,
            timeoutMs: timeout_ms,
          }),
          context
            ? cachedAnalyzeContributors(context.cache, repo_path, {
                pathPattern: target_path,
                since,
                maxCommits: max_commits,
                timeoutMs: timeout_ms,
              })
            : analyzeContributors(repo_path, {
                pathPattern: target_path,
                since,
                maxCommits: max_commits,
                timeoutMs: timeout_ms,
              }),
          analyzeDependencyMap(repo_path, {
            since,
            maxCommits: max_commits,
            minCoupling: min_coupling,
            timeoutMs: timeout_ms,
          }),
        ]);

        // Direct impact: co-changed files
        const coChangedFiles: CoChangedFile[] = coChangeData.results.map((r) => ({
          filePath: r.filePath,
          coChangeCount: r.coChangeCount,
          percentage: r.percentage,
        }));

        // Indirect impact: affected directories from dependency map
        // Find directories that couple with the target's directory
        const targetDir = target_path.includes("/")
          ? target_path.split("/").slice(0, -1).join("/") || "."
          : ".";

        const dirCouplingMap = new Map<string, { fileCount: number; coupling: number }>();
        for (const pair of depMapData.pairs) {
          if (pair.source === targetDir || pair.target === targetDir) {
            const otherDir = pair.source === targetDir ? pair.target : pair.source;
            dirCouplingMap.set(otherDir, {
              fileCount: pair.coChangeCount,
              coupling: pair.percentage,
            });
          }
        }

        // Also aggregate co-changed files by directory
        for (const file of coChangedFiles) {
          const dir = file.filePath.includes("/")
            ? file.filePath.split("/")[0]
            : ".";
          if (dir !== targetDir && !dirCouplingMap.has(dir)) {
            dirCouplingMap.set(dir, { fileCount: 1, coupling: file.percentage });
          } else if (dir !== targetDir) {
            const existing = dirCouplingMap.get(dir)!;
            existing.fileCount++;
          }
        }

        const affectedDirectories: AffectedDirectory[] = [...dirCouplingMap.entries()]
          .sort((a, b) => b[1].coupling - a[1].coupling)
          .map(([directory, data]) => ({
            directory,
            fileCount: data.fileCount,
            coupling: data.coupling,
          }));

        // Contributor overlap
        const sharedContributors = contributorData.stats.map((s) => ({
          name: s.name,
          email: s.email,
          commitCount: s.commitCount,
        }));
        const reviewerSuggestions = sharedContributors
          .slice(0, 3)
          .map((c) => `${c.name} <${c.email}>`);

        // Risk summary
        const coChangedFileCount = coChangedFiles.length;
        const blastRadius = classifyBlastRadius(coChangedFileCount);
        const topRiskFile = coChangedFiles.length > 0 ? coChangedFiles[0].filePath : null;

        if (coChangedFileCount === 0 && affectedDirectories.length === 0) {
          return successResponse(
            `No impact detected for ${target_path}. The file may have few co-changes or limited coupling.`,
          );
        }

        const data: ImpactAnalysisData = {
          targetPath: target_path,
          directImpact: {
            coChangedFiles,
            totalCoChanges: coChangedFileCount,
          },
          indirectImpact: {
            affectedDirectories,
          },
          contributorOverlap: {
            sharedContributors,
            reviewerSuggestions,
          },
          riskSummary: {
            blastRadius,
            coChangedFileCount,
            affectedDirectoryCount: affectedDirectories.length,
            topRiskFile,
          },
        };

        return formatResponse(data, () => {
          const lines: string[] = [
            `Impact analysis for: ${target_path}`,
            "━".repeat(50),
            `Blast radius: ${blastRadius.toUpperCase()} (${coChangedFileCount} co-changed files, ${affectedDirectories.length} affected directories)`,
            "",
          ];

          // Direct impact
          if (coChangedFiles.length > 0) {
            lines.push(`Co-changed files (${coChangedFiles.length}):`);
            for (const f of coChangedFiles.slice(0, 20)) {
              lines.push(`  ${String(f.coChangeCount).padStart(3)}x (${String(f.percentage).padStart(2)}%) ${f.filePath}`);
            }
            if (coChangedFiles.length > 20) {
              lines.push(`  ... and ${coChangedFiles.length - 20} more`);
            }
            lines.push("");
          }

          // Indirect impact
          if (affectedDirectories.length > 0) {
            lines.push(`Affected directories (${affectedDirectories.length}):`);
            for (const d of affectedDirectories) {
              lines.push(`  ${d.directory}/ — ${d.fileCount} files, ${d.coupling}% coupling`);
            }
            lines.push("");
          }

          // Reviewer suggestions
          if (reviewerSuggestions.length > 0) {
            lines.push("Suggested reviewers:");
            for (const r of reviewerSuggestions) {
              lines.push(`  → ${r}`);
            }
            lines.push("");
          }

          // Next actions
          const actions: string[] = [];
          if (blastRadius === "high") {
            actions.push("git_review_prep — 変更前にPRレビューブリーフィングを確認");
          }
          if (topRiskFile) {
            actions.push(`git_file_risk_profile — ${topRiskFile} のリスク詳細を確認`);
          }
          if (actions.length > 0) {
            lines.push("Next actions:");
            for (const a of actions) {
              lines.push(`  → ${a}`);
            }
          }

          return lines.join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
