#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGitBlameContext } from "./tools/git-blame-context.js";
import { registerGitCodeChurn } from "./tools/git-code-churn.js";
import { registerGitCommitShow } from "./tools/git-commit-show.js";
import { registerGitContributorPatterns } from "./tools/git-contributor-patterns.js";
import { registerGitDiffContext } from "./tools/git-diff-context.js";
import { registerGitFileHistory } from "./tools/git-file-history.js";
import { registerGitHotspots } from "./tools/git-hotspots.js";
import { registerGitMergeBase } from "./tools/git-merge-base.js";
import { registerGitPickaxe } from "./tools/git-pickaxe.js";
import { registerGitRelatedChanges } from "./tools/git-related-changes.js";
import { registerGitSearchCommits } from "./tools/git-search-commits.js";
import { registerGitStaleFiles } from "./tools/git-stale-files.js";
import { registerGitTagList } from "./tools/git-tag-list.js";
import { registerGitFileRiskProfile } from "./tools/git-file-risk-profile.js";
import { registerGitRepoHealth } from "./tools/git-repo-health.js";
import { registerGitReviewPrep } from "./tools/git-review-prep.js";
import { registerGitWhy } from "./tools/git-why.js";
import { registerInvestigateCode } from "./prompts/investigate-code.js";
import { registerReviewPr } from "./prompts/review-pr.js";
import { registerAssessHealth } from "./prompts/assess-health.js";
import { registerTraceChange } from "./prompts/trace-change.js";
import { registerToolGuide } from "./resources/tool-guide.js";

function createServer() {
  const server = new McpServer({
    name: "dig",
    version: "0.1.0",
  });

  // Data retrieval tools (13)
  registerGitFileHistory(server);
  registerGitBlameContext(server);
  registerGitRelatedChanges(server);
  registerGitContributorPatterns(server);
  registerGitSearchCommits(server);
  registerGitCommitShow(server);
  registerGitDiffContext(server);
  registerGitHotspots(server);
  registerGitPickaxe(server);
  registerGitCodeChurn(server);
  registerGitStaleFiles(server);
  registerGitMergeBase(server);
  registerGitTagList(server);

  // Composite analysis tools
  registerGitFileRiskProfile(server);
  registerGitRepoHealth(server);

  // Workflow integration tools
  registerGitReviewPrep(server);
  registerGitWhy(server);

  // Prompts
  registerInvestigateCode(server);
  registerReviewPr(server);
  registerAssessHealth(server);
  registerTraceChange(server);

  // Resources
  registerToolGuide(server);

  return server;
}

// Exported for Smithery registry scanning
export function createSandboxServer() {
  return createServer();
}

const server = createServer();

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-server-dig running on stdio");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
