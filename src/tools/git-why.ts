import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  execGit,
  validateFilePath,
  validateGitRepo,
} from "../git/executor.js";
import { parseBlameOutput } from "../git/parsers.js";
import { analyzeContributors } from "../analysis/contributors.js";
import { cachedAnalyzeContributors } from "../analysis/cached-analysis.js";
import { analyzeCoChanges } from "../analysis/co-changes.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import type { ToolContext } from "../index.js";

export function registerGitWhy(server: McpServer, context?: ToolContext): void {
  server.tool(
    "git_why",
    "Explain why code exists by combining blame, commit context, contributor patterns, and co-change analysis into a narrative. Answers the question 'Why does this code look this way?' for a file or line range.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      file_path: z
        .string()
        .describe("Relative path to the file within the repo"),
      start_line: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Start of line range"),
      end_line: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("End of line range"),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(10)
        .describe(
          "Maximum number of commits to show in detail (default: 10)",
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
    { readOnlyHint: true, openWorldHint: false },
    async ({ repo_path, file_path, start_line, end_line, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        // Run blame
        const blameArgs = ["blame", "--porcelain"];
        if (start_line !== undefined && end_line !== undefined) {
          blameArgs.push("-L", `${start_line},${end_line}`);
        } else if (start_line !== undefined) {
          blameArgs.push("-L", `${start_line},`);
        } else if (end_line !== undefined) {
          blameArgs.push("-L", `1,${end_line}`);
        }
        blameArgs.push("--", file_path);

        const blameOutput = await execGit(blameArgs, repo_path, timeout_ms);
        const blocks = parseBlameOutput(blameOutput);

        if (blocks.length === 0) {
          return successResponse(
            `No blame data found for ${file_path}`,
          );
        }

        // Extract unique commits (ordered by first appearance, then limited)
        const seenCommits = new Set<string>();
        const uniqueCommitHashes: string[] = [];
        for (const block of blocks) {
          if (!seenCommits.has(block.commitHash)) {
            seenCommits.add(block.commitHash);
            uniqueCommitHashes.push(block.commitHash);
          }
        }
        const limitedHashes = uniqueCommitHashes.slice(0, max_commits);

        // Parallel: commit details + file-level context
        const [commitDetails, contributorData, coChangeData] =
          await Promise.all([
            Promise.all(
              limitedHashes.map(async (hash) => {
                const filesOutput = await execGit(
                  ["show", "--name-only", "--format=", hash],
                  repo_path,
                  timeout_ms,
                );
                const filesInCommit = filesOutput
                  .trim()
                  .split("\n")
                  .filter((f) => f.length > 0);
                return { hash, filesInCommit };
              }),
            ),
            context
              ? cachedAnalyzeContributors(context.cache, repo_path, { pathPattern: file_path, timeoutMs: timeout_ms })
              : analyzeContributors(repo_path, { pathPattern: file_path, timeoutMs: timeout_ms }),
            analyzeCoChanges(repo_path, file_path, { minCoupling: 2, timeoutMs: timeout_ms }),
          ]);

        const commitFilesMap = new Map<string, string[]>();
        for (const { hash, filesInCommit } of commitDetails) {
          commitFilesMap.set(hash, filesInCommit);
        }

        // Group line ranges by commit hash
        const commitLineRanges = new Map<string, string[]>();
        for (const block of blocks) {
          const range =
            block.startLine === block.endLine
              ? `L${block.startLine}`
              : `L${block.startLine}-${block.endLine}`;
          const existing = commitLineRanges.get(block.commitHash);
          if (existing) {
            existing.push(range);
          } else {
            commitLineRanges.set(block.commitHash, [range]);
          }
        }

        // Build line range label
        const lineLabel =
          start_line !== undefined
            ? end_line !== undefined
              ? ` L${start_line}-${end_line}`
              : ` L${start_line}+`
            : "";

        const uniqueAuthors = new Set(blocks.map((b) => b.author));

        const lines: string[] = [
          `Why does this code exist? — ${file_path}${lineLabel}`,
          "━".repeat(50),
          "",
          `Blame summary (${uniqueCommitHashes.length} commit(s), ${uniqueAuthors.size} author(s)):`,
          "",
        ];

        // Deduplicated commit details
        for (const hash of limitedHashes) {
          const block = blocks.find((b) => b.commitHash === hash);
          if (!block) continue;

          const shortHash = hash.slice(0, 7);
          const date = block.date.slice(0, 10);
          const ranges = commitLineRanges.get(hash) ?? [];

          lines.push(`  ${shortHash} | ${date} | ${block.author}`);
          lines.push(`    Commit: ${block.summary}`);
          lines.push(`    Lines: ${ranges.join(", ")}`);

          const filesInCommit = commitFilesMap.get(hash);
          if (filesInCommit && filesInCommit.length > 0) {
            lines.push(
              `    Files in commit: ${filesInCommit.join(", ")}`,
            );
          }
          lines.push("");
        }

        if (uniqueCommitHashes.length > limitedHashes.length) {
          lines.push(
            `  ... and ${uniqueCommitHashes.length - limitedHashes.length} more commit(s)`,
          );
          lines.push("");
        }

        // File context
        lines.push("File context:");

        if (contributorData.stats.length > 0) {
          const contribParts = contributorData.stats.map(
            (s) => `${s.name} (${s.percentage}%)`,
          );
          lines.push(`  Contributors: ${contribParts.join(", ")}`);
        }

        if (coChangeData.results.length > 0) {
          const coChangeParts = coChangeData.results
            .slice(0, 5)
            .map((r) => `${r.filePath} (${r.percentage}%)`);
          lines.push(`  Co-changed with: ${coChangeParts.join(", ")}`);
        }

        // Next actions
        lines.push("", "Next actions:");
        lines.push(
          `  → git_pickaxe — 関連する文字列の追加/削除履歴を追跡`,
        );
        lines.push(
          `  → git_file_history — ${file_path} の全体的な変遷を確認`,
        );

        const data = {
          file: file_path,
          startLine: start_line ?? null,
          endLine: end_line ?? null,
          blocks: blocks.map((b) => ({
            commitHash: b.commitHash,
            author: b.author,
            date: b.date,
            summary: b.summary,
            startLine: b.startLine,
            endLine: b.endLine,
          })),
          commitDetails: limitedHashes.map((hash) => ({
            hash,
            filesInCommit: commitFilesMap.get(hash) ?? [],
          })),
          contributors: contributorData.stats,
          coChangedFiles: coChangeData.results.slice(0, 5).map((r) => ({
            filePath: r.filePath,
            coChangeCount: r.coChangeCount,
            percentage: r.percentage,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
