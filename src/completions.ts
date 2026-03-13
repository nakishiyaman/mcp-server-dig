/**
 * Auto-completion handlers for prompt arguments and resource URIs.
 * Uses the MCP SDK's completable() to provide suggestions for:
 * - Prompt names (8 prompts)
 * - Resource URI paths (repo-summary template)
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { z } from "zod";
import { execGit } from "./git/executor.js";

const PROMPT_NAMES = [
  "investigate-code",
  "review-pr",
  "assess-health",
  "trace-change",
  "onboard-codebase",
  "find-bug-origin",
  "technical-debt",
  "onboard-area",
];

/**
 * Creates a completable schema for prompt name suggestions.
 */
export function completablePromptName() {
  return completable(
    z.string().describe("Prompt name"),
    (value: string) => PROMPT_NAMES.filter((name) => name.startsWith(value)),
  );
}

/**
 * Attempts to discover git repository paths for path completion.
 * Returns paths based on common locations and git rev-parse.
 */
async function completeRepoPath(value: string): Promise<string[]> {
  try {
    // If value looks like a path, try to find git repos under it
    const searchPath = value || process.cwd();
    const toplevel = await execGit(
      ["rev-parse", "--show-toplevel"],
      searchPath,
    );
    return [toplevel.trim()];
  } catch {
    // Not a git repo, return empty
    return [];
  }
}

/**
 * Creates a ResourceTemplate with path completion for repo-summary.
 */
export function createCompletableRepoSummaryTemplate(): ResourceTemplate {
  return new ResourceTemplate("dig://repo-summary/{path}", {
    list: undefined,
    complete: {
      path: (value: string) => completeRepoPath(value),
    },
  });
}

/**
 * Registers a completable resource for repo-summary.
 * This replaces the original repo-summary resource registration
 * with one that supports auto-completion of the path variable.
 */
export function registerCompletableRepoSummary(
  server: McpServer,
  readCallback: (uri: URL, variables: Variables) => Promise<{ contents: { uri: string; mimeType: string; text: string }[] }>,
): void {
  const template = createCompletableRepoSummaryTemplate();

  server.registerResource(
    "repo-summary",
    template,
    {
      description:
        "リポジトリの概要（ブランチ、ファイル数、コントリビューター、最近のコミット等）を動的に生成",
      mimeType: "text/markdown",
    },
    readCallback,
  );
}

export { PROMPT_NAMES, completeRepoPath };
