import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { clusterCommits } from "../analysis/commit-cluster.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitCommitCluster(server: McpServer): void {
  server.registerTool(
    "git_commit_cluster",
    {
      description:
        "Detect clusters of related commits by time proximity and shared files. Reveals logical changeset boundaries — groups of commits that form a coherent change. Useful for understanding multi-commit features and reviewing related changes together.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        since: z
          .string()
          .optional()
          .describe("Only include commits after this date (e.g. '2 weeks ago', '2026-01-01')"),
        author: z
          .string()
          .optional()
          .describe("Filter commits by author name or email"),
        max_commits: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Maximum number of commits to analyze (default: 200)"),
        time_window_minutes: z
          .number()
          .int()
          .min(1)
          .max(1440)
          .optional()
          .describe("Time window in minutes for clustering (default: 120)"),
        min_shared_files: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Minimum shared files to link commits (default: 1)"),
        path_pattern: z
          .string()
          .optional()
          .describe("Filter commits by file path pattern (e.g. 'src/')"),
        timeout_ms: z
          .number()
          .int()
          .min(1000)
          .max(300000)
          .optional()
          .describe("Timeout in ms for git operations (default: 30000, max: 300000)"),
        output_format: outputFormatSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({
      repo_path,
      since,
      author,
      max_commits,
      time_window_minutes,
      min_shared_files,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const result = await clusterCommits(repo_path, {
          since,
          author,
          maxCommits: max_commits,
          timeWindowMinutes: time_window_minutes,
          minSharedFiles: min_shared_files,
          pathPattern: path_pattern,
          timeoutMs: timeout_ms,
        });

        if (result.totalCommits === 0) {
          return successResponse("No commits found matching the specified criteria.");
        }

        if (result.clusters.length === 0) {
          return successResponse(
            `Analyzed ${result.totalCommits} commits — no clusters detected. All commits are independent.`,
          );
        }

        const lines: string[] = [
          "Commit Clusters",
          "━".repeat(50),
          "",
          `Total commits analyzed: ${result.totalCommits}`,
          `Clusters found: ${result.clusters.length}`,
          `Commits in clusters: ${result.clusteredCommits}`,
          `Singleton commits: ${result.singletonCommits}`,
          "",
        ];

        for (const cluster of result.clusters) {
          lines.push(`Cluster #${cluster.id} (${cluster.commits.length} commits)`);
          lines.push(`  Period: ${cluster.startDate} → ${cluster.endDate}`);
          if (cluster.sharedFiles.length > 0) {
            lines.push(`  Shared files: ${cluster.sharedFiles.join(", ")}`);
          }
          lines.push("  Commits:");
          for (const c of cluster.commits) {
            lines.push(`    ${c.hash.slice(0, 8)} ${c.author} — ${c.subject}`);
          }
          lines.push("");
        }

        const data = {
          summary: {
            totalCommits: result.totalCommits,
            clusters: result.clusters.length,
            clusteredCommits: result.clusteredCommits,
            singletonCommits: result.singletonCommits,
          },
          clusters: result.clusters.map((c) => ({
            id: c.id,
            commitCount: c.commits.length,
            startDate: c.startDate,
            endDate: c.endDate,
            sharedFiles: c.sharedFiles,
            commits: c.commits.map((commit) => ({
              hash: commit.hash,
              author: commit.author,
              email: commit.email,
              date: commit.date,
              subject: commit.subject,
            })),
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
