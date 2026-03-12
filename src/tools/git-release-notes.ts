import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

interface ConventionalCommit {
  hash: string;
  subject: string;
  author: string;
  email: string;
  date: string;
  type: string;
  scope: string | null;
  description: string;
  isBreaking: boolean;
  breakingNote: string | null;
}

interface CommitGroup {
  type: string;
  commits: ConventionalCommit[];
}

interface ContributorInfo {
  name: string;
  email: string;
  commitCount: number;
}

interface ReleaseNotesData {
  fromRef: string;
  toRef: string;
  totalCommits: number;
  groups: CommitGroup[];
  breakingChanges: ConventionalCommit[];
  contributors: ContributorInfo[];
  dateRange: { from: string | null; to: string | null };
}

const CONVENTIONAL_COMMIT_RE = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

function parseConventionalCommit(
  hash: string,
  subject: string,
  author: string,
  email: string,
  date: string,
  body: string,
): ConventionalCommit {
  const match = subject.match(CONVENTIONAL_COMMIT_RE);

  if (!match) {
    return {
      hash,
      subject,
      author,
      email,
      date,
      type: "other",
      scope: null,
      description: subject,
      isBreaking: false,
      breakingNote: null,
    };
  }

  const [, type, scope, bang, description] = match;
  const isBreakingBang = bang === "!";
  const breakingBodyMatch = body.match(/BREAKING CHANGE:\s*(.+)/);
  const isBreaking = isBreakingBang || breakingBodyMatch !== null;
  const breakingNote = breakingBodyMatch ? breakingBodyMatch[1].trim() : (isBreakingBang ? description : null);

  return {
    hash,
    subject,
    author,
    email,
    date,
    type,
    scope: scope ?? null,
    description,
    isBreaking,
    breakingNote,
  };
}

