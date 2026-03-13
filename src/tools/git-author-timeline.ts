import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

interface AuthorTimeline {
  name: string;
  email: string;
  firstCommitDate: string;
  lastCommitDate: string;
  activeDays: number;
  commitCount: number;
  isSoleOwner: boolean;
}

export function registerGitAuthorTimeline(server: McpServer): void {
  server.tool(
    "git_author_timeline",
    "Analyze author activity periods and team composition changes over time. Shows each author's first and last commit dates, active duration, and identifies sole ownership periods. Useful for understanding team history and onboarding patterns.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      since: z
        .string()
        .optional()
        .describe('Date filter, e.g. "2024-01-01" or "1 year ago"'),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific path, e.g. 'src/'"),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1000)
        .describe("Maximum number of commits to analyze (default: 1000)"),
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
    async ({ repo_path, since, path_pattern, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "log",
          "--format=%aN|%aE|%aI",
          `--max-count=${max_commits}`,
        ];
        if (since) args.push(`--since=${since}`);
        if (path_pattern) {
          args.push("--");
          args.push(path_pattern);
        }

        const output = await execGit(args, repo_path, timeout_ms);
        const lines = output.trim().split("\n").filter((l) => l.length > 0);

        if (lines.length === 0) {
          const sinceMsg = since ? ` since ${since}` : "";
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(
            `No commits found${sinceMsg}${pathMsg}.`,
          );
        }

        // Aggregate per author
        const authorMap = new Map<
          string,
          {
            name: string;
            email: string;
            dates: Date[];
            commitCount: number;
          }
        >();

        for (const line of lines) {
          const parts = line.split("|");
          if (parts.length < 3) continue;
          const [name, email, dateStr] = parts;
          const key = email;
          const date = new Date(dateStr);

          const existing = authorMap.get(key);
          if (existing) {
            existing.dates.push(date);
            existing.commitCount++;
          } else {
            authorMap.set(key, {
              name,
              email,
              dates: [date],
              commitCount: 1,
            });
          }
        }

        const totalAuthors = authorMap.size;
        const timelines: AuthorTimeline[] = [];

        for (const [, data] of authorMap) {
          const sortedDates = data.dates.sort(
            (a, b) => a.getTime() - b.getTime(),
          );
          const firstDate = sortedDates[0];
          const lastDate = sortedDates[sortedDates.length - 1];
          const activeDays = Math.max(
            1,
            Math.ceil(
              (lastDate.getTime() - firstDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );

          timelines.push({
            name: data.name,
            email: data.email,
            firstCommitDate: firstDate.toISOString().slice(0, 10),
            lastCommitDate: lastDate.toISOString().slice(0, 10),
            activeDays,
            commitCount: data.commitCount,
            isSoleOwner: totalAuthors === 1,
          });
        }

        // Sort by first commit date
        timelines.sort(
          (a, b) =>
            new Date(a.firstCommitDate).getTime() -
            new Date(b.firstCommitDate).getTime(),
        );

        // Build output
        const sinceLabel = since ? ` (since ${since})` : "";
        const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
        const sections: string[] = [
          `Author timeline${sinceLabel}${pathLabel}`,
          "━".repeat(50),
          "",
          `Authors: ${totalAuthors}, Commits analyzed: ${lines.length}`,
          "",
        ];

        // Timeline visualization
        for (const t of timelines) {
          const range =
            t.firstCommitDate === t.lastCommitDate
              ? t.firstCommitDate
              : `${t.firstCommitDate} → ${t.lastCommitDate}`;
          const soleLabel = t.isSoleOwner ? " [sole owner]" : "";
          sections.push(`  ${t.name} <${t.email}>`);
          sections.push(
            `    Period: ${range} (${t.activeDays} days)`,
          );
          sections.push(
            `    Commits: ${t.commitCount}${soleLabel}`,
          );
          sections.push("");
        }

        // Team composition insights
        if (totalAuthors > 1) {
          // Find overlapping periods
          const firstOverall = timelines[0].firstCommitDate;
          const lastOverall = timelines[timelines.length - 1].lastCommitDate;
          sections.push(
            `Team span: ${firstOverall} → ${lastOverall}`,
          );

          // Check for periods with sole contributor
          const soloAuthors = timelines.filter(
            (t) => t.commitCount >= lines.length * 0.8,
          );
          if (soloAuthors.length > 0) {
            sections.push(
              `⚠ Dominant contributor: ${soloAuthors.map((a) => a.name).join(", ")} (≥80% of commits)`,
            );
          }
        } else if (totalAuthors === 1) {
          sections.push(
            "⚠ Single author — consider knowledge sharing to reduce bus factor",
          );
        }

        const data = { since: since ?? null, pathPattern: path_pattern ?? null, totalAuthors, totalCommits: lines.length, authors: timelines };
        return formatResponse(data, () => sections.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
