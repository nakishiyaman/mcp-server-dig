import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
  successResponse,
} from "./response.js";

interface RevertEntry {
  revertHash: string;
  revertDate: string;
  revertAuthor: string;
  revertSubject: string;
  originalHash: string;
  originalDate: string;
  originalSubject: string;
  timeToRevertMs: number;
  affectedFiles: string[];
}

interface HotspotEntry {
  file: string;
  revertCount: number;
}

interface TimeToRevertStats {
  minMs: number;
  maxMs: number;
  medianMs: number;
  avgMs: number;
}

export interface RevertAnalysisResult {
  totalReverts: number;
  reverts: RevertEntry[];
  hotspots: HotspotEntry[];
  timeToRevert: TimeToRevertStats | null;
}

function msToHumanReadable(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function registerGitRevertAnalysis(server: McpServer): void {
  server.registerTool(
    "git_revert_analysis",
    {
      description:
        "Analyze revert patterns in the repository. Detects commits created by 'git revert', links them to their original commits, calculates time-to-revert statistics, and identifies files that are frequently reverted (revert hotspots).",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        since: z
          .string()
          .optional()
          .describe('Date filter (e.g. "2024-01-01", "6 months ago")'),
        path_pattern: z
          .string()
          .optional()
          .describe('Filter reverts affecting paths matching pattern (e.g. "src/")'),
        top_n: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Number of hotspot entries to return (default: 10)"),
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
    async ({ repo_path, since, path_pattern, top_n, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const topN = top_n ?? 10;

        // Find revert commits by subject pattern
        const logArgs = [
          "log",
          "--all",
          "--format=%H%x00%aI%x00%aN%x00%s%x00%b",
          "--grep=^Revert \"",
        ];
        if (since) logArgs.push(`--since=${since}`);
        if (path_pattern) {
          logArgs.push("--");
          logArgs.push(path_pattern);
        }

        const raw = await execGit(logArgs, repo_path, timeout_ms);
        const lines = raw.split("\n").filter((l) => l.trim());

        if (lines.length === 0) {
          return successResponse("No revert commits found.");
        }

        const reverts: RevertEntry[] = [];
        const fileCounts = new Map<string, number>();

        for (const line of lines) {
          const parts = line.split("\0");
          if (parts.length < 4) continue;

          const [revertHash, revertDate, revertAuthor, revertSubject, body = ""] = parts;

          // Extract original commit hash from body: "This reverts commit <hash>."
          const hashMatch = body.match(/This reverts commit ([0-9a-f]+)/);
          if (!hashMatch) continue;

          const originalHash = hashMatch[1];

          // Get original commit info
          let originalDate = "";
          let originalSubject = "";
          try {
            const showRaw = await execGit(
              ["show", originalHash, "--format=%aI%x00%s", "--no-patch"],
              repo_path,
              timeout_ms,
            );
            const showParts = showRaw.trim().split("\0");
            if (showParts.length >= 2) {
              originalDate = showParts[0];
              originalSubject = showParts[1];
            }
          } catch {
            // Original commit might have been removed (e.g., rebased away)
            originalDate = "unknown";
            originalSubject = "unknown (commit not found)";
          }

          // Calculate time-to-revert
          const revertMs = new Date(revertDate).getTime();
          const originalMs = originalDate !== "unknown" ? new Date(originalDate).getTime() : 0;
          const timeToRevertMs = originalMs > 0 ? revertMs - originalMs : 0;

          // Get affected files
          let affectedFiles: string[] = [];
          try {
            const filesRaw = await execGit(
              ["diff-tree", "--no-commit-id", "-r", "--name-only", revertHash],
              repo_path,
              timeout_ms,
            );
            affectedFiles = filesRaw.split("\n").filter((f) => f.trim());
          } catch {
            // Ignore errors getting file list
          }

          // Count file occurrences for hotspots
          for (const file of affectedFiles) {
            fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
          }

          reverts.push({
            revertHash,
            revertDate,
            revertAuthor,
            revertSubject,
            originalHash,
            originalDate,
            originalSubject,
            timeToRevertMs,
            affectedFiles,
          });
        }

        // Sort hotspots by revert count
        const hotspots: HotspotEntry[] = [...fileCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, topN)
          .map(([file, revertCount]) => ({ file, revertCount }));

        // Calculate time-to-revert stats
        const validTimes = reverts
          .map((r) => r.timeToRevertMs)
          .filter((t) => t > 0)
          .sort((a, b) => a - b);

        let timeToRevert: TimeToRevertStats | null = null;
        if (validTimes.length > 0) {
          const sum = validTimes.reduce((a, b) => a + b, 0);
          const mid = Math.floor(validTimes.length / 2);
          timeToRevert = {
            minMs: validTimes[0],
            maxMs: validTimes[validTimes.length - 1],
            medianMs:
              validTimes.length % 2 === 0
                ? Math.floor((validTimes[mid - 1] + validTimes[mid]) / 2)
                : validTimes[mid],
            avgMs: Math.floor(sum / validTimes.length),
          };
        }

        const data: RevertAnalysisResult = {
          totalReverts: reverts.length,
          reverts,
          hotspots,
          timeToRevert,
        };

        return formatResponse(
          data,
          () => {
            const out: string[] = [
              "Revert Analysis",
              `Total reverts: ${reverts.length}`,
            ];

            if (timeToRevert) {
              out.push("");
              out.push("Time-to-revert statistics:");
              out.push(`  Min:    ${msToHumanReadable(timeToRevert.minMs)}`);
              out.push(`  Max:    ${msToHumanReadable(timeToRevert.maxMs)}`);
              out.push(`  Median: ${msToHumanReadable(timeToRevert.medianMs)}`);
              out.push(`  Avg:    ${msToHumanReadable(timeToRevert.avgMs)}`);
            }

            if (hotspots.length > 0) {
              out.push("");
              out.push("Revert hotspots (files most frequently reverted):");
              for (const h of hotspots) {
                out.push(`  ${String(h.revertCount).padStart(3)} reverts  ${h.file}`);
              }
            }

            out.push("");
            out.push("Revert details:");
            for (const r of reverts) {
              out.push(`  ${r.revertHash.slice(0, 8)}  ${r.revertDate.slice(0, 10)}  ${r.revertAuthor}`);
              out.push(`    Reverted: ${r.originalHash.slice(0, 8)}  "${r.originalSubject}"`);
              if (r.timeToRevertMs > 0) {
                out.push(`    Time-to-revert: ${msToHumanReadable(r.timeToRevertMs)}`);
              }
              out.push(`    Files: ${r.affectedFiles.join(", ") || "none"}`);
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
