import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { parseBlameOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitBlameContext(server: McpServer): void {
  server.registerTool(
    "git_blame_context",
    {
      description: "Get blame information with semantic context — who wrote each section and when. Groups consecutive lines by the same commit into blocks for easier comprehension.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      file_path: z
        .string()
        .describe("Relative path to the file within the repo"),
      start_line: z.number().int().min(1).optional().describe("Start of line range"),
      end_line: z.number().int().min(1).optional().describe("End of line range"),
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
    async ({ repo_path, file_path, start_line, end_line, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        const args = ["blame", "--porcelain"];

        if (start_line !== undefined && end_line !== undefined) {
          args.push(`-L`, `${start_line},${end_line}`);
        } else if (start_line !== undefined) {
          args.push(`-L`, `${start_line},`);
        } else if (end_line !== undefined) {
          args.push(`-L`, `1,${end_line}`);
        }

        args.push("--", file_path);

        const output = await execGit(args, repo_path, timeout_ms);
        const blocks = parseBlameOutput(output);

        if (blocks.length === 0) {
          return successResponse(`No blame data found for ${file_path}`);
        }

        const sections = blocks.map((block) => {
          const lineRange =
            block.startLine === block.endLine
              ? `L${block.startLine}`
              : `L${block.startLine}-${block.endLine}`;

          const header = `[${lineRange}] ${block.commitHash.slice(0, 8)} | ${block.date.slice(0, 10)} | ${block.author} | ${block.summary}`;
          const code = block.lines.map((l) => `  ${l}`).join("\n");
          return `${header}\n${code}`;
        });

        const data = {
          file: file_path,
          totalBlocks: blocks.length,
          totalAuthors: new Set(blocks.map((b) => b.author)).size,
          blocks: blocks.map((b) => ({
            commitHash: b.commitHash,
            author: b.author,
            email: b.email,
            date: b.date,
            summary: b.summary,
            startLine: b.startLine,
            endLine: b.endLine,
            lines: b.lines,
          })),
        };

        const text = [
          `Blame context for: ${file_path}`,
          `${blocks.length} block(s) from ${new Set(blocks.map((b) => b.author)).size} author(s)`,
          "",
          ...sections,
        ].join("\n");

        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
