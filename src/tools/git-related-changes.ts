import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { parseNameOnlyLog } from "../git/parsers.js";
import { errorResponse, successResponse } from "./response.js";

export function registerGitRelatedChanges(server: McpServer): void {
  server.tool(
    "git_related_changes",
    "Find files that frequently change together with a given file (co-change analysis). Useful for understanding implicit dependencies and finding related code.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      file_path: z
        .string()
        .describe("Relative path to the file within the repo"),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(100)
        .describe("How many commits to analyze"),
      min_coupling: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(2)
        .describe("Minimum co-change count to include in results"),
    },
    async ({ repo_path, file_path, max_commits, min_coupling }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        // Single git command to get all commits with their changed files
        const output = await execGit(
          [
            "log",
            "--format=COMMIT:%H",
            "--name-only",
            `--max-count=${max_commits}`,
            "--",
            file_path,
          ],
          repo_path,
        );

        const commitFiles = parseNameOnlyLog(output);
        const totalCommits = commitFiles.size;

        if (totalCommits === 0) {
          return successResponse(`No commits found for ${file_path}`);
        }

        // For each commit, get ALL files changed (not just the target file)
        const coChangeMap = new Map<string, number>();
        const skipped: string[] = [];

        for (const [hash] of commitFiles) {
          try {
            const allFiles = await execGit(
              ["show", "--name-only", "--format=", hash],
              repo_path,
            );
            const files = allFiles
              .trim()
              .split("\n")
              .filter((f) => f.length > 0 && f !== file_path);

            for (const f of files) {
              coChangeMap.set(f, (coChangeMap.get(f) ?? 0) + 1);
            }
          } catch {
            skipped.push(hash.slice(0, 8));
          }
        }

        const results = Array.from(coChangeMap.entries())
          .filter(([, count]) => count >= min_coupling)
          .sort((a, b) => b[1] - a[1])
          .map(([filePath, count]) => ({
            filePath,
            coChangeCount: count,
            percentage: Math.round((count / totalCommits) * 100),
          }));

        if (results.length === 0) {
          return successResponse(
            `No co-changed files found for ${file_path} (analyzed ${totalCommits} commits, min coupling: ${min_coupling})`,
          );
        }

        const lines = results.map(
          (r) => `  ${r.coChangeCount}x (${r.percentage}%) ${r.filePath}`,
        );

        const parts = [
          `Co-change analysis for: ${file_path}`,
          `Analyzed ${totalCommits} commit(s), found ${results.length} related file(s)`,
        ];
        if (skipped.length > 0) {
          parts.push(`(${skipped.length} commit(s) skipped due to read errors)`);
        }
        parts.push("", ...lines);

        return successResponse(parts.join("\n"));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
