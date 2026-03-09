import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseShortlogOutput } from "../git/parsers.js";

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
        .optional()
        .default(500)
        .describe("Maximum number of commits to analyze"),
    },
    async ({ repo_path, path_pattern, since, max_commits }) => {
      await validateGitRepo(repo_path);

      // Get shortlog for contributor summary
      const shortlogArgs = ["shortlog", "-sne", `--max-count=${max_commits}`];
      if (since) shortlogArgs.push(`--since=${since}`);
      shortlogArgs.push("HEAD");
      if (path_pattern) shortlogArgs.push("--", path_pattern);

      const shortlogOutput = await execGit(shortlogArgs, repo_path);

      // Get total commit count for percentage calculation
      const countArgs = [
        "rev-list",
        "--count",
        `--max-count=${max_commits}`,
        "HEAD",
      ];
      if (since) countArgs.push(`--since=${since}`);
      // Note: rev-list doesn't support path filtering directly with --count well,
      // so we count from the shortlog output
      const totalFromShortlog = shortlogOutput
        .trim()
        .split("\n")
        .filter((l) => l.length > 0)
        .reduce((sum, line) => {
          const match = line.trim().match(/^(\d+)/);
          return sum + (match ? parseInt(match[1], 10) : 0);
        }, 0);

      const stats = parseShortlogOutput(shortlogOutput, totalFromShortlog);

      if (stats.length === 0) {
        const scope = path_pattern ? ` in ${path_pattern}` : "";
        return {
          content: [
            {
              type: "text" as const,
              text: `No contributors found${scope}`,
            },
          ],
        };
      }

      // Get last active date for each contributor
      for (const contributor of stats) {
        try {
          const logArgs = [
            "log",
            "--format=%aI",
            "--max-count=1",
            `--author=${contributor.email}`,
          ];
          if (path_pattern) logArgs.push("--", path_pattern);

          const lastDate = await execGit(logArgs, repo_path);
          contributor.lastActive = lastDate.trim().slice(0, 10);
        } catch {
          contributor.lastActive = "unknown";
        }
      }

      const scope = path_pattern ?? "(entire repo)";
      const lines = stats.map(
        (s) =>
          `  ${s.commitCount} commits (${s.percentage}%) | ${s.name} <${s.email}> | last active: ${s.lastActive}`,
      );

      const text = [
        `Contributor patterns for: ${scope}`,
        `${stats.length} contributor(s), ${totalFromShortlog} total commit(s)`,
        "",
        ...lines,
      ].join("\n");

      return { content: [{ type: "text" as const, text }] };
    },
  );
}
