import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { parseBlameOutput } from "../git/parsers.js";

export function registerGitBlameContext(server: McpServer): void {
  server.tool(
    "git_blame_context",
    "Get blame information with semantic context — who wrote each section and when. Groups consecutive lines by the same commit into blocks for easier comprehension.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      file_path: z
        .string()
        .describe("Relative path to the file within the repo"),
      start_line: z.number().optional().describe("Start of line range"),
      end_line: z.number().optional().describe("End of line range"),
    },
    async ({ repo_path, file_path, start_line, end_line }) => {
      await validateGitRepo(repo_path);
      await validateFilePath(repo_path, file_path);

      const args = ["blame", "--porcelain"];

      if (start_line !== undefined && end_line !== undefined) {
        args.push(`-L`, `${start_line},${end_line}`);
      } else if (start_line !== undefined) {
        args.push(`-L`, `${start_line},`);
      }

      args.push("--", file_path);

      const output = await execGit(args, repo_path);
      const blocks = parseBlameOutput(output);

      if (blocks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No blame data found for ${file_path}`,
            },
          ],
        };
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

      const text = [
        `Blame context for: ${file_path}`,
        `${blocks.length} block(s) from ${new Set(blocks.map((b) => b.author)).size} author(s)`,
        "",
        ...sections,
      ].join("\n");

      return { content: [{ type: "text" as const, text }] };
    },
  );
}
