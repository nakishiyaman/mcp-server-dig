import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseTagOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitTagList(server: McpServer): void {
  server.registerTool(
    "git_tag_list",
    {
      description: "List tags in the repository sorted by creation date. Shows tag name, date, and associated message. Useful for understanding release history and versioning patterns.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      pattern: z
        .string()
        .optional()
        .describe('Glob pattern to filter tags, e.g. "v1.*" or "release-*"'),
      max_tags: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(50)
        .describe("Maximum number of tags to return (default: 50)"),
      sort: z
        .enum(["newest", "oldest"])
        .optional()
        .default("newest")
        .describe("Sort order: newest first or oldest first (default: newest)"),
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
    async ({ repo_path, pattern, max_tags, sort, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const sortFlag = sort === "oldest" ? "creatordate" : "-creatordate";
        const args = [
          "tag",
          "-l",
          `--sort=${sortFlag}`,
          "--format=%(refname:short)|%(creatordate:iso-strict)|%(subject)",
        ];

        if (pattern) args.push(pattern);

        const output = await execGit(args, repo_path, timeout_ms);
        let tags = parseTagOutput(output);

        if (tags.length === 0) {
          const filterMsg = pattern ? ` matching "${pattern}"` : "";
          return successResponse(`No tags found${filterMsg}.`);
        }

        tags = tags.slice(0, max_tags);

        const lines = tags.map(
          (t) =>
            `  ${t.name.padEnd(20)} ${t.date ? t.date.slice(0, 10) : "N/A".padEnd(10)}  ${t.subject}`,
        );

        const filterMsg = pattern ? ` (filter: "${pattern}")` : "";
        const text = [
          `Tags${filterMsg} — ${sort === "oldest" ? "oldest" : "newest"} first`,
          `Showing ${tags.length} tag(s)`,
          "",
          ...lines,
        ].join("\n");

        const data = { pattern: pattern ?? null, sort, totalTags: tags.length, tags: tags.map(t => ({ name: t.name, date: t.date, subject: t.subject })) };
        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
