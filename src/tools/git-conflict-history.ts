import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

interface MergeFileEntry {
  filePath: string;
  mergeCount: number;
  percentage: number;
}

export interface ConflictHistoryResult {
  totalMergeCommits: number;
  pathPattern: string | null;
  since: string | null;
  files: MergeFileEntry[];
}

export function registerGitConflictHistory(server: McpServer): void {
  server.tool(
    "git_conflict_history",
    "Detect files that frequently appear in merge commits. High-frequency merge files indicate conflict-prone areas that may need refactoring or better code organization. Analyzes merge commit file changes to identify hotspots.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      since: z
        .string()
        .optional()
        .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
      max_merges: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(200)
        .describe("Maximum number of merge commits to analyze (default: 200)"),
      top_n: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(20)
        .describe("Number of top files to return (default: 20)"),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific path, e.g. 'src/'"),
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
    async ({
      repo_path,
      since,
      max_merges,
      top_n,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        // Find merge commits and their changed files.
        // --diff-merges=first-parent is required to make git show
        // file diffs for merge commits (compared to the first parent).
        const args = [
          "log",
          "--merges",
          "--format=MERGE:%H",
          "--name-only",
          "--diff-merges=first-parent",
          `--max-count=${max_merges}`,
        ];
        if (since) args.push(`--since=${since}`);
        if (path_pattern) args.push("--", path_pattern);

        const output = await execGit(args, repo_path, timeout_ms);

        if (!output.trim()) {
          const sinceMsg = since ? ` since ${since}` : "";
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(
            `No merge commits found${sinceMsg}${pathMsg}.`,
          );
        }

        // Parse: sections starting with MERGE:<hash>, followed by file paths
        const sections = output
          .split(/^MERGE:/m)
          .filter((s) => s.trim().length > 0);
        const fileCounts = new Map<string, number>();
        let totalMerges = 0;

        for (const section of sections) {
          const lines = section.trim().split("\n");
          // First line is the hash
          totalMerges++;
          const files = lines
            .slice(1)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          // Count unique files per merge (avoid double counting)
          const uniqueFiles = new Set(files);
          for (const file of uniqueFiles) {
            fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
          }
        }

        if (fileCounts.size === 0) {
          return successResponse(
            "Merge commits found but no file changes detected.",
          );
        }

        const sorted: MergeFileEntry[] = [...fileCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, top_n)
          .map(([filePath, mergeCount]) => ({
            filePath,
            mergeCount,
            percentage:
              totalMerges > 0
                ? Math.round((mergeCount / totalMerges) * 100)
                : 0,
          }));

        const data: ConflictHistoryResult = {
          totalMergeCommits: totalMerges,
          pathPattern: path_pattern ?? null,
          since: since ?? null,
          files: sorted,
        };

        return formatResponse(
          data,
          () => {
            const sinceLabel = since ? ` (since ${since})` : "";
            const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
            const lines: string[] = [
              `Merge commit file frequency${sinceLabel}${pathLabel}`,
              `Total merge commits: ${totalMerges}`,
              `Files changed in merges: ${fileCounts.size}`,
              "",
            ];

            for (const entry of sorted) {
              lines.push(
                `  ${entry.filePath}: ${entry.mergeCount} merges (${entry.percentage}%)`,
              );
            }

            return lines.join("\n");
          },
          output_format,
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