function groupCommits(
  commits: ConventionalCommit[],
  groupBy: "type" | "scope" | "none",
): CommitGroup[] {
  if (groupBy === "none") {
    return [{ type: "all", commits }];
  }

  const groupMap = new Map<string, ConventionalCommit[]>();

  for (const commit of commits) {
    const key = groupBy === "type"
      ? commit.type
      : (commit.scope ?? "unscoped");
    const group = groupMap.get(key);
    if (group) {
      group.push(commit);
    } else {
      groupMap.set(key, [commit]);
    }
  }

  // Sort groups by conventional commit type order
  const typeOrder = ["feat", "fix", "perf", "refactor", "docs", "test", "chore", "ci", "other"];
  return [...groupMap.entries()]
    .sort(([a], [b]) => {
      const ai = typeOrder.indexOf(a);
      const bi = typeOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map(([type, commits]) => ({ type, commits }));
}

const TYPE_LABELS: Record<string, string> = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance",
  refactor: "Refactoring",
  docs: "Documentation",
  test: "Tests",
  chore: "Chores",
  ci: "CI/CD",
  other: "Other",
};

export function registerGitReleaseNotes(server: McpServer): void {
  server.tool(
    "git_release_notes",
    "Generate release notes between two refs by aggregating and classifying commits using Conventional Commits format. Detects breaking changes, groups by type/scope, and lists contributors.",
    {
      repo_path: z.string().describe("Absolute path to the git repository"),
      from_ref: z
        .string()
        .describe('Start ref (exclusive), e.g. "v1.0.0" or a commit hash'),
      to_ref: z
        .string()
        .optional()
        .default("HEAD")
        .describe('End ref (inclusive), default: "HEAD"'),
      group_by: z
        .enum(["type", "scope", "none"])
        .optional()
        .default("type")
        .describe("Group commits by: type (default), scope, or none"),
      include_breaking: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include breaking changes section (default: true)"),
      max_commits: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(500)
        .describe("Maximum number of commits to analyze (default: 500)"),
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
    async ({ repo_path, from_ref, to_ref, group_by, include_breaking, max_commits, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        // Verify refs exist
        await execGit(["rev-parse", "--verify", from_ref], repo_path, timeout_ms);
        await execGit(["rev-parse", "--verify", to_ref], repo_path, timeout_ms);

        // Get commits between refs with body for BREAKING CHANGE detection
        const SEPARATOR = "---END-COMMIT---";
        const logOutput = await execGit(
          [
            "log",
            "--format=%H|%an|%ae|%aI|%s%n%b" + SEPARATOR,
            `--max-count=${max_commits}`,
            `${from_ref}..${to_ref}`,
          ],
          repo_path,
          timeout_ms,
        );

        // Parse raw output into commits
        const rawEntries = logOutput.split(SEPARATOR).filter((e) => e.trim().length > 0);

        if (rawEntries.length === 0) {
          return successResponse(
            `No commits found between ${from_ref} and ${to_ref}.`,
          );
        }

        const commits: ConventionalCommit[] = [];
        for (const entry of rawEntries) {
          const lines = entry.trim().split("\n");
          const headerLine = lines[0];
          const parts = headerLine.split("|");
          if (parts.length < 5) continue;

          const hash = parts[0];
          const author = parts[1];
          const email = parts[2];
          const date = parts[3];
          const subject = parts.slice(4).join("|");
          const body = lines.slice(1).join("\n").trim();

          commits.push(parseConventionalCommit(hash, subject, author, email, date, body));
        }

        if (commits.length === 0) {
          return successResponse(
            `No commits found between ${from_ref} and ${to_ref}.`,
          );
        }

        // Group commits
        const groups = groupCommits(commits, group_by);

        // Collect breaking changes
        const breakingChanges = include_breaking
          ? commits.filter((c) => c.isBreaking)
          : [];

        // Collect contributors
        const contributorMap = new Map<string, ContributorInfo>();
        for (const commit of commits) {
          const existing = contributorMap.get(commit.email);
          if (existing) {
            existing.commitCount++;
          } else {
            contributorMap.set(commit.email, {
              name: commit.author,
              email: commit.email,
              commitCount: 1,
            });
          }
        }
        const contributors = [...contributorMap.values()]
          .sort((a, b) => b.commitCount - a.commitCount);

        // Date range
        const dates = commits.map((c) => c.date).sort();
        const dateRange = {
          from: dates.length > 0 ? dates[0] : null,
          to: dates.length > 0 ? dates[dates.length - 1] : null,
        };

        const data: ReleaseNotesData = {
          fromRef: from_ref,
          toRef: to_ref,
          totalCommits: commits.length,
          groups,
          breakingChanges,
          contributors,
          dateRange,
        };

        return formatResponse(data, () => {
          const lines: string[] = [
            `Release notes: ${from_ref}..${to_ref}`,
            "━".repeat(50),
            `${commits.length} commit(s), ${contributors.length} contributor(s)`,
            "",
          ];

          // Breaking changes first
          if (breakingChanges.length > 0) {
            lines.push("⚠ BREAKING CHANGES:");
            for (const bc of breakingChanges) {
              const note = bc.breakingNote ? ` — ${bc.breakingNote}` : "";
              lines.push(`  ${bc.hash.slice(0, 8)} ${bc.subject}${note}`);
            }
            lines.push("");
          }

          // Grouped commits
          for (const group of groups) {
            const label = TYPE_LABELS[group.type] ?? group.type;
            lines.push(`${label}:`);
            for (const c of group.commits) {
              const scope = c.scope ? `(${c.scope}) ` : "";
              lines.push(`  ${c.hash.slice(0, 8)} ${scope}${c.description}`);
            }
            lines.push("");
          }

          // Contributors
          lines.push("Contributors:");
          for (const c of contributors) {
            lines.push(`  ${c.name} <${c.email}> (${c.commitCount} commits)`);
          }

          return lines.join("\n");
        }, output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
