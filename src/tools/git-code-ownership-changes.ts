import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { getDirectoryAtDepth, computeBusFactor } from "../analysis/knowledge-map.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

interface PeriodOwnership {
  topContributor: string | null;
  busFactor: number;
  contributors: { email: string; commits: number; percentage: number }[];
}

interface DirectoryOwnershipChange {
  directory: string;
  before: PeriodOwnership;
  after: PeriodOwnership;
  ownershipChanged: boolean;
  busFactorDelta: number;
  newContributors: string[];
  departedContributors: string[];
}

interface OwnershipChangesData {
  periodBoundary: string;
  directories: DirectoryOwnershipChange[];
  summary: {
    directoriesAnalyzed: number;
    ownershipChanges: number;
    avgBusFactorDelta: number;
    riskAreas: string[];
  };
}

async function analyzeOwnershipForPeriod(
  repoPath: string,
  depth: number,
  dateConstraint: string[],
  pathPattern: string | undefined,
  maxCommits: number,
  timeoutMs: number | undefined,
): Promise<Map<string, Map<string, number>>> {
  const args = [
    "log",
    "--format=AUTHOR:%ae",
    "--name-only",
    `--max-count=${maxCommits}`,
    ...dateConstraint,
  ];
  if (pathPattern) args.push("--", pathPattern);

  const output = await execGit(args, repoPath, timeoutMs);
  if (!output.trim()) return new Map();

  const dirMap = new Map<string, Map<string, number>>();
  const sections = output.split(/^AUTHOR:/m).filter((s) => s.trim().length > 0);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const email = lines[0]?.trim();
    if (!email) continue;

    const files = lines.slice(1).map((l) => l.trim()).filter((l) => l.length > 0);
    const dirs = new Set<string>();
    for (const file of files) {
      dirs.add(getDirectoryAtDepth(file, depth));
    }

    for (const dir of dirs) {
      const contributors = dirMap.get(dir) ?? new Map<string, number>();
      contributors.set(email, (contributors.get(email) ?? 0) + 1);
      dirMap.set(dir, contributors);
    }
  }

  return dirMap;
}

function buildPeriodOwnership(contributors: Map<string, number>): PeriodOwnership {
  const total = [...contributors.values()].reduce((a, b) => a + b, 0);
  const sorted = [...contributors.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([email, commits]) => ({
      email,
      commits,
      percentage: total > 0 ? Math.round((commits / total) * 100) : 0,
    }));

  return {
    topContributor: sorted.length > 0 ? sorted[0].email : null,
    busFactor: computeBusFactor(sorted.map((c) => c.commits), total),
    contributors: sorted,
  };
}

export function registerGitCodeOwnershipChanges(server: McpServer): void {
  server.registerTool(
    "git_code_ownership_changes",
    {
      description: "Compare code ownership before and after a date boundary. Detects owner handoffs, bus factor changes, and knowledge transfer patterns per directory.",
      inputSchema: {
      repo_path: z.string().describe("Absolute path to the git repository"),
      period_boundary: z
        .string()
        .describe('Date boundary for comparison, e.g. "2024-06-01" or "6 months ago"'),
      depth: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .default(1)
        .describe("Directory depth for analysis (1-5, default: 1)"),
      path_pattern: z
        .string()
        .optional()
        .describe("Limit analysis to a specific path, e.g. 'src/'"),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(500)
        .describe("Maximum commits to analyze per period (default: 500)"),
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
    async ({ repo_path, period_boundary, depth, path_pattern, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Analyze before and after periods in parallel
        const [beforeMap, afterMap] = await Promise.all([
          analyzeOwnershipForPeriod(
            repo_path, depth,
            [`--until=${period_boundary}`],
            path_pattern, max_commits, timeout_ms,
          ),
          analyzeOwnershipForPeriod(
            repo_path, depth,
            [`--since=${period_boundary}`],
            path_pattern, max_commits, timeout_ms,
          ),
        ]);

        // Merge all directories from both periods
        const allDirs = new Set([...beforeMap.keys(), ...afterMap.keys()]);

        if (allDirs.size === 0) {
          return successResponse(
            `No commits found around boundary ${period_boundary}.`,
          );
        }

        const directories: DirectoryOwnershipChange[] = [];

        for (const dir of allDirs) {
          const beforeContribs = beforeMap.get(dir) ?? new Map<string, number>();
          const afterContribs = afterMap.get(dir) ?? new Map<string, number>();

          const before = buildPeriodOwnership(beforeContribs);
          const after = buildPeriodOwnership(afterContribs);

          const ownershipChanged =
            before.topContributor !== null &&
            after.topContributor !== null &&
            before.topContributor !== after.topContributor;

          const busFactorDelta = after.busFactor - before.busFactor;

          const beforeEmails = new Set(beforeContribs.keys());
          const afterEmails = new Set(afterContribs.keys());
          const newContributors = [...afterEmails].filter((e) => !beforeEmails.has(e));
          const departedContributors = [...beforeEmails].filter((e) => !afterEmails.has(e));

          directories.push({
            directory: dir,
            before,
            after,
            ownershipChanged,
            busFactorDelta,
            newContributors,
            departedContributors,
          });
        }

        // Sort: ownership changes first, then by bus factor delta (negative = risk)
        directories.sort((a, b) => {
          if (a.ownershipChanged !== b.ownershipChanged) {
            return a.ownershipChanged ? -1 : 1;
          }
          return a.busFactorDelta - b.busFactorDelta;
        });

        const ownershipChanges = directories.filter((d) => d.ownershipChanged).length;
        const avgBusFactorDelta = directories.length > 0
          ? Math.round((directories.reduce((sum, d) => sum + d.busFactorDelta, 0) / directories.length) * 10) / 10
          : 0;
        const riskAreas = directories
          .filter((d) => d.busFactorDelta < 0 || d.ownershipChanged)
          .map((d) => d.directory);

        const data: OwnershipChangesData = {
          periodBoundary: period_boundary,
          directories,
          summary: {
            directoriesAnalyzed: directories.length,
            ownershipChanges,
            avgBusFactorDelta,
            riskAreas,
          },
        };

        return formatResponse(data, () => {
          const lines: string[] = [
            `Code ownership changes (boundary: ${period_boundary})`,
            "━".repeat(50),
            `${directories.length} directories analyzed, ${ownershipChanges} ownership change(s)`,
            "",
          ];

          for (const d of directories) {
            const changeMarker = d.ownershipChanged ? " ⚠ OWNER CHANGED" : "";
            const bfDelta = d.busFactorDelta > 0
              ? ` (+${d.busFactorDelta})`
              : d.busFactorDelta < 0
                ? ` (${d.busFactorDelta})`
                : "";

            lines.push(`${d.directory}/${changeMarker}`);
            lines.push(
              `  Before: bus factor ${d.before.busFactor}, top: ${d.before.topContributor ?? "(none)"}`,
            );
            lines.push(
              `  After:  bus factor ${d.after.busFactor}${bfDelta}, top: ${d.after.topContributor ?? "(none)"}`,
            );

            if (d.newContributors.length > 0) {
              lines.push(`  New contributors: ${d.newContributors.join(", ")}`);
            }
            if (d.departedContributors.length > 0) {
              lines.push(`  Departed: ${d.departedContributors.join(", ")}`);
            }
            lines.push("");
          }

          if (riskAreas.length > 0) {
            lines.push("Risk areas:");
            for (const area of riskAreas) {
              lines.push(`  → ${area}`);
            }
          }

          return lines.join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
