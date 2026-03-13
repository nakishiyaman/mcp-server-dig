import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { parseLogOutput } from "../git/parsers.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

interface QualityMetrics {
  totalCommits: number;
  conventionalCommitsCount: number;
  conventionalCommitsRate: number;
  averageSubjectLength: number;
  longSubjectCount: number;
  longSubjectRate: number;
  issueReferenceCount: number;
  issueReferenceRate: number;
  typeDistribution: Record<string, number>;
}

export interface CommitMessageQualityResult {
  since: string | null;
  pathPattern: string | null;
  metrics: QualityMetrics;
  longSubjects: Array<{ hash: string; subject: string; length: number }>;
}

const CONVENTIONAL_PATTERN =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+?\))?!?:\s/;
const ISSUE_PATTERN = /#\d+|[A-Z]+-\d+/;
const MAX_SUBJECT_LENGTH = 72;

export function registerGitCommitMessageQuality(server: McpServer): void {
  server.tool(
    "git_commit_message_quality",
    "Analyze commit message quality. Measures Conventional Commits compliance rate, subject length violations, issue reference rate, and type distribution. Useful for enforcing commit message standards and identifying areas where message quality can improve.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      since: z
        .string()
        .optional()
        .describe('Date filter, e.g. "2024-01-01" or "6 months ago"'),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(500)
        .describe("Maximum number of commits to analyze (default: 500)"),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific path, e.g. 'src/'"),
      author: z
        .string()
        .optional()
        .describe("Filter by author name or email"),
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
    async ({
      repo_path,
      since,
      max_commits,
      path_pattern,
      author,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "log",
          `--format=%H|%an|%ae|%aI|%s`,
          `--max-count=${max_commits}`,
        ];
        if (since) args.push(`--since=${since}`);
        if (author) args.push(`--author=${author}`);
        if (path_pattern) args.push("--", path_pattern);

        const output = await execGit(args, repo_path, timeout_ms);

        if (!output.trim()) {
          const sinceMsg = since ? ` since ${since}` : "";
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          const authorMsg = author ? ` by ${author}` : "";
          return successResponse(
            `No commits found${sinceMsg}${pathMsg}${authorMsg}.`,
          );
        }

        const commits = parseLogOutput(output);

        if (commits.length === 0) {
          return successResponse("No commits found to analyze.");
        }

        let conventionalCount = 0;
        let issueRefCount = 0;
        let longSubjectCount = 0;
        let totalSubjectLength = 0;
        const typeDistribution: Record<string, number> = {};
        const longSubjects: Array<{
          hash: string;
          subject: string;
          length: number;
        }> = [];

        for (const commit of commits) {
          const subject = commit.subject;
          totalSubjectLength += subject.length;

          // Conventional Commits check
          const ccMatch = subject.match(CONVENTIONAL_PATTERN);
          if (ccMatch) {
            conventionalCount++;
            const type = ccMatch[1];
            typeDistribution[type] = (typeDistribution[type] ?? 0) + 1;
          }

          // Issue reference check
          if (ISSUE_PATTERN.test(subject)) {
            issueRefCount++;
          }

          // Subject length check
          if (subject.length > MAX_SUBJECT_LENGTH) {
            longSubjectCount++;
            if (longSubjects.length < 5) {
              longSubjects.push({
                hash: commit.hash.slice(0, 7),
                subject,
                length: subject.length,
              });
            }
          }
        }

        const total = commits.length;
        const metrics: QualityMetrics = {
          totalCommits: total,
          conventionalCommitsCount: conventionalCount,
          conventionalCommitsRate:
            total > 0
              ? Math.round((conventionalCount / total) * 100)
              : 0,
          averageSubjectLength:
            total > 0 ? Math.round(totalSubjectLength / total) : 0,
          longSubjectCount,
          longSubjectRate:
            total > 0
              ? Math.round((longSubjectCount / total) * 100)
              : 0,
          issueReferenceCount: issueRefCount,
          issueReferenceRate:
            total > 0 ? Math.round((issueRefCount / total) * 100) : 0,
          typeDistribution,
        };

        const data: CommitMessageQualityResult = {
          since: since ?? null,
          pathPattern: path_pattern ?? null,
          metrics,
          longSubjects,
        };

        return formatResponse(
          data,
          () => {
            const sinceLabel = since ? ` (since ${since})` : "";
            const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
            const authorLabel = author ? `\nAuthor: ${author}` : "";
            const lines: string[] = [
              `Commit message quality analysis${sinceLabel}${pathLabel}${authorLabel}`,
              `Commits analyzed: ${total}`,
              "",
              "Metrics:",
              `  Conventional Commits: ${conventionalCount}/${total} (${metrics.conventionalCommitsRate}%)`,
              `  Avg subject length:   ${metrics.averageSubjectLength} chars`,
              `  Long subjects (>${MAX_SUBJECT_LENGTH}): ${longSubjectCount} (${metrics.longSubjectRate}%)`,
              `  Issue references:     ${issueRefCount}/${total} (${metrics.issueReferenceRate}%)`,
            ];

            const sortedTypes = Object.entries(typeDistribution).sort(
              (a, b) => b[1] - a[1],
            );
            if (sortedTypes.length > 0) {
              lines.push("", "Type distribution:");
              for (const [type, count] of sortedTypes) {
                const pct = Math.round((count / total) * 100);
                lines.push(`  ${type.padEnd(12)} ${String(count).padStart(4)} (${pct}%)`);
              }
            }

            if (longSubjects.length > 0) {
              lines.push("", "Long subjects (top 5):");
              for (const ls of longSubjects) {
                lines.push(
                  `  ${ls.hash} (${ls.length} chars): ${ls.subject.slice(0, 60)}${ls.subject.length > 60 ? "..." : ""}`,
                );
              }
            }

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
