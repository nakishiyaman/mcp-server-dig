import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseLogOutput, parseDiffStatOutput } from "../git/parsers.js";
import { analyzeHotspotsAndChurn } from "../analysis/combined-log-analysis.js";
import { analyzeContributors } from "../analysis/contributors.js";
import { analyzeCoChanges } from "../analysis/co-changes.js";
import { errorResponse, successResponse } from "./response.js";

const MAX_RISK_FILES = 10;

export function registerGitReviewPrep(server: McpServer): void {
  server.tool(
    "git_review_prep",
    "Generate a PR review briefing by analyzing the diff between two refs. Combines diff stats, commit history, hotspot/churn analysis, contributor patterns, and co-change detection to surface risk flags, suggest reviewers, and warn about potentially missing files.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      base_ref: z
        .string()
        .describe('Base ref for comparison, e.g. "main"'),
      head_ref: z
        .string()
        .optional()
        .default("HEAD")
        .describe('Head ref for comparison (default: "HEAD")'),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(500)
        .describe("Number of commits to analyze (default: 500)"),
    },
    async ({ repo_path, base_ref, head_ref, max_commits }) => {
      try {
        await validateGitRepo(repo_path);

        // Verify refs exist
        await execGit(["rev-parse", "--verify", base_ref], repo_path);
        await execGit(["rev-parse", "--verify", head_ref], repo_path);

        // Get changed files
        const nameOnlyOutput = await execGit(
          ["diff", "--name-only", `${base_ref}...${head_ref}`],
          repo_path,
        );
        const changedFiles = nameOnlyOutput
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);

        if (changedFiles.length === 0) {
          return successResponse(
            `PR Review Briefing: ${base_ref}...${head_ref}\n${"━".repeat(40)}\n\nNo changes found between ${base_ref} and ${head_ref}.`,
          );
        }

        // Parallel: diff stat, commit list, combined hotspots+churn (single git scan)
        const [diffStatOutput, commitLogOutput, combined] =
          await Promise.all([
            execGit(
              ["diff", "--stat", `${base_ref}...${head_ref}`],
              repo_path,
            ),
            execGit(
              [
                "log",
                "--format=%H|%an|%ae|%aI|%s",
                `--max-count=${max_commits}`,
                `${base_ref}...${head_ref}`,
              ],
              repo_path,
            ),
            analyzeHotspotsAndChurn(repo_path, {
              maxCommits: max_commits,
              hotspotsTopN: 100,
              churnTopN: 100,
            }),
          ]);

        const { hotspots, churn: churnFiles } = combined;

        const diffStat = parseDiffStatOutput(diffStatOutput);
        const commits = parseLogOutput(commitLogOutput);

        // Identify risk files: changed files that are hotspots or high churn
        const riskFiles: { file: string; flags: string[] }[] = [];
        for (const file of changedFiles) {
          const flags: string[] = [];
          const hotspot = hotspots.find((h) => h.filePath === file);
          if (hotspot && hotspot.changeCount >= 5) {
            flags.push(`HOTSPOT (${hotspot.changeCount} changes)`);
          }
          const churn = churnFiles.find((f) => f.filePath === file);
          if (churn && churn.totalChurn >= 100) {
            flags.push(`HIGH CHURN (${churn.totalChurn} lines)`);
          }
          if (flags.length > 0) {
            riskFiles.push({ file, flags });
          }
        }

        // Per-file analysis for top risk files (contributors + co-changes)
        const topRiskFiles = riskFiles.slice(0, MAX_RISK_FILES);
        const changedFileSet = new Set(changedFiles);

        const perFileSettled = await Promise.allSettled(
          topRiskFiles.map(async ({ file }) => {
            const [contributors, coChanges] = await Promise.all([
              analyzeContributors(repo_path, {
                pathPattern: file,
                maxCommits: max_commits,
              }),
              analyzeCoChanges(repo_path, file, {
                maxCommits: max_commits,
                minCoupling: 2,
              }),
            ]);
            return { file, contributors, coChanges };
          }),
        );
        const perFileResults = perFileSettled.flatMap((r) =>
          r.status === "fulfilled" ? [r.value] : [],
        );

        // Collect suggested reviewers (deduplicate by email)
        const reviewerMap = new Map<
          string,
          { name: string; email: string; commits: number; files: string[] }
        >();
        for (const { file, contributors } of perFileResults) {
          for (const stat of contributors.stats) {
            const existing = reviewerMap.get(stat.email);
            if (existing) {
              existing.commits += stat.commitCount;
              existing.files.push(file);
            } else {
              reviewerMap.set(stat.email, {
                name: stat.name,
                email: stat.email,
                commits: stat.commitCount,
                files: [file],
              });
            }
          }
        }
        const suggestedReviewers = [...reviewerMap.values()]
          .sort((a, b) => b.commits - a.commits)
          .slice(0, 5);

        // Collect potentially missing files
        const missingFiles: { file: string; coChangedWith: string; percentage: number }[] = [];
        for (const { file, coChanges } of perFileResults) {
          for (const coChange of coChanges.results) {
            if (!changedFileSet.has(coChange.filePath) && coChange.percentage >= 50) {
              missingFiles.push({
                file: coChange.filePath,
                coChangedWith: file,
                percentage: coChange.percentage,
              });
            }
          }
        }
        // Deduplicate missing files by path
        const seenMissing = new Set<string>();
        const uniqueMissingFiles = missingFiles.filter((m) => {
          if (seenMissing.has(m.file)) return false;
          seenMissing.add(m.file);
          return true;
        });

        // Build output
        const lines: string[] = [
          `PR Review Briefing: ${base_ref}...${head_ref}`,
          "━".repeat(40),
          "",
          `Commits (${commits.length}):`,
        ];

        for (const c of commits) {
          lines.push(`  ${c.hash.slice(0, 7)} ${c.subject}`);
        }

        lines.push(
          "",
          `Changed files (${changedFiles.length}, +${diffStat.insertions} -${diffStat.deletions}):`,
        );
        for (const fileStat of diffStat.files) {
          lines.push(
            `  ${fileStat.path} | +${fileStat.insertions} -${fileStat.deletions}`,
          );
        }

        if (riskFiles.length > 0) {
          lines.push("", "Risk flags:");
          for (const { file, flags } of riskFiles) {
            lines.push(`  ${file} — ${flags.join(", ")}`);
          }
        }

        if (suggestedReviewers.length > 0) {
          lines.push("", "Suggested reviewers:");
          for (const r of suggestedReviewers) {
            lines.push(
              `  ${r.name} <${r.email}> — ${r.commits} commits to ${r.files.join(", ")}`,
            );
          }
        }

        if (uniqueMissingFiles.length > 0) {
          lines.push("", "Potentially missing files:");
          for (const m of uniqueMissingFiles) {
            lines.push(
              `  ${m.file} — co-changes with ${m.coChangedWith} ${m.percentage}% of the time`,
            );
          }
        }

        // Next actions
        const actions: string[] = [];
        if (riskFiles.length > 0) {
          actions.push(
            `git_file_risk_profile — リスクフラグ付きファイルの詳細リスク評価`,
          );
        }
        if (uniqueMissingFiles.length > 0) {
          actions.push(
            `git_related_changes — 変更漏れ候補ファイルの共変更パターンを確認`,
          );
        }
        if (actions.length > 0) {
          lines.push("", "Next actions:");
          for (const a of actions) {
            lines.push(`  → ${a}`);
          }
        }

        return successResponse(lines.join("\n"));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
