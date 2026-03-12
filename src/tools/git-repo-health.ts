import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import {
  analyzeHotspotsAndChurn,
  countStaleFiles,
} from "../analysis/combined-log-analysis.js";
import { analyzeContributors } from "../analysis/contributors.js";
import { cachedAnalyzeHotspotsAndChurn, cachedAnalyzeContributors } from "../analysis/cached-analysis.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import type { ToolContext } from "../index.js";

async function getTrackedFiles(repoPath: string): Promise<string[]> {
  const output = await execGit(["ls-files"], repoPath);
  return output
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
}

async function countTotalCommits(repoPath: string, since?: string): Promise<number> {
  const args = ["rev-list", "--count", "HEAD"];
  if (since) args.push(`--since=${since}`);
  const output = await execGit(args, repoPath);
  return parseInt(output.trim(), 10);
}

export function registerGitRepoHealth(server: McpServer, context?: ToolContext): void {
  server.tool(
    "git_repo_health",
    "Repository-wide health summary combining multiple analyses into a single overview. Answers 'what is the state of this repo?' by reporting: file count, commit activity, top hotspots, highest churn files, contributor distribution, and stale file count.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      since: z
        .string()
        .optional()
        .describe(
          'Date filter for activity analysis, e.g. "2024-01-01" or "6 months ago"',
        ),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(500)
        .describe("Number of commits to analyze (default: 500)"),
      stale_threshold_days: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(180)
        .describe(
          "Days without change to consider a file stale (default: 180)",
        ),
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
    async ({ repo_path, since, max_commits, stale_threshold_days, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Single ls-files call shared by file count and stale detection
        const trackedFiles = await getTrackedFiles(repo_path);

        // Run independent analyses in parallel:
        // - Combined hotspots+churn uses a single git log --numstat scan
        // - Stale detection uses a single git log --since scan
        const [
          totalCommits,
          combined,
          contributorData,
          staleCount,
        ] = await Promise.all([
          countTotalCommits(repo_path, since),
          context
            ? cachedAnalyzeHotspotsAndChurn(context.cache, repo_path, {
                since,
                maxCommits: max_commits,
                hotspotsTopN: 10,
                churnTopN: 10,
                timeoutMs: timeout_ms,
              })
            : analyzeHotspotsAndChurn(repo_path, {
                since,
                maxCommits: max_commits,
                hotspotsTopN: 10,
                churnTopN: 10,
                timeoutMs: timeout_ms,
              }),
          context
            ? cachedAnalyzeContributors(context.cache, repo_path, { since, maxCommits: max_commits, timeoutMs: timeout_ms })
            : analyzeContributors(repo_path, { since, maxCommits: max_commits, timeoutMs: timeout_ms }),
          countStaleFiles(repo_path, trackedFiles, stale_threshold_days, timeout_ms),
        ]);

        const { hotspots, churn: churnFiles } = combined;
        const fileCount = trackedFiles.length;
        const sinceLabel = since ? ` (since ${since})` : "";
        const sections: string[] = [];

        // Overview
        sections.push(
          `Repository health summary${sinceLabel}`,
          "━".repeat(50),
          "",
          "Overview:",
          `  Tracked files:   ${fileCount}`,
          `  Total commits:   ${totalCommits}${sinceLabel}`,
          `  Contributors:    ${contributorData.stats.length}`,
          `  Stale files:     ${staleCount} (unchanged ${stale_threshold_days}+ days)`,
        );

        // Hotspots
        if (hotspots.length > 0) {
          sections.push(
            "",
            `Change hotspots (top ${hotspots.length}, last ${max_commits} commits):`,
          );
          for (const h of hotspots) {
            sections.push(
              `  ${String(h.changeCount).padStart(4)} changes (${String(h.percentage).padStart(2)}%) ${h.filePath}`,
            );
          }
        }

        // Churn
        if (churnFiles.length > 0) {
          sections.push(
            "",
            `Highest churn (top ${churnFiles.length}, last ${max_commits} commits):`,
          );
          for (const f of churnFiles) {
            sections.push(
              `  ${String(f.totalChurn).padStart(6)} churn (+${f.insertions} -${f.deletions}) in ${f.commits} commits  ${f.filePath}`,
            );
          }
        }

        // Contributors
        if (contributorData.stats.length > 0) {
          sections.push(
            "",
            `Contributors (${contributorData.stats.length}):`,
          );
          for (const s of contributorData.stats) {
            sections.push(
              `  ${s.commitCount} commits (${s.percentage}%) ${s.name} <${s.email}> last active: ${s.lastActive}`,
            );
          }

          // Knowledge risk summary
          const topPercentage = contributorData.stats[0]?.percentage ?? 0;
          if (contributorData.stats.length === 1) {
            sections.push("  ⚠ Single contributor — knowledge concentration risk");
          } else if (topPercentage >= 80) {
            sections.push(
              `  ⚠ Top contributor owns ${topPercentage}% — knowledge concentration risk`,
            );
          }
        }

        // Stale files warning
        if (staleCount > 0) {
          const stalePercentage =
            fileCount > 0 ? Math.round((staleCount / fileCount) * 100) : 0;
          sections.push(
            "",
            `Stale files: ${staleCount}/${fileCount} (${stalePercentage}%) unchanged for ${stale_threshold_days}+ days`,
          );
          if (stalePercentage >= 30) {
            sections.push(
              "  ⚠ High proportion of stale files — consider cleanup",
            );
          }
        }

        // Next actions
        const actions: string[] = [];
        if (hotspots.length > 0) {
          actions.push(
            `git_file_risk_profile — ホットスポット上位ファイルのリスク詳細を確認`,
          );
        }
        if (contributorData.stats.length <= 2) {
          actions.push(
            `git_knowledge_map — 知識集中度の詳細を確認`,
          );
        }
        if (staleCount > 0) {
          actions.push(
            `git_stale_files — 放置ファイルの一覧と最終更新日を確認`,
          );
        }
        if (actions.length > 0) {
          sections.push("", "Next actions:");
          for (const a of actions) {
            sections.push(`  → ${a}`);
          }
        }

        const data = {
          trackedFiles: fileCount,
          totalCommits,
          contributors: contributorData.stats,
          staleFiles: staleCount,
          staleThresholdDays: stale_threshold_days,
          hotspots: hotspots.map((h) => ({
            filePath: h.filePath,
            changeCount: h.changeCount,
            percentage: h.percentage,
          })),
          churn: churnFiles.map((f) => ({
            filePath: f.filePath,
            totalChurn: f.totalChurn,
            insertions: f.insertions,
            deletions: f.deletions,
            commits: f.commits,
          })),
          since: since ?? null,
        };

        return formatResponse(data, () => sections.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
