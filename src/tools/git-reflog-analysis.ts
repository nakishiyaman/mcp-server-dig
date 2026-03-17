import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import type { ReflogEntry } from "../git/types.js";
import { gitRefSchema } from "../git/validators.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

function parseReflogOutput(output: string): ReflogEntry[] {
  const entries: ReflogEntry[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    const parts = line.split("|");
    if (parts.length < 4) continue;
    const [hash, dateStr, rawAction, message] = parts;

    // rawAction format: "commit (initial)", "checkout: moving from X to Y", "reset: moving to X", etc.
    const colonIdx = rawAction.indexOf(":");
    const action = colonIdx >= 0 ? rawAction.slice(0, colonIdx).trim() : rawAction.trim();
    const detail = colonIdx >= 0 ? rawAction.slice(colonIdx + 1).trim() : "";

    entries.push({ hash, action, detail, date: dateStr, message });
  }
  return entries;
}

export function registerGitReflogAnalysis(server: McpServer): void {
  server.registerTool(
    "git_reflog_analysis",
    {
      description:
        "Analyze git reflog entries to understand HEAD movement history. Shows branch switches, resets, rebases, and other ref updates. Useful for recovering lost commits and understanding local workflow patterns.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        ref: gitRefSchema
          .optional()
          .default("HEAD")
          .describe("The ref to show reflog for (default: HEAD)"),
        max_entries: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .default(50)
          .describe("Maximum number of reflog entries to show (default: 50, max: 500)"),
        action_filter: z
          .string()
          .optional()
          .describe(
            "Filter reflog entries by action type (e.g. 'commit', 'checkout', 'reset', 'rebase', 'merge')",
          ),
        timeout_ms: z
          .number()
          .int()
          .min(1000)
          .max(300000)
          .optional()
          .describe("Timeout in ms for git operations (default: 30000, max: 300000)"),
        output_format: outputFormatSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ repo_path, ref, max_entries, action_filter, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = [
          "reflog",
          "show",
          ref,
          `--format=%h|%aI|%gs|%s`,
          `-n`,
          String(max_entries),
        ];

        const raw = await execGit(args, repo_path, timeout_ms);

        if (!raw.trim()) {
          return successResponse(`No reflog entries found for ${ref}.`);
        }

        let entries = parseReflogOutput(raw);

        if (action_filter) {
          const filter = action_filter.toLowerCase();
          entries = entries.filter((e) => e.action.toLowerCase().includes(filter));
        }

        if (entries.length === 0) {
          return successResponse(
            `No reflog entries matching action '${action_filter}' for ${ref}.`,
          );
        }

        // Summary by action type
        const actionCounts = new Map<string, number>();
        for (const e of entries) {
          actionCounts.set(e.action, (actionCounts.get(e.action) ?? 0) + 1);
        }

        const lines: string[] = [
          `Reflog analysis for ${ref}`,
          "━".repeat(50),
          "",
          `Total entries: ${entries.length}`,
          "",
          "Action summary:",
        ];

        const sortedActions = [...actionCounts.entries()].sort((a, b) => b[1] - a[1]);
        for (const [action, count] of sortedActions) {
          lines.push(`  ${action}: ${count}`);
        }

        lines.push("", "Entries:", "");

        for (const e of entries) {
          const date = e.date.slice(0, 10);
          const actionLabel = e.detail ? `${e.action}: ${e.detail}` : e.action;
          lines.push(`  ${e.hash} ${date} [${actionLabel}] ${e.message}`);
        }

        const data = {
          ref,
          totalEntries: entries.length,
          actionSummary: Object.fromEntries(sortedActions),
          entries: entries.map((e) => ({
            hash: e.hash,
            date: e.date,
            action: e.action,
            detail: e.detail,
            message: e.message,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
