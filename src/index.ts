#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGitBlameContext } from "./tools/git-blame-context.js";
import { registerGitContributorPatterns } from "./tools/git-contributor-patterns.js";
import { registerGitFileHistory } from "./tools/git-file-history.js";
import { registerGitRelatedChanges } from "./tools/git-related-changes.js";

const server = new McpServer({
  name: "dig",
  version: "0.1.0",
});

registerGitFileHistory(server);
registerGitBlameContext(server);
registerGitRelatedChanges(server);
registerGitContributorPatterns(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-server-dig running on stdio");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
