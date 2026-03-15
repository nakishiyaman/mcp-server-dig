import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayDistribution {
  day: string;
  count: number;
  percentage: number;
}

interface HourDistribution {
  hour: number;
  count: number;
}

interface TimezoneDistribution {
  tz: string;
  count: number;
}

interface PeakWindow {
  day: string;
  hour: number;
  count: number;
}

export interface CommitPatternsResult {
  totalCommits: number;
  dayOfWeek: DayDistribution[];
  hourOfDay: HourDistribution[];
  peakWindows: PeakWindow[];
  weekdayRatio: number;
  weekendRatio: number;
  timezones: TimezoneDistribution[];
}

export function registerGitCommitPatterns(server: McpServer): void {
  server.registerTool(
    "git_commit_patterns",
    {
      description:
        "Analyze commit distribution by day-of-week and hour-of-day. Shows heatmap-style patterns including peak activity windows, weekday/weekend ratios, and timezone distribution. Complements git_commit_frequency which aggregates by daily/weekly/monthly buckets.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        author: z
          .string()
          .optional()
          .describe("Filter by author name or email (substring match)"),
        since: z
          .string()
          .optional()
          .describe('Date filter (e.g. "2024-01-01", "6 months ago")'),
        max_commits: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Maximum number of commits to analyze (default: 1000)"),
        path_pattern: z
          .string()
          .optional()
          .describe('Filter commits affecting paths matching pattern (e.g. "src/")'),
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
      author,
      since,
      max_commits,
      path_pattern,
      timeout_ms,
      output_format,
    }) => {
      try {
        await validateGitRepo(repo_path);

        const limit = max_commits ?? 1000;

        const args = ["log", "--all", `--format=%aI`, `-${limit}`];
        if (author) args.push(`--author=${author}`);
        if (since) args.push(`--since=${since}`);
        if (path_pattern) {
          args.push("--");
          args.push(path_pattern);
        }

        const raw = await execGit(args, repo_path, timeout_ms);
        const lines = raw.split("\n").filter((l) => l.trim());

        if (lines.length === 0) {
          return successResponse("No commits found matching the criteria.");
        }

        // Accumulators
        const dayCounts = new Array<number>(7).fill(0);
        const hourCounts = new Array<number>(24).fill(0);
        const dayHourCounts = new Map<string, number>();
        const tzCounts = new Map<string, number>();

        for (const line of lines) {
          const date = new Date(line.trim());
          if (isNaN(date.getTime())) continue;

          // Extract timezone from ISO 8601 string (e.g., +09:00, -05:00, Z)
          const tzMatch = line.trim().match(/([+-]\d{2}:\d{2}|Z)$/);
          const tz = tzMatch ? tzMatch[1] : "unknown";
          tzCounts.set(tz, (tzCounts.get(tz) ?? 0) + 1);

          // Use author date components directly from ISO string to respect author timezone
          const dateStr = line.trim();
          const timePart = dateStr.slice(11, 13); // HH from HH:MM:SS
          const hour = Number(timePart);

          const day = date.getDay();
          dayCounts[day]++;
          hourCounts[hour]++;

          const key = `${DAY_NAMES[day]}-${hour}`;
          dayHourCounts.set(key, (dayHourCounts.get(key) ?? 0) + 1);
        }

        const totalCommits = lines.length;

        const dayOfWeek: DayDistribution[] = DAY_NAMES.map((day, i) => ({
          day,
          count: dayCounts[i],
          percentage:
            totalCommits > 0
              ? Math.round((dayCounts[i] / totalCommits) * 100)
              : 0,
        }));

        const hourOfDay: HourDistribution[] = Array.from(
          { length: 24 },
          (_, i) => ({
            hour: i,
            count: hourCounts[i],
          }),
        );

        // Top 5 peak windows (day+hour combos)
        const peakWindows: PeakWindow[] = [...dayHourCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key, count]) => {
            const [day, hourStr] = key.split("-");
            return { day, hour: Number(hourStr), count };
          });

        // Weekday (Mon-Fri) vs Weekend (Sat-Sun)
        const weekdayCount =
          dayCounts[1] + dayCounts[2] + dayCounts[3] + dayCounts[4] + dayCounts[5];
        const weekendCount = dayCounts[0] + dayCounts[6];

        const weekdayRatio =
          totalCommits > 0
            ? Math.round((weekdayCount / totalCommits) * 100)
            : 0;
        const weekendRatio =
          totalCommits > 0
            ? Math.round((weekendCount / totalCommits) * 100)
            : 0;

        const timezones: TimezoneDistribution[] = [...tzCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([tz, count]) => ({ tz, count }));

        const data: CommitPatternsResult = {
          totalCommits,
          dayOfWeek,
          hourOfDay,
          peakWindows,
          weekdayRatio,
          weekendRatio,
          timezones,
        };

        return formatResponse(
          data,
          () => {
            const out: string[] = [
              "Commit Patterns",
              `Total commits: ${totalCommits}`,
              "",
              "Day of week distribution:",
            ];

            // Reorder to Mon-Sun for display
            const displayOrder = [1, 2, 3, 4, 5, 6, 0];
            for (const i of displayOrder) {
              const d = dayOfWeek[i];
              const bar = "█".repeat(
                Math.round((d.count / Math.max(...dayCounts)) * 20) || 0,
              );
              out.push(
                `  ${d.day}  ${String(d.count).padStart(5)}  ${String(d.percentage).padStart(3)}%  ${bar}`,
              );
            }

            out.push("");
            out.push(`  Weekday: ${weekdayRatio}%  Weekend: ${weekendRatio}%`);

            out.push("");
            out.push("Hour distribution:");
            for (let h = 0; h < 24; h++) {
              const c = hourCounts[h];
              const bar = "█".repeat(
                Math.round(
                  (c / Math.max(...hourCounts.filter((v) => v > 0), 1)) * 20,
                ) || 0,
              );
              out.push(`  ${String(h).padStart(2)}:00  ${String(c).padStart(5)}  ${bar}`);
            }

            if (peakWindows.length > 0) {
              out.push("");
              out.push("Peak activity windows:");
              for (const pw of peakWindows) {
                out.push(
                  `  ${pw.day} ${String(pw.hour).padStart(2)}:00  ${pw.count} commits`,
                );
              }
            }

            if (timezones.length > 0) {
              out.push("");
              out.push("Timezone distribution:");
              for (const tz of timezones) {
                out.push(`  ${tz.tz.padEnd(8)}  ${tz.count} commits`);
              }
            }

            return out.join("\n");
          },
          output_format,
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
