import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeDependencyMap } from "../analysis/dependency-map.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitDependencyMap(server: McpServer): void {
  server.tool(
    "git_dependency_map",
    "Visualize co-change coupling between directories/modules. Identifies implicit dependencies by analyzing which directories frequently change together in the same commits.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      depth: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Directory depth for grouping (default: 1)"),
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
      min_coupling: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(2)
        .describe(
          "Minimum co-change count to include a pair (default: 2)",
        ),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific directory, e.g. 'src/'"),
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
    async ({
      repo_path,
      depth,
      since,
      max_commits,
      min_coupling,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const { pairs, totalCommits } = await analyzeDependencyMap(repo_path, {
          depth,
          since,
          maxCommits: max_commits,
          minCoupling: min_coupling,
          pathPattern: path_pattern,
          timeoutMs: timeout_ms,
        });

        if (pairs.length === 0) {
          return successResponse(
            "No co-change coupling found between directories in the specified range.",
          );
        }

        const scope = path_pattern ? `\nScope: ${path_pattern}` : "";
        const lines: string[] = [
          `Dependency map (last ${max_commits} commits, depth=${depth})${scope}`,
          `Analyzed ${totalCommits} commits, found ${pairs.length} coupled directory pair(s)`,
          "",
          "Co-change pairs (sorted by coupling strength):",
          "",
        ];

        for (const pair of pairs) {
          lines.push(
            `  ${pair.source} <-> ${pair.target}: ${pair.coChangeCount} commits (${pair.percentage}%)`,
          );
        }

        const data = {
          depth,
          pathPattern: path_pattern ?? null,
          totalCommits,
          totalPairs: pairs.length,
          pairs: pairs.map(p => ({
            source: p.source,
            target: p.target,
            coChangeCount: p.coChangeCount,
            percentage: p.percentage,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
