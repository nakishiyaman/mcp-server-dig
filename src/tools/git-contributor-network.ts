import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeContributorNetwork } from "../analysis/contributor-network.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

export function registerGitContributorNetwork(server: McpServer): void {
  server.tool(
    "git_contributor_network",
    "Analyze contributor collaboration network. Shows which developers work on the same files, revealing team collaboration patterns, knowledge silos, and implicit dependencies between people.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
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
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific path, e.g. 'src/'"),
      min_shared_files: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Minimum shared files to show an edge (default: 1)"),
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
      since,
      max_commits,
      path_pattern,
      min_shared_files,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);
        const result = await analyzeContributorNetwork(repo_path, {
          since,
          maxCommits: max_commits,
          pathPattern: path_pattern,
          minSharedFiles: min_shared_files,
          timeoutMs: timeout_ms,
        });

        if (result.nodes.length === 0) {
          return successResponse(
            "No contributor data found in the specified range.",
          );
        }

        const data = {
          pathPattern: path_pattern ?? null,
          maxCommits: max_commits,
          totalContributors: result.nodes.length,
          totalEdges: result.edges.length,
          density: result.density,
          nodes: result.nodes,
          edges: result.edges,
        };

        return formatResponse(
          data,
          () => {
            const lines: string[] = [
              `Contributor network (last ${max_commits} commits)`,
            ];
            if (path_pattern) {
              lines.push(`Scope: ${path_pattern}`);
            }
            lines.push(
              `Contributors: ${result.nodes.length}, Collaboration links: ${result.edges.length}, Density: ${(result.density * 100).toFixed(1)}%`,
              "",
              "## Contributors (by commits)",
            );

            for (const node of result.nodes.slice(0, 20)) {
              lines.push(
                `  ${node.email}: ${node.commits} commits, ${node.files} files`,
              );
            }
            if (result.nodes.length > 20) {
              lines.push(
                `  ... and ${result.nodes.length - 20} more`,
              );
            }

            lines.push("", "## Collaboration links (by shared files)");
            const sortedEdges = [...result.edges].sort(
              (a, b) => b.sharedFiles - a.sharedFiles,
            );
            for (const edge of sortedEdges.slice(0, 20)) {
              lines.push(
                `  ${edge.author1} ↔ ${edge.author2}: ${edge.sharedFiles} shared files`,
              );
            }
            if (result.edges.length > 20) {
              lines.push(
                `  ... and ${result.edges.length - 20} more links`,
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
