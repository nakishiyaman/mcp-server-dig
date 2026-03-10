import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseFileFrequency } from "../git/parsers.js";

export function registerGitHotspots(server: McpServer): void {
  server.tool(
    "git_hotspots",
    "Identify the most frequently changed files in the repository. Files with high change frequency often indicate areas of technical debt, active development, or bug-prone code.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific directory, e.g. 'src/'"),
      since: z
        .string()
        .optional()
        .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
      max_commits: z
        .number()
        .optional()
        .default(500)
        .describe("Number of commits to analyze (default: 500)"),
      top_n: z
        .number()
        .optional()
        .default(20)
        .describe("Number of top files to return (default: 20)"),
    },
    async ({ repo_path, path_pattern, since, max_commits, top_n }) => {
      await validateGitRepo(repo_path);

      const args = [
        "log",
        "--format=",
        "--name-only",
        `--max-count=${max_commits}`,
      ];

      if (since) args.push(`--since=${since}`);
      if (path_pattern) args.push("--", path_pattern);

      const output = await execGit(args, repo_path);
      const hotspots = parseFileFrequency(output, top_n);

      if (hotspots.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No file changes found in the specified range.",
            },
          ],
        };
      }

      const lines = hotspots.map(
        (h) =>
          `  ${String(h.changeCount).padStart(4)} changes (${String(h.percentage).padStart(2)}%) ${h.filePath}`,
      );

      const scope = path_pattern ? `\nScope: ${path_pattern}` : "";
      const text = [
        `Change hotspots (last ${max_commits} commits)${scope}`,
        `Top ${hotspots.length} most frequently changed files`,
        "",
        ...lines,
      ].join("\n");

      return { content: [{ type: "text" as const, text }] };
    },
  );
}
