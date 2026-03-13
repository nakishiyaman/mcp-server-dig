import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { classifyIntegrationStyle } from "../analysis/risk-classifiers.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

interface MergeAnalysis {
  totalCommits: number;
  mergeCommits: number;
  mergeRatio: number;
  weeksAnalyzed: number;
  mergesPerWeek: number;
  topMergeSources: Array<{ source: string; count: number }>;
  integrationStyle: string;
}

function parseMergeSources(
  mergeSubjects: string[],
): Array<{ source: string; count: number }> {
  const sourceCounts = new Map<string, number>();

  for (const subject of mergeSubjects) {
    // Match common merge patterns:
    // "Merge branch 'feature-x'"
    // "Merge pull request #123 from user/branch"
    // "Merge remote-tracking branch 'origin/main'"
    const branchMatch = subject.match(
      /Merge (?:branch|pull request #\d+ from) '?([^'"\s]+)/,
    );
    const source = branchMatch ? branchMatch[1] : "other";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  return [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function registerGitCommitGraph(server: McpServer): void {
  server.tool(
    "git_commit_graph",
    "Analyze merge patterns and branch integration topology. Calculates merge ratio, merge frequency, merge sources, and classifies the integration style (continuous, regular, or batch merging).",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      since: z
        .string()
        .optional()
        .default("6 months ago")
        .describe('Analysis period (default: "6 months ago")'),
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
    async ({ repo_path, since, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Get all commits in range
        const allOutput = await execGit(
          [
            "log",
            "--format=%H|%aI|%s",
            `--since=${since}`,
            `--max-count=${max_commits}`,
          ],
          repo_path,
          timeout_ms,
        );

        const allLines = allOutput
          .trim()
          .split("\n")
          .filter((l) => l.length > 0);

        if (allLines.length === 0) {
          return successResponse(
            `No commits found since ${since}.\n\nThe repository may have no commits in this time range.`,
          );
        }

        // Get merge commits
        const mergeOutput = await execGit(
          [
            "log",
            "--merges",
            "--format=%H|%aI|%s",
            `--since=${since}`,
            `--max-count=${max_commits}`,
          ],
          repo_path,
          timeout_ms,
        );

        const mergeLines = mergeOutput
          .trim()
          .split("\n")
          .filter((l) => l.length > 0);

        const totalCommits = allLines.length;
        const mergeCommits = mergeLines.length;
        const mergeRatio =
          totalCommits > 0
            ? Math.round((mergeCommits / totalCommits) * 100) / 100
            : 0;

        // Calculate time span in weeks
        const dates = allLines
          .map((line) => {
            const parts = line.split("|");
            return parts[1] ? new Date(parts[1]).getTime() : 0;
          })
          .filter((d) => d > 0);

        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const weeksAnalyzed = Math.max(
          1,
          Math.round((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)),
        );

        const mergesPerWeek =
          Math.round((mergeCommits / weeksAnalyzed) * 10) / 10;

        // Parse merge sources
        const mergeSubjects = mergeLines.map((line) => {
          const parts = line.split("|");
          return parts.slice(2).join("|");
        });
        const topMergeSources = parseMergeSources(mergeSubjects);

        const integrationStyle = classifyIntegrationStyle(
          mergeRatio,
          mergesPerWeek,
        );

        const analysis: MergeAnalysis = {
          totalCommits,
          mergeCommits,
          mergeRatio,
          weeksAnalyzed,
          mergesPerWeek,
          topMergeSources,
          integrationStyle,
        };

        const sourceLines =
          analysis.topMergeSources.length > 0
            ? analysis.topMergeSources.map(
                (s) => `  ${String(s.count).padStart(4)} merges from ${s.source}`,
              )
            : ["  (no merge sources detected)"];

        const text = [
          `Commit graph analysis (since ${since})`,
          "",
          `Total commits: ${analysis.totalCommits}`,
          `Merge commits: ${analysis.mergeCommits} (${Math.round(analysis.mergeRatio * 100)}%)`,
          `Analysis period: ${analysis.weeksAnalyzed} weeks`,
          `Merge frequency: ${analysis.mergesPerWeek} merges/week`,
          `Integration style: ${analysis.integrationStyle}`,
          "",
          "Top merge sources:",
          ...sourceLines,
        ].join("\n");

        return formatResponse(analysis, () => text, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
