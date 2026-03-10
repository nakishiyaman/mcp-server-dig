# mcp-server-dig

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
git clone https://github.com/your-username/mcp-server-dig.git
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
