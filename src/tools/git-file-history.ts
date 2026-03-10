import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import { errorResponse, successResponse } from "./response.js";

export function registerGitFileHistory(server: McpServer): void {
  server.tool(
    "git_file_history",
    "Get the commit history for a specific file. Useful for understanding how and why a file evolved over time.",
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
        .default(20)
        .describe("Maximum number of commits to return"),
      since: z
        .string()
        .optional()
        .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
    },
    async ({ repo_path, file_path, max_commits, since }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        const args = [
          "log",
          "--follow",
          "--format=%H|%an|%ae|%aI|%s",
          `--max-count=${max_commits}`,
        ];

        if (since) {
          args.push(`--since=${since}`);
        }

        args.push("--", file_path);

        const output = await execGit(args, repo_path);
        const commits = parseLogOutput(output);

        if (commits.length === 0) {
          return successResponse(`No commits found for ${file_path}`);
        }

        // Get diff stats for each commit
        const enriched = await Promise.all(
          commits.map(async (commit) => {
            try {
              const stat = await execGit(
                ["show", "--stat", "--format=", commit.hash, "--", file_path],
                repo_path,
              );
              return { ...commit, stat: stat.trim() };
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              return { ...commit, stat: `(stat unavailable: ${msg})` };
            }
          }),
        );

        const lines = enriched.map((c) => {
          let entry = `${c.hash.slice(0, 8)} | ${c.date.slice(0, 10)} | ${c.author} | ${c.subject}`;
          if (c.stat) {
            entry += `\n  ${c.stat}`;
          }
          return entry;
        });

        const text = [
          `File history for: ${file_path}`,
          `Showing ${commits.length} commit(s)`,
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
