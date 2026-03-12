import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { parseRenameOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitRenameHistory(server: McpServer): void {
  server.tool(
    "git_rename_history",
    "Track the rename history of a file. Reconstructs the full rename chain showing how a file was renamed over time. Answers 'What was this file called before?' and 'Where did this code move from?'",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      file_path: z
        .string()
        .describe("Relative path to the file within the repo"),
      max_entries: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(50)
        .describe("Maximum number of commits to scan (default: 50)"),
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
    async ({ repo_path, file_path, max_entries, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        const args = [
          "log",
          "--follow",
          "--diff-filter=R",
          "--find-renames",
          "--format=%H|%an|%ae|%aI|%s",
          "--name-status",
          `--max-count=${max_entries}`,
          "--",
          file_path,
        ];

        const output = await execGit(args, repo_path, timeout_ms);
        const renames = parseRenameOutput(output);

        if (renames.length === 0) {
          return successResponse(
            `No rename history found for ${file_path}\n\nThe file has not been renamed in the tracked history.`,
          );
        }

        const lines = renames.map(
          (r) =>
            `${r.hash.slice(0, 8)} | ${r.date.slice(0, 10)} | ${r.author}\n  ${r.oldPath} → ${r.newPath}\n  ${r.subject}`,
        );

        const text = [
          `Rename history for: ${file_path}`,
          `Found ${renames.length} rename(s)`,
          "",
          ...lines,
        ].join("\n");

        const data = { file: file_path, totalRenames: renames.length, renames: renames.map(r => ({ hash: r.hash, date: r.date, author: r.author, email: r.email, subject: r.subject, oldPath: r.oldPath, newPath: r.newPath })) };
        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
