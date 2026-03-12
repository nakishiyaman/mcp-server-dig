import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitPickaxe(server: McpServer): void {
  server.tool(
    "git_pickaxe",
    "Search for commits that introduced or removed a specific string or regex pattern in the codebase. Uses git's pickaxe feature (-S/-G) to find when code was added or deleted — essential for understanding when a function, variable, or pattern first appeared or was removed.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      search_term: z
        .string()
        .describe("String or regex pattern to search for in code changes"),
      is_regex: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, treat search_term as a regex (-G). If false, use literal string match (-S). Default: false",
        ),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(20)
        .describe("Maximum number of commits to return (default: 20)"),
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
    async ({
      repo_path,
      search_term,
      is_regex,
      max_commits,
      since,
      author,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const flag = is_regex ? `-G${search_term}` : `-S${search_term}`;
        const args = [
          "log",
          flag,
          "--format=%H|%an|%ae|%aI|%s",
          `--max-count=${max_commits}`,
        ];

        if (since) args.push(`--since=${since}`);
        if (author) args.push(`--author=${author}`);
        if (path_pattern) args.push("--", path_pattern);

        const output = await execGit(args, repo_path, timeout_ms);
        const commits = parseLogOutput(output);

        if (commits.length === 0) {
          return successResponse(
            `No commits found that introduced or removed: "${search_term}"`,
          );
        }

        const mode = is_regex ? "regex" : "string";
        const lines = commits.map(
          (c) =>
            `${c.hash.slice(0, 8)} | ${c.date.slice(0, 10)} | ${c.author} | ${c.subject}`,
        );

        const data = {
          searchTerm: search_term,
          isRegex: is_regex,
          totalCommits: commits.length,
          commits: commits.map((c) => ({
            hash: c.hash,
            date: c.date,
            author: c.author,
            email: c.email,
            subject: c.subject,
          })),
        };

        const text = [
          `Pickaxe search (${mode}): "${search_term}"`,
          `Found ${commits.length} commit(s) that added/removed this ${mode}`,
          "",
          ...lines,
        ].join("\n");

        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
