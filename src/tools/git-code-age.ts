import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  execGit,
  validateFilePath,
  validateGitRepo,
} from "../git/executor.js";
import { parseBlameOutput } from "../git/parsers.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

interface AgeBracket {
  label: string;
  lines: number;
  percentage: number;
}

export interface CodeAgeResult {
  filePath: string;
  totalLines: number;
  brackets: AgeBracket[];
  oldestDate: string | null;
  newestDate: string | null;
}

function classifyAge(daysSinceCommit: number): string {
  if (daysSinceCommit <= 30) return "< 1 month";
  if (daysSinceCommit <= 90) return "1-3 months";
  if (daysSinceCommit <= 180) return "3-6 months";
  if (daysSinceCommit <= 365) return "6-12 months";
  return "> 1 year";
}

const AGE_ORDER = [
  "< 1 month",
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "> 1 year",
];

export function registerGitCodeAge(server: McpServer): void {
  server.tool(
    "git_code_age",
    "Analyze code age distribution in a file. Groups lines by age brackets (< 1 month, 1-3 months, 3-6 months, 6-12 months, > 1 year) based on git blame timestamps. Useful for identifying how much of a file is freshly written vs. long-lived legacy code.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      file_path: z
        .string()
        .describe("Relative path to the file within the repo"),
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
    { readOnlyHint: true, openWorldHint: false },
    async ({ repo_path, file_path, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);
        await validateFilePath(repo_path, file_path);

        const blameRaw = await execGit(
          ["blame", "--porcelain", file_path],
          repo_path,
          timeout_ms,
        );

        if (!blameRaw.trim()) {
          return successResponse(
            `No blame data for ${file_path}. The file may be empty or not tracked.`,
          );
        }

        const blocks = parseBlameOutput(blameRaw);

        if (blocks.length === 0) {
          return successResponse(
            `No blame data for ${file_path}. The file may be empty or not tracked.`,
          );
        }

        const now = new Date();
        const bracketCounts = new Map<string, number>();
        let totalLines = 0;
        let oldestDate: string | null = null;
        let newestDate: string | null = null;

        for (const block of blocks) {
          const lineCount = block.endLine - block.startLine + 1;
          totalLines += lineCount;

          const commitDate = new Date(block.date);
          const daysSince = Math.floor(
            (now.getTime() - commitDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          const bracket = classifyAge(daysSince);
          bracketCounts.set(
            bracket,
            (bracketCounts.get(bracket) ?? 0) + lineCount,
          );

          if (!oldestDate || block.date < oldestDate) oldestDate = block.date;
          if (!newestDate || block.date > newestDate) newestDate = block.date;
        }

        const brackets: AgeBracket[] = AGE_ORDER.filter((label) =>
          bracketCounts.has(label),
        ).map((label) => {
          const lines = bracketCounts.get(label) ?? 0;
          return {
            label,
            lines,
            percentage:
              totalLines > 0 ? Math.round((lines / totalLines) * 100) : 0,
          };
        });

        const data: CodeAgeResult = {
          filePath: file_path,
          totalLines,
          brackets,
          oldestDate,
          newestDate,
        };

        return formatResponse(
          data,
          () => {
            const lines: string[] = [
              `Code age analysis: ${file_path}`,
              `Total lines: ${totalLines}`,
              "",
              "  Age bracket       Lines   %",
            ];

            for (const b of brackets) {
              lines.push(
                `  ${b.label.padEnd(18)} ${String(b.lines).padStart(5)}  ${String(b.percentage).padStart(3)}%`,
              );
            }

            lines.push("");
            if (oldestDate) lines.push(`Oldest code: ${oldestDate}`);
            if (newestDate) lines.push(`Newest code: ${newestDate}`);

            return lines.join("\n");
          },
          output_format,
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
