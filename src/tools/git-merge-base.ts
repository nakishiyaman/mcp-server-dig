import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitMergeBase(server: McpServer): void {
  server.registerTool(
    "git_merge_base",
    {
      description: "Find the common ancestor (merge base) of two branches or refs and show the commits on each side since divergence. Useful for understanding branch relationships, reviewing what will be merged, and analyzing branching strategy.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      ref1: z.string().describe("First branch or ref (e.g. 'main')"),
      ref2: z.string().describe("Second branch or ref (e.g. 'feature-branch')"),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(50)
        .describe("Maximum number of commits to show per side (default: 50)"),
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
    async ({ repo_path, ref1, ref2, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Find merge base
        const mergeBaseOutput = await execGit(
          ["merge-base", ref1, ref2],
          repo_path,
          timeout_ms,
        );
        const mergeBase = mergeBaseOutput.trim();

        if (!mergeBase) {
          return successResponse(
            `No common ancestor found between "${ref1}" and "${ref2}".`,
          );
        }

        // Get commits on ref1 since merge base
        const ref1Output = await execGit(
          [
            "log",
            "--format=%H|%an|%ae|%aI|%s",
            `--max-count=${max_commits}`,
            `${mergeBase}..${ref1}`,
          ],
          repo_path,
          timeout_ms,
        );
        const ref1Commits = parseLogOutput(ref1Output);

        // Get commits on ref2 since merge base
        const ref2Output = await execGit(
          [
            "log",
            "--format=%H|%an|%ae|%aI|%s",
            `--max-count=${max_commits}`,
            `${mergeBase}..${ref2}`,
          ],
          repo_path,
          timeout_ms,
        );
        const ref2Commits = parseLogOutput(ref2Output);

        const formatCommits = (commits: typeof ref1Commits) =>
          commits.length === 0
            ? ["  (no commits)"]
            : commits.map(
                (c) =>
                  `  ${c.hash.slice(0, 8)} | ${c.date.slice(0, 10)} | ${c.author} | ${c.subject}`,
              );

        const data = {
          ref1,
          ref2,
          mergeBase,
          ref1Commits: ref1Commits.map((c) => ({
            hash: c.hash,
            date: c.date,
            author: c.author,
            subject: c.subject,
          })),
          ref2Commits: ref2Commits.map((c) => ({
            hash: c.hash,
            date: c.date,
            author: c.author,
            subject: c.subject,
          })),
        };

        const text = [
          `Merge base: ${mergeBase.slice(0, 8)}`,
          "",
          `Commits on "${ref1}" since divergence (${ref1Commits.length}):`,
          ...formatCommits(ref1Commits),
          "",
          `Commits on "${ref2}" since divergence (${ref2Commits.length}):`,
          ...formatCommits(ref2Commits),
        ].join("\n");

        return formatResponse(data, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
