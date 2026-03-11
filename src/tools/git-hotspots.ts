import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeHotspots } from "../analysis/hotspots.js";
import { errorResponse, successResponse } from "./response.js";

export function registerGitHotspots(server: McpServer): void {
  server.tool(
    "git_hotspots",
    "Identify the most frequently changed files in the repository. Files with high change frequency often indicate areas of technical debt, active development, or bug-prone code.",
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
    },
    async ({ repo_path, path_pattern, since, max_commits, top_n }) => {
      try {
        await validateGitRepo(repo_path);

        const hotspots = await analyzeHotspots(repo_path, {
          pathPattern: path_pattern,
          since,
          maxCommits: max_commits,
          topN: top_n,
        });

        if (hotspots.length === 0) {
          return successResponse("No file changes found in the specified range.");
        }

        const lines = hotspots.map(
          (h) =>
            `  ${String(h.changeCount).padStart(4)} changes (${String(h.percentage).padStart(2)}%) ${h.filePath}`,
        );

        const scope = path_pattern ? `\nScope: ${path_pattern}` : "";
        const text = [
          `Change hotspots (last ${max_commits} commits)${scope}`,
          `Top ${hotspots.length} most frequently changed files`,
          "",
          ...lines,
        ].join("\n");

        return successResponse(text);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
