import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeContributors } from "../analysis/contributors.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitContributorPatterns(server: McpServer): void {
  server.tool(
    "git_contributor_patterns",
    "Analyze contributor patterns — who has expertise in what areas. Useful for identifying reviewers, understanding code ownership, and finding domain experts.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      path_pattern: z
        .string()
        .optional()
        .describe(
          'Directory or path to scope analysis, e.g. "src/api/" or "lib/"',
        ),
      since: z
        .string()
        .optional()
        .describe('Date filter, e.g. "2024-01-01" or "1 year ago"'),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(500)
        .describe("Maximum number of commits to analyze"),
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
    async ({ repo_path, path_pattern, since, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const { stats, totalCommits } = await analyzeContributors(repo_path, {
          pathPattern: path_pattern,
          since,
          maxCommits: max_commits,
          timeoutMs: timeout_ms,
        });

        if (stats.length === 0) {
          const scope = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(`No contributors found${scope}`);
        }

        const scope = path_pattern ?? "(entire repo)";
        const lines = stats.map(
          (s) =>
            `  ${s.commitCount} commits (${s.percentage}%) | ${s.name} <${s.email}> | last active: ${s.lastActive}`,
        );

        const parts = [
          `Contributor patterns for: ${scope}`,
          `${stats.length} contributor(s), ${totalCommits} total commit(s)`,
          "",
          ...lines,
        ];

        const data = {
          pathPattern: path_pattern ?? null,
          totalCommits,
          totalContributors: stats.length,
          contributors: stats.map(s => ({
            name: s.name,
            email: s.email,
            commitCount: s.commitCount,
            percentage: s.percentage,
            lastActive: s.lastActive,
          })),
        };

        return formatResponse(data, () => parts.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
