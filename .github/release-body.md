## インストール / Installation

### npx（推奨）

```bash
npx mcp-server-dig
```

### Claude Desktop

`claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "dig": {
      "command": "npx",
      "args": ["-y", "mcp-server-dig"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add dig -- npx -y mcp-server-dig
```

### Zed

`settings.json` に追加:

```json
{
  "context_servers": {
    "mcp-server-dig": {
      "command": {
        "path": "npx",
        "args": ["-y", "mcp-server-dig"]
      }
    }
  }
}
```

## ツール一覧 / Available Tools

| Tool | Description |
|------|-------------|
| `git_file_history` | File change history |
| `git_blame_context` | Blame with context |
| `git_related_changes` | Co-changed files |
| `git_contributor_patterns` | Contributor analysis |
| `git_search_commits` | Commit message search |
| `git_commit_show` | Commit details |
| `git_diff_context` | Diff between refs |
| `git_hotspots` | Change frequency hotspots |
| `git_pickaxe` | Code addition/removal search |
| `git_code_churn` | File-level churn analysis |
| `git_stale_files` | Stale file detection |
| `git_merge_base` | Branch merge-base analysis |
| `git_tag_list` | Tag/release listing |
