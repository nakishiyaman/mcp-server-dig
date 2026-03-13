#!/usr/bin/env node

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AnalysisCache } from "./analysis/cache.js";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export interface ToolContext {
  cache: AnalysisCache;
}
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
import { registerGitKnowledgeMap } from "./tools/git-knowledge-map.js";
import { registerGitDependencyMap } from "./tools/git-dependency-map.js";
import { registerGitBisectGuide } from "./tools/git-bisect-guide.js";
import { registerGitRenameHistory } from "./tools/git-rename-history.js";
import { registerGitCommitGraph } from "./tools/git-commit-graph.js";
import { registerGitBranchActivity } from "./tools/git-branch-activity.js";
import { registerGitAuthorTimeline } from "./tools/git-author-timeline.js";
import { registerGitCommitFrequency } from "./tools/git-commit-frequency.js";
import { registerGitReleaseNotes } from "./tools/git-release-notes.js";
import { registerGitCodeOwnershipChanges } from "./tools/git-code-ownership-changes.js";
import { registerGitImpactAnalysis } from "./tools/git-impact-analysis.js";
import { registerGitContributorNetwork } from "./tools/git-contributor-network.js";
import { registerGitConflictHistory } from "./tools/git-conflict-history.js";
import { registerGitSurvivalAnalysis } from "./tools/git-survival-analysis.js";
import { registerGitCodeAge } from "./tools/git-code-age.js";
import { registerGitCommitMessageQuality } from "./tools/git-commit-message-quality.js";
import { registerInvestigateCode } from "./prompts/investigate-code.js";
import { registerReviewPr } from "./prompts/review-pr.js";
import { registerAssessHealth } from "./prompts/assess-health.js";
import { registerTraceChange } from "./prompts/trace-change.js";
import { registerOnboardCodebase } from "./prompts/onboard-codebase.js";
import { registerFindBugOrigin } from "./prompts/find-bug-origin.js";
import { registerTechnicalDebt } from "./prompts/technical-debt.js";
import { registerOnboardArea } from "./prompts/onboard-area.js";
import { registerToolGuide } from "./resources/tool-guide.js";
import { registerRepoSummary } from "./resources/repo-summary.js";

function createServer() {
  const server = new McpServer({
    name: "dig",
    version,
  });
  const context: ToolContext = {
    cache: new AnalysisCache(),
  };

  // Data retrieval tools (27)
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
  registerGitKnowledgeMap(server);
  registerGitDependencyMap(server);
  registerGitBisectGuide(server);
  registerGitRenameHistory(server);
  registerGitCommitGraph(server);
  registerGitBranchActivity(server);
  registerGitAuthorTimeline(server);
  registerGitCommitFrequency(server);
  registerGitReleaseNotes(server);
  registerGitContributorNetwork(server);
  registerGitConflictHistory(server);
  registerGitSurvivalAnalysis(server);
  registerGitCodeAge(server);
  registerGitCommitMessageQuality(server);

  // Composite analysis tools (with cache context)
  registerGitFileRiskProfile(server, context);
  registerGitRepoHealth(server, context);
  registerGitCodeOwnershipChanges(server);
  registerGitImpactAnalysis(server, context);

  // Workflow integration tools (with cache context)
  registerGitReviewPrep(server, context);
  registerGitWhy(server, context);

  // Prompts
  registerInvestigateCode(server);
  registerReviewPr(server);
  registerAssessHealth(server);
  registerTraceChange(server);
  registerOnboardCodebase(server);
  registerFindBugOrigin(server);
  registerTechnicalDebt(server);
  registerOnboardArea(server);

  // Resources
  registerToolGuide(server);
  registerRepoSummary(server);

  return server;
}

// Exported for Smithery registry scanning
export function createSandboxServer() {
  return createServer();
}

// Only start the stdio server when run as the main entry point.
// When imported as a module (e.g., in tests), skip server startup.
const isMainModule =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMainModule) {
  const server = createServer();

  const main = async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("mcp-server-dig running on stdio", { version });
  };

  main().catch((error) => {
    logger.error("Fatal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
}
