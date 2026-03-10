#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGitBlameContext } from "./tools/git-blame-context.js";
import { registerGitCommitShow } from "./tools/git-commit-show.js";
import { registerGitContributorPatterns } from "./tools/git-contributor-patterns.js";
import { registerGitDiffContext } from "./tools/git-diff-context.js";
import { registerGitFileHistory } from "./tools/git-file-history.js";
import { registerGitHotspots } from "./tools/git-hotspots.js";
import { registerGitRelatedChanges } from "./tools/git-related-changes.js";
import { registerGitSearchCommits } from "./tools/git-search-commits.js";

const server = new McpServer({
  name: "dig",
  version: "0.1.0",
});

registerGitFileHistory(server);
registerGitBlameContext(server);
registerGitRelatedChanges(server);
registerGitContributorPatterns(server);
registerGitSearchCommits(server);
registerGitCommitShow(server);
registerGitDiffContext(server);
registerGitHotspots(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-server-dig running on stdio");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
