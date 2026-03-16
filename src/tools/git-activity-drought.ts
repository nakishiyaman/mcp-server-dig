import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";
import { formatPeriodKey, generatePeriodRange } from "./period-utils.js";

interface DroughtInfo {
  file: string;
  maxDroughtPeriods: number;
  droughtStart: string;
  droughtEnd: string;
  totalActivePeriods: number;
  totalPeriods: number;
}

export interface ActivityDroughtResult {
  granularity: string;
  since: string;
  pathPattern: string | null;
  minDroughtPeriods: number;
  totalFilesAnalyzed: number;
  droughtFiles: DroughtInfo[];
}

export function registerGitActivityDrought(server: McpServer): void {
  server.registerTool(
    "git_activity_drought",
    {
      description: "Detect files or directories with prolonged periods of no development activity (droughts). Identifies stagnant code by finding consecutive time periods with zero commits, helping surface abandoned or neglected areas.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        path_pattern: z
          .string()
          .optional()
          .describe("Limit analysis to a specific path, e.g. 'src/'"),
        since: z
          .string()
          .optional()
          .default("1 year ago")
          .describe('Start of analysis window (default: "1 year ago")'),
        granularity: z
          .enum(["weekly", "monthly"])
          .optional()
          .default("monthly")
          .describe("Time granularity: 'weekly' or 'monthly' (default)"),
        min_drought_periods: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(2)
          .describe("Minimum consecutive zero-activity periods to report (default: 2)"),
        top_n: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(20)
          .describe("Maximum number of files to return (default: 20)"),
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
    async ({ repo_path, path_pattern, since, granularity, min_drought_periods, top_n, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "log",
          "--format=%H|%aI",
          "--name-only",
          `--since=${since}`,
        ];
        if (path_pattern) {
          args.push("--", path_pattern);
        }

        const output = await execGit(args, repo_path, timeout_ms);
        const lines = output.trim().split("\n").filter((l) => l.length > 0);

        if (lines.length === 0) {
          const pathMsg = path_pattern ? ` in ${path_pattern}` : "";
          return successResponse(
            `No commits found since ${since}${pathMsg}.`,
          );
        }

        // Parse git log: collect commit dates per file
        const fileCommitDates = new Map<string, Set<string>>();
        let currentDate: string | null = null;
        let earliestDate: string | null = null;
        let latestDate: string | null = null;

        for (const line of lines) {
          const parts = line.split("|");
          if (parts.length >= 2 && parts[0].length === 40) {
            currentDate = parts[1];
            if (!earliestDate || currentDate < earliestDate) earliestDate = currentDate;
            if (!latestDate || currentDate > latestDate) latestDate = currentDate;
          } else if (currentDate && line.trim().length > 0) {
            const file = line.trim();
            if (!fileCommitDates.has(file)) {
              fileCommitDates.set(file, new Set());
            }
            fileCommitDates.get(file)!.add(
              formatPeriodKey(currentDate, granularity),
            );
          }
        }

        if (!earliestDate || !latestDate) {
          return successResponse("No file activity found in the specified period.");
        }

        // Generate full period range
        const allPeriods = generatePeriodRange(earliestDate, latestDate, granularity);

        if (allPeriods.length < min_drought_periods) {
          return successResponse(
            `Analysis window too short: only ${allPeriods.length} ${granularity} period(s) found, need at least ${min_drought_periods}.`,
          );
        }

        // Calculate max consecutive drought for each file
        const droughts: DroughtInfo[] = [];

        for (const [file, activePeriods] of fileCommitDates) {
          let maxDrought = 0;
          let currentDrought = 0;
          let maxDroughtStartIdx = 0;
          let maxDroughtEndIdx = 0;
          let droughtStartIdx = 0;

          for (let i = 0; i < allPeriods.length; i++) {
            if (!activePeriods.has(allPeriods[i])) {
              if (currentDrought === 0) droughtStartIdx = i;
              currentDrought++;
              if (currentDrought > maxDrought) {
                maxDrought = currentDrought;
                maxDroughtStartIdx = droughtStartIdx;
                maxDroughtEndIdx = i;
              }
            } else {
              currentDrought = 0;
            }
          }

          if (maxDrought >= min_drought_periods) {
            droughts.push({
              file,
              maxDroughtPeriods: maxDrought,
              droughtStart: allPeriods[maxDroughtStartIdx],
              droughtEnd: allPeriods[maxDroughtEndIdx],
              totalActivePeriods: activePeriods.size,
              totalPeriods: allPeriods.length,
            });
          }
        }

        // Sort by longest drought descending, take top_n
        droughts.sort((a, b) => b.maxDroughtPeriods - a.maxDroughtPeriods);
        const topDroughts = droughts.slice(0, top_n);

        const data: ActivityDroughtResult = {
          granularity,
          since,
          pathPattern: path_pattern ?? null,
          minDroughtPeriods: min_drought_periods,
          totalFilesAnalyzed: fileCommitDates.size,
          droughtFiles: topDroughts,
        };

        return formatResponse(data, () => {
          const pathLabel = path_pattern ? `\nScope: ${path_pattern}` : "";
          const header = [
            `Activity drought analysis — ${granularity}${pathLabel}`,
            `Period: ${allPeriods[0]} to ${allPeriods[allPeriods.length - 1]} (${allPeriods.length} periods)`,
            `Files with ≥${min_drought_periods} consecutive inactive periods: ${topDroughts.length} / ${fileCommitDates.size} files`,
            "",
          ];

          if (topDroughts.length === 0) {
            return [...header, "No drought patterns detected."].join("\n");
          }

          const fileLines = topDroughts.map((d) =>
            `  ${String(d.maxDroughtPeriods).padStart(3)} periods  ${d.droughtStart} → ${d.droughtEnd}  (active: ${d.totalActivePeriods}/${d.totalPeriods})  ${d.file}`,
          );

          return [...header, ...fileLines].join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
