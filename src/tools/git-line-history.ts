import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { parseLineLogOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitLineHistory(server: McpServer): void {
  server.registerTool(
    "git_line_history",
    {
      description:
        "Track the evolution of specific lines or functions using git log -L. Shows how a code block changed across commits — unlike blame (snapshot) or file_history (file-level), this reveals line-level change history.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        file_path: z.string().describe("File path relative to the repository root"),
        start_line: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Start line of the range (requires end_line)"),
        end_line: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("End line of the range (requires start_line)"),
        funcname: z
          .string()
          .optional()
          .describe("Function name to track (uses git's function detection, alternative to line range)"),
        max_commits: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of commits to show (default: 20)"),
        timeout_ms: z
          .number()
          .int()
          .min(1000)
          .max(300000)
          .optional()
          .describe("Timeout in ms for git operations (default: 30000, max: 300000)"),
        output_format: outputFormatSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ repo_path, file_path, start_line, end_line, funcname, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        const maxCommits = max_commits ?? 20;

        // Build the -L argument
        let lineSpec: string;
        if (funcname) {
          lineSpec = `:${funcname}:${file_path}`;
        } else if (start_line !== undefined && end_line !== undefined) {
          lineSpec = `${start_line},${end_line}:${file_path}`;
        } else {
          return errorResponse(
            new Error("Either funcname or both start_line and end_line must be specified"),
          );
        }

        const args = ["log", `-L${lineSpec}`, `--max-count=${maxCommits}`];

        const raw = await execGit(args, repo_path, timeout_ms);

        if (!raw.trim()) {
          return successResponse(
            `No line history found for ${file_path}${funcname ? ` (function: ${funcname})` : ` (lines ${start_line}-${end_line})`}.`,
          );
        }

        const entries = parseLineLogOutput(raw);

        const rangeLabel = funcname
          ? `function ${funcname}`
          : `lines ${start_line}-${end_line}`;

        const lines: string[] = [
          `Line history: ${file_path} (${rangeLabel})`,
          "━".repeat(50),
          "",
          `Commits: ${entries.length}`,
          "",
        ];

        for (const entry of entries) {
          lines.push(`commit ${entry.hash.slice(0, 8)}`);
          lines.push(`Author: ${entry.author} <${entry.email}>`);
          lines.push(`Date:   ${entry.date}`);
          lines.push(`Subject: ${entry.subject}`);
          if (entry.diff) {
            lines.push("");
            lines.push(entry.diff);
          }
          lines.push("");
          lines.push("─".repeat(40));
          lines.push("");
        }

        const data = {
          file: file_path,
          range: rangeLabel,
          totalCommits: entries.length,
          entries: entries.map((e) => ({
            hash: e.hash,
            author: e.author,
            email: e.email,
            date: e.date,
            subject: e.subject,
            diff: e.diff,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
