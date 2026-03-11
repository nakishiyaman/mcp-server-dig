import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { execGit, validateGitRepo } from "../git/executor.js";

const MAX_OUTPUT_LENGTH = 50_000;

async function generateRepoSummary(repoPath: string): Promise<string> {
  await validateGitRepo(repoPath);

  // Parallel git queries for efficiency
  const [branchOutput, logOutput, shortlogOutput, lsFilesOutput, tagOutput] =
    await Promise.all([
      execGit(["branch", "--show-current"], repoPath),
      execGit(
        ["log", "--oneline", "-10"],
        repoPath,
      ),
      execGit(
        ["shortlog", "-sn", "--no-merges", "HEAD"],
        repoPath,
      ),
      execGit(["ls-files"], repoPath),
      execGit(["tag", "--sort=-creatordate"], repoPath).catch(
        () => "",
      ),
    ]);

  const currentBranch = branchOutput.trim() || "(detached HEAD)";
  const files = lsFilesOutput.trim().split("\n").filter(Boolean);
  const fileCount = files.length;

  // Extension breakdown
  const extCounts = new Map<string, number>();
  for (const file of files) {
    const dotIdx = file.lastIndexOf(".");
    const ext = dotIdx >= 0 ? file.slice(dotIdx) : "(no ext)";
    extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
  }
  const topExtensions = [...extCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Contributors
  const contributors = shortlogOutput
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      return match ? { count: parseInt(match[1], 10), name: match[2] } : null;
    })
    .filter(Boolean) as { count: number; name: string }[];

  // Tags
  const tags = tagOutput
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(0, 5);

  const lines: string[] = [
    `# Repository Summary`,
    "",
    `**Path**: ${repoPath}`,
    `**Current branch**: ${currentBranch}`,
    `**Tracked files**: ${fileCount}`,
    `**Contributors**: ${contributors.length}`,
    "",
  ];

  if (tags.length > 0) {
    lines.push("## Recent Tags");
    for (const tag of tags) {
      lines.push(`- ${tag}`);
    }
    lines.push("");
  }

  lines.push("## File Types");
  for (const [ext, count] of topExtensions) {
    lines.push(`- ${ext}: ${count} files`);
  }
  lines.push("");

  lines.push("## Top Contributors");
  for (const c of contributors.slice(0, 10)) {
    lines.push(`- ${c.name}: ${c.count} commits`);
  }
  lines.push("");

  lines.push("## Recent Commits");
  for (const line of logOutput.trim().split("\n").filter(Boolean)) {
    lines.push(`- ${line}`);
  }

  return lines.join("\n");
}

export { generateRepoSummary as _generateRepoSummaryForTest };

export function registerRepoSummary(server: McpServer): void {
  const template = new ResourceTemplate("dig://repo-summary/{path}", {
    list: undefined,
  });

  server.registerResource(
    "repo-summary",
    template,
    {
      description:
        "リポジトリの概要（ブランチ、ファイル数、コントリビューター、最近のコミット等）を動的に生成",
      mimeType: "text/markdown",
    },
    async (uri: URL, variables: Variables) => {
      const repoPath = variables.path as string;

      const summary = await generateRepoSummary(repoPath);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text:
              summary.length > MAX_OUTPUT_LENGTH
                ? summary.slice(0, MAX_OUTPUT_LENGTH) +
                  "\n\n[Output truncated]"
                : summary,
          },
        ],
      };
    },
  );
}
