import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

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
    async ({ repo_path, file_path, max_commits, since, timeout_ms, output_format }) => {
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

        const output = await execGit(args, repo_path, timeout_ms);
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
                timeout_ms,
              );
              return { ...commit, stat: stat.trim() };
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              return { ...commit, stat: `(stat unavailable: ${msg})` };
            }
          }),
        );

        const data = {
          file: file_path,
          totalCommits: commits.length,
          commits: enriched.map((c) => ({
            hash: c.hash,
            date: c.date,
            author: c.author,
            email: c.email,
            subject: c.subject,
            stat: c.stat,
          })),
        };

        return formatResponse(data, () => {
          const textLines = enriched.map((c) => {
            let entry = `${c.hash.slice(0, 8)} | ${c.date.slice(0, 10)} | ${c.author} | ${c.subject}`;
            if (c.stat) {
              entry += `\n  ${c.stat}`;
            }
            return entry;
          });
          return [
            `File history for: ${file_path}`,
            `Showing ${commits.length} commit(s)`,
            "",
            ...textLines,
          ].join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
