import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  execGit,
  validateGitRepo,
  validateFilePath,
} from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

export function registerGitBisectGuide(server: McpServer): void {
  server.tool(
    "git_bisect_guide",
    "Provide pre-bisect analysis for identifying bug-introducing commits. Shows commit count, estimated bisect steps (log2), hotspots within range, and file-specific commits. Does NOT run git bisect itself.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      good_ref: z
        .string()
        .describe(
          "Known good reference (commit hash, tag, or branch) where the bug did not exist",
        ),
      bad_ref: z
        .string()
        .optional()
        .default("HEAD")
        .describe(
          "Known bad reference where the bug exists (default: HEAD)",
        ),
      file_path: z
        .string()
        .optional()
        .describe(
          "Optional file path to focus on — shows only commits that modified this file",
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
      output_format: outputFormatSchema,
    },
    async ({ repo_path, good_ref, bad_ref, file_path, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);
        if (file_path) {
          await validateFilePath(repo_path, file_path);
        }

        // Get commit count in range
        const countArgs = [
          "rev-list",
          "--count",
          `${good_ref}..${bad_ref}`,
        ];
        const countOutput = await execGit(countArgs, repo_path, timeout_ms);
        const commitCount = parseInt(countOutput.trim(), 10);

        if (commitCount === 0) {
          return successResponse(
            `No commits found between ${good_ref} and ${bad_ref}. Verify the references are correct and that good_ref is an ancestor of bad_ref.`,
          );
        }

        const bisectSteps = Math.ceil(Math.log2(commitCount));

        // Get commits in range
        const logArgs = [
          "log",
          "--format=%H|%an|%ae|%aI|%s",
          `${good_ref}..${bad_ref}`,
        ];
        if (file_path) logArgs.push("--", file_path);
        const logOutput = await execGit(logArgs, repo_path, timeout_ms);
        const commits = parseLogOutput(logOutput);

        // Get hotspots in range (file change frequency)
        const hotspotsArgs = [
          "log",
          "--format=",
          "--name-only",
          `${good_ref}..${bad_ref}`,
        ];
        const hotspotsOutput = await execGit(hotspotsArgs, repo_path, timeout_ms);
        const fileCounts = new Map<string, number>();
        for (const line of hotspotsOutput.trim().split("\n")) {
          const path = line.trim();
          if (path.length > 0) {
            fileCounts.set(path, (fileCounts.get(path) ?? 0) + 1);
          }
        }
        const hotspots = [...fileCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        // Build output
        const lines: string[] = [
          `Bisect guide: ${good_ref} → ${bad_ref}`,
          "",
          `Commits in range: ${commitCount}`,
          `Estimated bisect steps: ~${bisectSteps} (log2(${commitCount}))`,
          "",
        ];

        if (hotspots.length > 0) {
          lines.push("Hotspots in range (most frequently changed files):");
          for (const [path, count] of hotspots) {
            lines.push(`  ${String(count).padStart(3)} changes  ${path}`);
          }
          lines.push("");
        }

        if (file_path) {
          lines.push(`Commits modifying ${file_path}: ${commits.length}`);
        } else {
          lines.push(`Commits in range: ${commits.length}`);
        }

        if (commits.length > 0) {
          lines.push("");
          const displayCommits = commits.slice(0, 30);
          for (const c of displayCommits) {
            lines.push(
              `  ${c.hash.slice(0, 8)} ${c.date.slice(0, 10)} ${c.author}: ${c.subject}`,
            );
          }
          if (commits.length > 30) {
            lines.push(`  ... and ${commits.length - 30} more commits`);
          }
        }

        const topHotspots = hotspots.map(([file, count]) => ({ file, count }));

        const data = {
          goodRef: good_ref,
          badRef: bad_ref,
          filePath: file_path ?? null,
          commitCount,
          bisectSteps,
          hotspots: topHotspots,
          commits: commits.map((c) => ({
            hash: c.hash,
            date: c.date,
            author: c.author,
            subject: c.subject,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
