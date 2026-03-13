import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeChurn } from "../analysis/churn.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitCodeChurn(server: McpServer): void {
  server.tool(
    "git_code_churn",
    "Analyze code churn (lines added + deleted) per file over a range of commits. High churn files may indicate unstable code, frequent refactoring, or areas needing architectural attention. Complements git_hotspots by measuring change volume, not just frequency.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific directory, e.g. 'src/'"),
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
        .optional()
        .default(20)
        .describe("Number of top files to return (default: 20)"),
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
    async ({ repo_path, path_pattern, since, max_commits, top_n, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const churnFiles = await analyzeChurn(repo_path, {
          pathPattern: path_pattern,
          since,
          maxCommits: max_commits,
          topN: top_n,
          timeoutMs: timeout_ms,
        });

        if (churnFiles.length === 0) {
          return successResponse(
            "No file changes found in the specified range.",
          );
        }

        const lines = churnFiles.map(
          (f) =>
            `  ${String(f.totalChurn).padStart(6)} churn (+${f.insertions} -${f.deletions}) in ${f.commits} commits  ${f.filePath}`,
        );

        const scope = path_pattern ? `\nScope: ${path_pattern}` : "";
        const text = [
          `Code churn analysis (last ${max_commits} commits)${scope}`,
          `Top ${churnFiles.length} files by total churn (lines added + deleted)`,
          "",
          ...lines,
        ].join("\n");

        const data = {
          pathPattern: path_pattern ?? null,
          maxCommits: max_commits,
          totalFiles: churnFiles.length,
          files: churnFiles.map(f => ({
            filePath: f.filePath,
            insertions: f.insertions,
            deletions: f.deletions,
            totalChurn: f.totalChurn,
            commits: f.commits,
          })),
        };

        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
