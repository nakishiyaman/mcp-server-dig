import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";

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
    },
    async ({ repo_path, query, max_commits, since, author, path_pattern }) => {
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

      const output = await execGit(args, repo_path);
      const commits = parseLogOutput(output);

      if (commits.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No commits found matching: "${query}"`,
            },
          ],
        };
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

      return { content: [{ type: "text" as const, text }] };
    },
  );
}
