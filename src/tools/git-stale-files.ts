import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseStaleFiles } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitStaleFiles(server: McpServer): void {
  server.registerTool(
    "git_stale_files",
    {
      description: "Find files that have not been modified for a long time. Stale files may indicate dead code, forgotten configuration, or areas of technical debt that need review or removal.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      threshold_days: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(180)
        .describe(
          "Minimum number of days since last change to consider a file stale (default: 180)",
        ),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific directory, e.g. 'src/'"),
      top_n: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(30)
        .describe("Maximum number of stale files to return (default: 30)"),
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
    async ({ repo_path, threshold_days, path_pattern, top_n, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Get all tracked files
        const lsArgs = ["ls-files"];
        if (path_pattern) lsArgs.push(path_pattern);
        const trackedOutput = await execGit(lsArgs, repo_path, timeout_ms);
        const trackedFiles = trackedOutput
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);

        if (trackedFiles.length === 0) {
          return successResponse(
            "No tracked files found in the specified path.",
          );
        }

        // Get last modification date for each file using git log
        // Process in batches to avoid command line length limits
        const batchSize = 50;
        const dateLines: string[] = [];

        for (let i = 0; i < trackedFiles.length; i += batchSize) {
          const batch = trackedFiles.slice(i, i + batchSize);
          for (const file of batch) {
            try {
              const dateOutput = await execGit(
                ["log", "--format=%aI", "--max-count=1", "--", file],
                repo_path,
                timeout_ms,
              );
              const date = dateOutput.trim();
              if (date) {
                dateLines.push(`${date}\t${file}`);
              }
            } catch {
              // Skip files that fail (e.g. deleted in working tree)
            }
          }
        }

        const raw = dateLines.join("\n");
        const staleFiles = parseStaleFiles(raw, threshold_days).slice(0, top_n);

        if (staleFiles.length === 0) {
          return successResponse(
            `No files found that are stale for ${threshold_days}+ days.`,
          );
        }

        const lines = staleFiles.map(
          (f) =>
            `  ${String(f.daysSinceLastChange).padStart(5)} days  ${f.lastModified.slice(0, 10)}  ${f.filePath}`,
        );

        const scope = path_pattern ? `\nScope: ${path_pattern}` : "";
        const text = [
          `Stale files (unchanged for ${threshold_days}+ days)${scope}`,
          `Found ${staleFiles.length} stale file(s)`,
          "",
          ...lines,
        ].join("\n");

        const data = { thresholdDays: threshold_days, pathPattern: path_pattern ?? null, totalFiles: staleFiles.length, files: staleFiles.map(f => ({ filePath: f.filePath, lastModified: f.lastModified, daysSinceLastChange: f.daysSinceLastChange })) };
        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
