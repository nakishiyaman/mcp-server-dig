import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execGit, validateGitRepo } from "../git/executor.js";
import type { CherryPickEntry } from "../git/types.js";
import { gitRefSchema } from "../git/validators.js";
import { errorResponse, formatResponse, outputFormatSchema, successResponse } from "./response.js";

function parseCherryOutput(output: string): CherryPickEntry[] {
  const entries: CherryPickEntry[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    // git cherry -v output: "+ <hash> <subject>" or "- <hash> <subject>"
    const match = line.match(/^([+-])\s+([0-9a-f]+)\s+(.*)$/);
    if (!match) continue;
    const [, sign, hash, subject] = match;
    entries.push({
      status: sign === "-" ? "equivalent" : "not-applied",
      hash,
      subject,
    });
  }
  return entries;
}

export function registerGitCherryPickDetect(server: McpServer): void {
  server.registerTool(
    "git_cherry_pick_detect",
    {
      description:
        "Detect cherry-picked or equivalent commits between branches using git cherry. Shows which commits from HEAD (or a specified branch) have already been applied to upstream, and which are unique. Useful for identifying duplicate work across branches.",
      inputSchema: {
        repo_path: z.string().describe("Absolute path to the git repository"),
        upstream: gitRefSchema.describe(
          "The upstream branch to compare against (e.g. 'main')",
        ),
        head: gitRefSchema
          .optional()
          .describe("The branch to check (default: current HEAD)"),
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
    async ({ repo_path, upstream, head, timeout_ms, output_format }) => {
      try {
        await validateGitRepo(repo_path);

        const args = ["cherry", "-v", upstream];
        if (head) {
          args.push(head);
        }

        const raw = await execGit(args, repo_path, timeout_ms);

        if (!raw.trim()) {
          return successResponse(
            `No commits to compare between ${upstream} and ${head ?? "HEAD"}.`,
          );
        }

        const entries = parseCherryOutput(raw);

        const equivalent = entries.filter((e) => e.status === "equivalent");
        const notApplied = entries.filter((e) => e.status === "not-applied");

        const headLabel = head ?? "HEAD";

        const lines: string[] = [
          `Cherry-pick detection: ${upstream} ← ${headLabel}`,
          "━".repeat(50),
          "",
          `Total commits: ${entries.length}`,
          `  Equivalent (already in ${upstream}): ${equivalent.length}`,
          `  Not applied (unique to ${headLabel}): ${notApplied.length}`,
          "",
        ];

        if (equivalent.length > 0) {
          lines.push(`Equivalent commits (cherry-picked to ${upstream}):`);
          for (const e of equivalent) {
            lines.push(`  - ${e.hash} ${e.subject}`);
          }
          lines.push("");
        }

        if (notApplied.length > 0) {
          lines.push(`Not applied (unique to ${headLabel}):`);
          for (const e of notApplied) {
            lines.push(`  + ${e.hash} ${e.subject}`);
          }
          lines.push("");
        }

        const data = {
          upstream,
          head: headLabel,
          summary: {
            total: entries.length,
            equivalent: equivalent.length,
            notApplied: notApplied.length,
          },
          entries: entries.map((e) => ({
            status: e.status,
            hash: e.hash,
            subject: e.subject,
          })),
        };

        return formatResponse(data, () => lines.join("\n"), output_format);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
