import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { errorResponse, successResponse } from "./response.js";

const MAX_DIFF_LENGTH = 50_000;

export function registerGitCommitShow(server: McpServer): void {
  server.tool(
    "git_commit_show",
    "Show detailed information about a specific commit: full message, changed files, and optionally the diff. Useful for drilling into a commit found via git_search_commits.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      commit: z
        .string()
        .describe("Commit hash (short or full), branch name, or tag"),
      show_diff: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Include the full diff output (default: false, shows stat only)",
        ),
      timeout_ms: z
        .number()
        .int()
        .min(1000)
        .max(300000)
        .optional()
        .describe(
          "Timeout in ms for git operations (default: 30000, max: 300000)",
        ),
    },
    async ({ repo_path, commit, show_diff, timeout_ms }) => {
      try {
        await validateGitRepo(repo_path);

        // Get commit metadata
        const metaOutput = await execGit(
          ["show", "--stat", "--format=%H|%an|%ae|%aI|%P%n%B", commit],
          repo_path,
          timeout_ms,
        );

        const lines = metaOutput.split("\n");
        const headerLine = lines[0];
        const parts = headerLine.split("|");

        const hash = parts[0];
        const author = parts[1];
        const email = parts[2];
        const date = parts[3];
        const parents = parts.slice(4).join("|").trim();

        // Find the boundary between body and stat
        let bodyEnd = 1;
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === "") {
            const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim() !== "");
            if (nextNonEmpty && /^\s*.+\s+\|\s+\d+/.test(nextNonEmpty)) {
              bodyEnd = i;
              break;
            }
          }
        }

        const body = lines.slice(1, bodyEnd).join("\n").trim();
        const statLines = lines.slice(bodyEnd).join("\n").trim();

        const outputParts = [
          `Commit: ${hash}`,
          `Author: ${author} <${email}>`,
          `Date:   ${date?.slice(0, 10)}`,
          `Parent: ${parents || "(root commit)"}`,
          "",
          body,
          "",
          "---",
          statLines,
        ];

        if (show_diff) {
          const diffOutput = await execGit(
            ["show", "-U3", "--format=", commit],
            repo_path,
            timeout_ms,
          );

          if (diffOutput.length > MAX_DIFF_LENGTH) {
            outputParts.push(
              "",
              `[Diff truncated at ${MAX_DIFF_LENGTH} characters. Use file_path parameter with git_diff_context to view specific files.]`,
              "",
              diffOutput.slice(0, MAX_DIFF_LENGTH),
            );
          } else {
            outputParts.push("", diffOutput);
          }
        }

        const text = outputParts.join("\n");
        return successResponse(text);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
