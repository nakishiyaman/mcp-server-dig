import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateGitRepo } from "../git/executor.js";
import { analyzeKnowledgeMap } from "../analysis/knowledge-map.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitKnowledgeMap(server: McpServer): void {
  server.registerTool(
    "git_knowledge_map",
    {
      description: "Map knowledge ownership per directory and calculate bus factor. Shows who owns which parts of the codebase and identifies single-point-of-failure risks (low bus factor).",
      inputSchema: {
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
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ repo_path, depth, since, max_commits, path_pattern, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const results = await analyzeKnowledgeMap(repo_path, {
          depth,
          since,
          maxCommits: max_commits,
          pathPattern: path_pattern,
          timeoutMs: timeout_ms,
        });

        if (results.length === 0) {
          return successResponse(
            "No directory knowledge data found in the specified range.",
          );
        }

        const scope = path_pattern ? `\nScope: ${path_pattern}` : "";
        const lines: string[] = [
          `Knowledge map (last ${max_commits} commits, depth=${depth})${scope}`,
          `Directories: ${results.length} (sorted by bus factor, lowest first)`,
          "",
        ];

        for (const dir of results) {
          const risk =
            dir.busFactor === 1
              ? " [RISK: single owner]"
              : dir.busFactor === 0
                ? " [no commits]"
                : "";
          lines.push(
            `${dir.directory}/ — bus factor: ${dir.busFactor}, commits: ${dir.totalCommits}${risk}`,
          );
          for (const c of dir.contributors.slice(0, 5)) {
            lines.push(
              `    ${c.email}: ${c.commits} commits (${c.percentage}%)`,
            );
          }
          if (dir.contributors.length > 5) {
            lines.push(
              `    ... and ${dir.contributors.length - 5} more contributors`,
            );
          }
          lines.push("");
        }

        const data = {
          depth,
          pathPattern: path_pattern ?? null,
          maxCommits: max_commits,
          totalDirectories: results.length,
          directories: results.map(r => ({
            directory: r.directory,
            busFactor: r.busFactor,
            totalCommits: r.totalCommits,
            contributors: r.contributors,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
