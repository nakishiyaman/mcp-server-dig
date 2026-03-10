# mcp-server-dig

English | [日本語](./README.ja.md)

MCP server for AI-powered code archaeology — explore git blame, file history, contributor patterns, and co-change analysis through the [Model Context Protocol](https://modelcontextprotocol.io/).

## Tools

### git_file_history

Get the commit history for a specific file with diff stats.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| file_path | string | yes | Relative path to the file within the repo |
| max_commits | number | no | Maximum commits to return (default: 20) |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |

### git_blame_context

Semantic blame that groups consecutive lines by the same commit into blocks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| file_path | string | yes | Relative path to the file within the repo |
| start_line | number | no | Start of line range |
| end_line | number | no | End of line range |

### git_related_changes

Find files that frequently change together with a given file (co-change analysis).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| file_path | string | yes | Relative path to the file within the repo |
| max_commits | number | no | How many commits to analyze (default: 100) |
| min_coupling | number | no | Minimum co-change count to include (default: 2) |

### git_contributor_patterns

Analyze contributor patterns — who has expertise in what areas.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| path_pattern | string | no | Directory or path to scope analysis, e.g. `"src/api/"` |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"1 year ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 500) |

### git_search_commits

Search commit messages by keyword. Useful for finding when a feature was introduced, a bug was fixed, or locating commits related to a ticket number.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| query | string | yes | Search string to match against commit messages |
| max_commits | number | no | Maximum number of commits to return (default: 20) |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| author | string | no | Filter by author name or email |
| path_pattern | string | no | Limit search to commits touching this path |

### git_commit_show

Show detailed information about a specific commit: full message, changed files, and optionally the diff. Useful for drilling into a commit found via `git_search_commits`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| commit | string | yes | Commit hash (short or full), branch name, or tag |
| show_diff | boolean | no | Include the full diff output (default: false, shows stat only) |

### git_diff_context

Show the diff between two commits, branches, or tags. Useful for understanding what changed between releases, branches, or any two points in history.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| commit | string | yes | Target commit, branch, or tag |
| compare_to | string | no | Base to compare against (default: parent commit) |
| file_path | string | no | Limit diff to a specific file |
| stat_only | boolean | no | Show only file change statistics (default: false) |
| context_lines | number | no | Number of context lines in unified diff (default: 3) |

### git_hotspots

Identify the most frequently changed files in the repository. Files with high change frequency often indicate areas of technical debt, active development, or bug-prone code.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| path_pattern | string | no | Limit analysis to a specific directory, e.g. `"src/"` |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Number of commits to analyze (default: 500) |
| top_n | number | no | Number of top files to return (default: 20) |

## Setup

### Prerequisites

- Node.js >= 18
- Git

### Install

```bash
npm install -g mcp-server-dig
```

Or build from source:

```bash
git clone https://github.com/nakishiyaman/mcp-server-dig.git
cd mcp-server-dig
npm install
npm run build
```

### Configure

Add to your MCP client configuration (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
    }
  }
}
```

Or if running from source:

```json
{
  "mcpServers": {
    "dig": {
      "command": "node",
      "args": ["./build/index.js"]
    }
  }
}
```

## Development

```bash
npm install
npm run build        # Compile TypeScript
npm run typecheck    # Type check without emitting
npm run lint         # ESLint
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode
```

## License

MIT
