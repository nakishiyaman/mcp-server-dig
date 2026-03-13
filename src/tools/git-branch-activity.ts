import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

interface BranchInfo {
  name: string;
  lastCommitDate: string;
  daysSinceLastCommit: number;
  commitCount: number;
  aheadBehind: { ahead: number; behind: number } | null;
  isMerged: boolean;
  activity: "active" | "stale" | "abandoned";
}

function classifyActivity(
  daysSinceLastCommit: number,
  staleDays: number,
  abandonedDays: number,
): "active" | "stale" | "abandoned" {
  if (daysSinceLastCommit >= abandonedDays) return "abandoned";
  if (daysSinceLastCommit >= staleDays) return "stale";
  return "active";
}

export function registerGitBranchActivity(server: McpServer): void {
  server.tool(
    "git_branch_activity",
    "Analyze branch health and activity levels. Combines for-each-ref, rev-list, and log data to classify branches as active, stale, or abandoned. Shows ahead/behind counts relative to the default branch and merge status.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      include_remote: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include remote-tracking branches (default: false)"),
      stale_days: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(30)
        .describe("Days without commits to consider a branch stale (default: 30)"),
      abandoned_days: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(90)
        .describe("Days without commits to consider a branch abandoned (default: 90)"),
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
    async ({ repo_path, include_remote, stale_days, abandoned_days, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Determine the default branch
        let defaultBranch: string;
        try {
          const symbolicRef = await execGit(
            ["symbolic-ref", "refs/remotes/origin/HEAD"],
            repo_path,
            timeout_ms,
          );
          defaultBranch = symbolicRef.trim().replace("refs/remotes/origin/", "");
        } catch {
          // Fallback: try main, then master
          try {
            await execGit(["rev-parse", "--verify", "main"], repo_path, timeout_ms);
            defaultBranch = "main";
          } catch {
            defaultBranch = "master";
          }
        }

        // Get all branches with their last commit dates
        const refPattern = include_remote
          ? "refs/heads/ refs/remotes/"
          : "refs/heads/";
        const refsOutput = await execGit(
          [
            "for-each-ref",
            "--format=%(refname:short)|%(committerdate:iso-strict)|%(objectname:short)",
            "--sort=-committerdate",
            ...refPattern.trim().split(" "),
          ],
          repo_path,
          timeout_ms,
        );

        const refLines = refsOutput.trim().split("\n").filter((l) => l.length > 0);

        if (refLines.length === 0) {
          return successResponse("No branches found.");
        }

        // Get merged branches
        const mergedOutput = await execGit(
          ["branch", "--merged", defaultBranch, "--format=%(refname:short)"],
          repo_path,
          timeout_ms,
        );
        const mergedBranches = new Set(
          mergedOutput.trim().split("\n").filter((l) => l.length > 0),
        );

        const now = Date.now();
        const branches: BranchInfo[] = [];

        for (const line of refLines) {
          const parts = line.split("|");
          if (parts.length < 3) continue;
          const [name, dateStr] = parts;

          // Skip the default branch itself
          if (name === defaultBranch) continue;
          // Skip origin/HEAD
          if (name === "origin/HEAD") continue;

          const commitDate = new Date(dateStr);
          const daysSinceLastCommit = Math.floor(
            (now - commitDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Count commits on this branch not on default
          let commitCount = 0;
          try {
            const countOutput = await execGit(
              ["rev-list", "--count", `${defaultBranch}..${name}`],
              repo_path,
              timeout_ms,
            );
            commitCount = parseInt(countOutput.trim(), 10) || 0;
          } catch {
            // Branch may not diverge from default
          }

          // Ahead/behind relative to default branch
          let aheadBehind: { ahead: number; behind: number } | null = null;
          try {
            const abOutput = await execGit(
              ["rev-list", "--left-right", "--count", `${defaultBranch}...${name}`],
              repo_path,
              timeout_ms,
            );
            const abParts = abOutput.trim().split(/\s+/);
            if (abParts.length === 2) {
              aheadBehind = {
                behind: parseInt(abParts[0], 10) || 0,
                ahead: parseInt(abParts[1], 10) || 0,
              };
            }
          } catch {
            // May fail for disconnected branches
          }

          const isMerged = mergedBranches.has(name);
          const activity = classifyActivity(daysSinceLastCommit, stale_days, abandoned_days);

          branches.push({
            name,
            lastCommitDate: dateStr,
            daysSinceLastCommit,
            commitCount,
            aheadBehind,
            isMerged,
            activity,
          });
        }

        if (branches.length === 0) {
          return successResponse(`No branches found (excluding ${defaultBranch}).`);
        }

        // Group by activity
        const active = branches.filter((b) => b.activity === "active");
        const stale = branches.filter((b) => b.activity === "stale");
        const abandoned = branches.filter((b) => b.activity === "abandoned");

        const lines: string[] = [
          `Branch activity analysis (default: ${defaultBranch})`,
          "━".repeat(50),
          "",
          `Total branches: ${branches.length} (active: ${active.length}, stale: ${stale.length}, abandoned: ${abandoned.length})`,
          "",
        ];

        const formatBranch = (b: BranchInfo): string => {
          const date = b.lastCommitDate.slice(0, 10);
          const merged = b.isMerged ? " [merged]" : "";
          const ab = b.aheadBehind
            ? ` (ahead: ${b.aheadBehind.ahead}, behind: ${b.aheadBehind.behind})`
            : "";
          return `  ${b.name} — ${date}, ${b.daysSinceLastCommit}d ago, ${b.commitCount} unique commits${ab}${merged}`;
        };

        if (active.length > 0) {
          lines.push("Active:");
          for (const b of active) lines.push(formatBranch(b));
          lines.push("");
        }

        if (stale.length > 0) {
          lines.push("Stale:");
          for (const b of stale) lines.push(formatBranch(b));
          lines.push("");
        }

        if (abandoned.length > 0) {
          lines.push("Abandoned:");
          for (const b of abandoned) lines.push(formatBranch(b));
          lines.push("");
        }

        // Recommendations
        const mergedStaleOrAbandoned = branches.filter(
          (b) => b.isMerged && b.activity !== "active",
        );
        if (mergedStaleOrAbandoned.length > 0) {
          lines.push("Cleanup candidates (merged & inactive):");
          for (const b of mergedStaleOrAbandoned) {
            lines.push(`  → ${b.name} (merged, ${b.daysSinceLastCommit}d inactive)`);
          }
        }

        const cleanup = mergedStaleOrAbandoned;
        const data = {
          includeRemote: include_remote,
          staleDays: stale_days,
          abandonedDays: abandoned_days,
          summary: {
            total: branches.length,
            active: active.length,
            stale: stale.length,
            abandoned: abandoned.length,
            cleanupCandidates: cleanup.length,
          },
          branches: branches.map(b => ({
            name: b.name,
            lastCommitDate: b.lastCommitDate,
            daysSinceLastCommit: b.daysSinceLastCommit,
            commitCount: b.commitCount,
            isMerged: b.isMerged,
            activity: b.activity,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
