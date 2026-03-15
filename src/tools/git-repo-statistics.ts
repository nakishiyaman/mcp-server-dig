import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import {
  errorResponse,
  formatResponse,
  outputFormatSchema,
} from "./response.js";

interface LargestFile {
  path: string;
  sizeBytes: number;
}

export interface RepoStatisticsResult {
  objectCount: number;
  packCount: number;
  sizeKB: number;
  sizePackKB: number;
  totalCommits: number;
  branchCount: number;
  tagCount: number;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  largestFiles: LargestFile[];
}

function parseCountObjects(raw: string): {
  objectCount: number;
  packCount: number;
  sizeKB: number;
  sizePackKB: number;
} {
  const map = new Map<string, number>();
  for (const line of raw.split("\n")) {
    const match = line.match(/^(.+?):\s*(\d+)/);
    if (match) {
      map.set(match[1].trim(), Number(match[2]));
    }
  }
  return {
    objectCount:
      (map.get("count") ?? 0) + (map.get("in-pack") ?? 0),
    packCount: map.get("packs") ?? 0,
    sizeKB: map.get("size") ?? 0,
    sizePackKB: map.get("size-pack") ?? 0,
  };
}

function parseLsTree(raw: string, topN: number): LargestFile[] {
  const files: LargestFile[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    // format: <mode> <type> <hash> <size>\t<path>
    const match = line.match(/^\S+\s+\S+\s+\S+\s+(\d+)\t(.+)$/);
    if (match) {
      files.push({
        path: match[2],
        sizeBytes: Number(match[1]),
      });
    }
  }
  files.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return files.slice(0, topN);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function registerGitRepoStatistics(server: McpServer): void {
  server.registerTool(
    "git_repo_statistics",
    {
      description:
        "Analyze repository physical structure and size metrics. Reports object counts, pack statistics, total commits, branch/tag counts, repository age (first/last commit), and largest tracked files. Complements git_repo_health which focuses on commit-pattern-based health scoring.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        top_n_files: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(
            "Number of largest tracked files to include (default: 10)",
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
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ repo_path, top_n_files, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const topN = top_n_files ?? 10;

        // Run independent git commands in parallel
        const [countObjectsRaw, commitCountRaw, branchesRaw, tagsRaw, firstCommitRaw, lastCommitRaw, lsTreeRaw] =
          await Promise.all([
            execGit(["count-objects", "-v"], repo_path, timeout_ms),
            execGit(["rev-list", "--count", "--all"], repo_path, timeout_ms),
            execGit(["branch", "-a"], repo_path, timeout_ms),
            execGit(["tag", "-l"], repo_path, timeout_ms).catch(() => ""),
            execGit(
              ["log", "--all", "--format=%aI", "--reverse"],
              repo_path,
              timeout_ms,
            ).then((out) => out.split("\n")[0]?.trim() ?? ""),
            execGit(
              ["log", "--all", "--format=%aI"],
              repo_path,
              timeout_ms,
            ).then((out) => out.split("\n")[0]?.trim() ?? ""),
            execGit(
              ["ls-tree", "-r", "-l", "HEAD"],
              repo_path,
              timeout_ms,
            ).catch(() => ""),
          ]);

        const { objectCount, packCount, sizeKB, sizePackKB } =
          parseCountObjects(countObjectsRaw);

        const totalCommits = Number(commitCountRaw.trim()) || 0;

        const branchCount = branchesRaw
          .split("\n")
          .filter((l) => l.trim()).length;

        const tagCount = tagsRaw
          .split("\n")
          .filter((l) => l.trim()).length;

        const firstCommitDate = firstCommitRaw || null;
        const lastCommitDate = lastCommitRaw || null;

        const largestFiles = parseLsTree(lsTreeRaw, topN);

        const data: RepoStatisticsResult = {
          objectCount,
          packCount,
          sizeKB,
          sizePackKB,
          totalCommits,
          branchCount,
          tagCount,
          firstCommitDate,
          lastCommitDate,
          largestFiles,
        };

        return formatResponse(
          data,
          () => {
            const lines: string[] = [
              "Repository Statistics",
              "",
              `  Objects:        ${objectCount}`,
              `  Packs:          ${packCount}`,
              `  Size:           ${sizeKB} KB (loose) / ${sizePackKB} KB (packed)`,
              "",
              `  Total commits:  ${totalCommits}`,
              `  Branches:       ${branchCount}`,
              `  Tags:           ${tagCount}`,
              "",
            ];

            if (firstCommitDate) {
              lines.push(`  First commit:   ${firstCommitDate}`);
            }
            if (lastCommitDate) {
              lines.push(`  Last commit:    ${lastCommitDate}`);
            }

            if (firstCommitDate && lastCommitDate) {
              const first = new Date(firstCommitDate);
              const last = new Date(lastCommitDate);
              const days = Math.floor(
                (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24),
              );
              lines.push(`  Repository age: ${days} days`);
            }

            if (largestFiles.length > 0) {
              lines.push("");
              lines.push(`Largest tracked files (top ${topN}):`);
              for (const f of largestFiles) {
                lines.push(
                  `  ${formatSize(f.sizeBytes).padStart(10)}  ${f.path}`,
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
