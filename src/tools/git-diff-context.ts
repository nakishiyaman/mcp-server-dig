import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateFilePath, validateGitRepo } from "../git/executor.js";
import { gitRefSchema } from "../git/validators.js";
import { parseDiffStatOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

const MAX_DIFF_LENGTH = 50_000;

export function registerGitDiffContext(server: McpServer): void {
  server.registerTool(
    "git_diff_context",
    {
      description: "Show the diff between two commits, branches, or tags. Useful for understanding what changed between releases, branches, or any two points in history.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      commit: gitRefSchema.describe("Target commit, branch, or tag"),
      compare_to: gitRefSchema
        .optional()
        .describe("Base to compare against (default: parent commit)"),
      file_path: z
        .string()
        .optional()
        .describe("Limit diff to a specific file"),
      stat_only: z
        .boolean()
        .optional()
        .default(false)
        .describe("Show only file change statistics (default: false)"),
      context_lines: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(3)
        .describe("Number of context lines in unified diff (default: 3)"),
      word_diff: z
        .boolean()
        .optional()
        .default(false)
        .describe("Show word-level differences instead of line-level (git diff --word-diff=plain). Useful for seeing exactly which words changed within a line."),
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
    async ({
      repo_path,
      commit,
      compare_to,
      file_path,
      stat_only,
      context_lines,
      word_diff,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);
        if (file_path) {
          await validateFilePath(repo_path, file_path);
        }

        const base = compare_to ?? `${commit}^`;

        if (stat_only) {
          const args = ["diff", "--stat", base, commit];
          if (file_path) args.push("--", file_path);

          const output = await execGit(args, repo_path, timeout_ms);
          const stat = parseDiffStatOutput(output);

          const fileLines = stat.files.map(
            (f) => `  ${f.path} | +${f.insertions} -${f.deletions}`,
          );

          const data = {
            ref: commit,
            compareTo: compare_to ?? null,
            filePath: file_path ?? null,
            statOnly: true,
            stat: {
              filesChanged: stat.filesChanged,
              insertions: stat.insertions,
              deletions: stat.deletions,
              files: stat.files,
            },
          };

          const text = [
            `Diff: ${base} → ${commit}`,
            `${stat.filesChanged} file(s) changed, ${stat.insertions} insertion(s), ${stat.deletions} deletion(s)`,
            "",
            ...fileLines,
          ].join("\n");

          return formatResponse(data, () => text, output_format);
        }

        // Full diff
        const args = ["diff", `-U${context_lines}`, ...(word_diff ? ["--word-diff=plain"] : []), base, commit];
        if (file_path) args.push("--", file_path);

        const output = await execGit(args, repo_path, timeout_ms);

        if (output.trim().length === 0) {
          return successResponse(`No differences between ${base} and ${commit}`);
        }

        // Get stat for structured data
        const statArgs = ["diff", "--stat", base, commit];
        if (file_path) statArgs.push("--", file_path);
        const statOutput = await execGit(statArgs, repo_path, timeout_ms);
        const stat = parseDiffStatOutput(statOutput);

        const diffOutput = output;

        const data = {
          ref: commit,
          compareTo: compare_to ?? null,
          filePath: file_path ?? null,
          statOnly: false,
          stat: {
            filesChanged: stat.filesChanged,
            insertions: stat.insertions,
            deletions: stat.deletions,
            files: stat.files,
          },
          diff: diffOutput,
        };

        let text: string;
        if (diffOutput.length > MAX_DIFF_LENGTH) {
          text = [
            `Diff: ${base} → ${commit}`,
            `[Output truncated at ${MAX_DIFF_LENGTH} characters. Showing stat + partial diff. Use file_path to view specific files.]`,
            "",
            statOutput.trim(),
            "",
            "---",
            "",
            diffOutput.slice(0, MAX_DIFF_LENGTH),
          ].join("\n");
        } else {
          text = [`Diff: ${base} → ${commit}`, "", diffOutput].join("\n");
        }

        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
