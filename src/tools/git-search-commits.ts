import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitSearchCommits(server: McpServer): void {
  server.tool(
    "git_search_commits",
    "Search commit messages by keyword. Useful for finding when a feature was introduced, a bug was fixed, or locating commits related to a ticket number.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      query: z
        .string()
        .describe("Search string to match against commit messages"),
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
      author: z.string().optional().describe("Filter by author name or email"),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit search to commits touching this path"),
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
    async ({ repo_path, query, max_commits, since, author, path_pattern, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "log",
          `--grep=${query}`,
          "--regexp-ignore-case",
          "--format=%H|%an|%ae|%aI|%s",
          `--max-count=${max_commits}`,
        ];

        if (since) args.push(`--since=${since}`);
        if (author) args.push(`--author=${author}`);
        if (path_pattern) args.push("--", path_pattern);

        const output = await execGit(args, repo_path, timeout_ms);
        const commits = parseLogOutput(output);

        if (commits.length === 0) {
          return successResponse(`No commits found matching: "${query}"`);
        }

        const lines = commits.map(
          (c) =>
            `${c.hash.slice(0, 8)} | ${c.date.slice(0, 10)} | ${c.author} | ${c.subject}`,
        );

        const text = [
          `Search results for: "${query}"`,
          `Found ${commits.length} commit(s)`,
          "",
          ...lines,
        ].join("\n");

        const data = { query, totalCommits: commits.length, commits: commits.map(c => ({ hash: c.hash, date: c.date, author: c.author, email: c.email, subject: c.subject })) };
        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
