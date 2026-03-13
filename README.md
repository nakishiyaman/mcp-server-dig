# mcp-server-dig

English | [日本語](./README.ja.md)

MCP server for AI-powered code archaeology — explore git blame, file history, contributor patterns, and co-change analysis through the [Model Context Protocol](https://modelcontextprotocol.io/).

## Tools

### Workflow Integration

| Tool | Description |
|------|-------------|
| `git_review_prep` | PR review briefing with risk flags, reviewer suggestions, and missing file detection |
| `git_why` | Code archaeology narrative — explains why code exists by combining blame, commits, contributors, and co-changes |

### Composite Analysis

| Tool | Description |
|------|-------------|
| `git_file_risk_profile` | Multi-dimensional risk assessment for a single file |
| `git_repo_health` | Repository-wide health summary |
| `git_code_ownership_changes` | Compare code ownership before/after a date boundary — detects owner handoffs, bus factor changes, knowledge transfer patterns |
| `git_impact_analysis` | Blast radius analysis for a file or directory — combines co-change networks, contributor overlap, and directory coupling |

### Data Retrieval

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

### git_pickaxe

Search for commits that introduced or removed a specific string or regex pattern in the codebase (git's pickaxe feature). Essential for finding when a function, variable, or pattern first appeared or was removed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| search_term | string | yes | String or regex pattern to search for in code changes |
| is_regex | boolean | no | Treat search_term as regex `-G` instead of literal `-S` (default: false) |
| max_commits | number | no | Maximum number of commits to return (default: 20) |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| author | string | no | Filter by author name or email |
| path_pattern | string | no | Limit search to commits touching this path |

### git_code_churn

Analyze code churn (lines added + deleted) per file. High churn files may indicate unstable code, frequent refactoring, or areas needing architectural attention. Complements `git_hotspots` by measuring change volume, not just frequency.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| path_pattern | string | no | Limit analysis to a specific directory, e.g. `"src/"` |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Number of commits to analyze (default: 500) |
| top_n | number | no | Number of top files to return (default: 20) |

### git_stale_files

Find files that have not been modified for a long time. Stale files may indicate dead code, forgotten configuration, or areas of technical debt that need review or removal.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| threshold_days | number | no | Minimum days since last change to consider stale (default: 180) |
| path_pattern | string | no | Limit analysis to a specific directory, e.g. `"src/"` |
| top_n | number | no | Maximum number of stale files to return (default: 30) |

### git_merge_base

Find the common ancestor (merge base) of two branches or refs and show commits on each side since divergence. Useful for understanding branch relationships and reviewing what will be merged.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| ref1 | string | yes | First branch or ref (e.g. `"main"`) |
| ref2 | string | yes | Second branch or ref (e.g. `"feature-branch"`) |
| max_commits | number | no | Maximum commits to show per side (default: 50) |

### git_tag_list

List tags sorted by creation date with associated messages. Useful for understanding release history and versioning patterns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| pattern | string | no | Glob pattern to filter tags, e.g. `"v1.*"` |
| max_tags | number | no | Maximum number of tags to return (default: 50) |
| sort | string | no | Sort order: `"newest"` or `"oldest"` (default: `"newest"`) |

### git_knowledge_map

Show who owns knowledge of each directory, including bus factor analysis. Helps identify knowledge concentration risks and areas where team cross-training is needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| path_pattern | string | no | Limit analysis to a specific directory, e.g. `"src/"` |
| depth | number | no | Directory depth for aggregation (default: 2) |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"1 year ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 500) |

### git_dependency_map

Visualize implicit dependency networks between directories based on co-change patterns. Directories that frequently change together may have hidden coupling.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| depth | number | no | Directory depth for aggregation (default: 2) |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"1 year ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 500) |
| min_coupling | number | no | Minimum co-change count to include (default: 3) |

### git_bisect_guide

Pre-bisect analysis for identifying bug-introducing commits. Shows commit count in range, estimated bisect steps, hotspots, and relevant commits. Does NOT run `git bisect` itself.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| good_ref | string | yes | Known good reference where the bug did not exist |
| bad_ref | string | no | Known bad reference where the bug exists (default: HEAD) |
| file_path | string | no | Optional file path to focus on |

### git_rename_history

Track the rename history of a file. Reconstructs the full rename chain showing how a file was renamed over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| file_path | string | yes | Relative path to the file within the repo |
| max_entries | number | no | Maximum number of commits to scan (default: 50) |

### git_commit_graph

Analyze merge patterns and branch integration topology. Calculates merge ratio, merge frequency, merge sources, and classifies the integration style.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| since | string | no | Analysis period (default: "6 months ago") |
| max_commits | number | no | Maximum commits to analyze (default: 1000) |

### git_branch_activity

Analyze branch activity levels, classifying branches as active, stale, or abandoned based on recent commit activity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| include_remote | boolean | no | Include remote branches (default: false) |
| stale_days | number | no | Days without commits to consider stale (default: 30) |
| abandoned_days | number | no | Days without commits to consider abandoned (default: 90) |

### git_author_timeline

Analyze author activity periods and team composition changes over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"1 year ago"` |
| path_pattern | string | no | Limit analysis to a specific path, e.g. `"src/"` |
| max_commits | number | no | Maximum commits to analyze (default: 1000) |

### git_commit_frequency

Analyze commit frequency over time periods. Groups commits into daily, weekly, or monthly buckets to identify development patterns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| granularity | string | no | Time granularity: `"daily"`, `"weekly"` (default), or `"monthly"` |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 1000) |
| path_pattern | string | no | Limit analysis to a specific path, e.g. `"src/"` |

### git_release_notes

Generate release notes between two refs by aggregating commits using Conventional Commits format. Groups by type/scope, detects breaking changes, and lists contributors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| from_ref | string | yes | Start ref (tag, branch, or commit) |
| to_ref | string | no | End ref (default: HEAD) |
| group_by | string | no | Grouping: `"type"` (default), `"scope"`, or `"none"` |
| include_breaking | boolean | no | Include breaking changes section (default: true) |
| max_commits | number | no | Maximum commits to analyze (default: 500) |

### git_contributor_network

Analyze contributor collaboration network. Shows which developers work on the same files, revealing team collaboration patterns and knowledge silos.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 500) |
| path_pattern | string | no | Limit analysis to a specific path, e.g. `"src/"` |
| min_shared_files | number | no | Minimum shared files to show a collaboration link (default: 1) |

### git_conflict_history

Detect files that frequently appear in merge commits. High-frequency merge files indicate conflict-prone areas that may need refactoring.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_merges | number | no | Maximum merge commits to analyze (default: 200) |
| top_n | number | no | Number of top files to return (default: 20) |
| path_pattern | string | no | Limit analysis to a specific path, e.g. `"src/"` |

### git_survival_analysis

Analyze code churn trends over time. Shows additions, deletions, net change, and churn rate per period. Useful for identifying refactoring phases and code instability.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| granularity | string | no | Time granularity: `"daily"`, `"weekly"` (default), or `"monthly"` |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 1000) |
| path_pattern | string | no | Limit analysis to a specific path, e.g. `"src/"` |

### git_code_age

Analyze the age distribution of code lines in a file using blame data. Groups lines into age brackets (< 1 month, 1-3 months, 3-6 months, 6-12 months, > 1 year) to visualize how old different parts of a file are.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| file_path | string | yes | Relative path to the file within the repo |

### git_commit_message_quality

Analyze commit message quality metrics including Conventional Commits compliance rate, average subject length, long subject violations (>72 chars), issue reference rate, and type distribution.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 200) |
| path_pattern | string | no | Limit analysis to commits touching this path |
| author | string | no | Filter by author name or email |

### git_code_ownership_changes

Compare code ownership before and after a date boundary. Detects owner handoffs, bus factor changes, new/departed contributors, and knowledge transfer patterns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| period_boundary | string | yes | Date boundary for before/after comparison (e.g. `"2024-06-01"`, `"3 months ago"`) |
| depth | number | no | Directory depth for aggregation (1-5, default: 1) |
| path_pattern | string | no | Limit analysis to a specific directory |
| max_commits | number | no | Maximum commits to analyze (default: 500) |

### git_impact_analysis

Analyze the blast radius of changes to a file or directory. Combines co-change networks, contributor overlap, and directory coupling to assess how far changes might ripple.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| target_path | string | yes | File or directory path to analyze impact for |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Maximum commits to analyze (default: 500) |
| min_coupling | number | no | Minimum co-change count to include (default: 2) |

### git_review_prep

Generate a PR review briefing by analyzing the diff between two refs. Combines diff stats, commit history, hotspot/churn analysis, contributor patterns, and co-change detection to surface risk flags, suggest reviewers, and warn about potentially missing files.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| base_ref | string | yes | Base ref for comparison, e.g. `"main"` |
| head_ref | string | no | Head ref for comparison (default: `"HEAD"`) |
| max_commits | number | no | Number of commits to analyze (default: 500) |

Example output:

```
PR Review Briefing: main...HEAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commits (2):
  abc1234 feat: add new feature
  def5678 fix: handle edge case

Changed files (3, +35 -10):
  src/foo.ts | +25 -5
  src/bar.ts | +10 -5

Risk flags:
  src/foo.ts — HOTSPOT (15 changes), HIGH CHURN (450 lines)

Suggested reviewers:
  Alice <alice@example.com> — 12 commits to src/foo.ts

Potentially missing files:
  src/foo.test.ts — co-changes with src/foo.ts 85% of the time
```

### git_why

Explain why code exists by combining blame, commit context, contributor patterns, and co-change analysis into a narrative. Answers the question "Why does this code look this way?" for a file or line range.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| file_path | string | yes | Relative path to the file within the repo |
| start_line | number | no | Start of line range |
| end_line | number | no | End of line range |
| max_commits | number | no | Maximum number of commits to show in detail (default: 10) |

Example output:

```
Why does this code exist? — src/foo.ts L10-25
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Blame summary (3 commits, 2 authors):

[L10-15] abc1234 | 2024-06-15 | Alice
  Commit: feat: add validation logic
  Files in commit: src/foo.ts, src/foo.test.ts

[L16-25] def5678 | 2024-08-20 | Bob
  Commit: fix: handle null input (Fixes #42)
  Files in commit: src/foo.ts, src/bar.ts

File context:
  Contributors: Alice (80%), Bob (20%)
  Co-changed with: src/foo.test.ts (85%), src/types.ts (60%)
```

### git_file_risk_profile

Comprehensive risk assessment for a single file combining change frequency, code churn, knowledge concentration, implicit coupling, and staleness into a multi-dimensional profile.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| file_path | string | yes | Relative path to the file within the repo |
| since | string | no | Date filter, e.g. `"2024-01-01"` or `"6 months ago"` |
| max_commits | number | no | Number of commits to analyze (default: 500) |

Example output:

```
Risk profile for: src/core/engine.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Change frequency:  HIGH (47 changes, top 3%)
Code churn:        HIGH (1,230 lines churned)
Knowledge risk:    MEDIUM (2 contributors, top owns 78%)
Coupling:          HIGH (12 co-changed files)
Staleness:         LOW (last changed 3 days ago)

Overall: HIGH RISK
Concerns: frequently changing, high code churn, highly coupled
```

### git_repo_health

Repository-wide health summary combining file count, commit activity, top hotspots, highest churn files, contributor distribution, and stale file count into a single overview.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | yes | Absolute path to the git repository |
| since | string | no | Date filter for activity analysis |
| max_commits | number | no | Number of commits to analyze (default: 500) |
| stale_threshold_days | number | no | Days without change to consider stale (default: 180) |

## Prompts

MCP Prompts provide guided workflows that chain multiple tools together for common use cases.

| Prompt | Description | Parameters |
|--------|-------------|------------|
| `investigate-code` | Code investigation — traces why code exists using blame, pickaxe, and file history | `repo_path`, `file_path`, `line_range?` |
| `review-pr` | PR review workflow — generates a review briefing with risk assessment | `repo_path`, `base_ref`, `head_ref?` |
| `assess-health` | Repository health assessment — evaluates overall repo quality | `repo_path` |
| `trace-change` | Change tracing — tracks when and why a specific string was added or removed | `repo_path`, `search_term` |
| `onboard-codebase` | New contributor onboarding — guided tour of repo structure, key contributors, and active areas | `repo_path` |
| `find-bug-origin` | Bug origin hunting — uses bisect analysis to identify bug-introducing commits | `repo_path`, `good_ref`, `bad_ref?`, `file_path?`, `symptom?` |
| `technical-debt` | Technical debt analysis — identifies high-risk files, knowledge concentration, and stale areas | `repo_path` |
| `onboard-area` | Area-specific onboarding — knowledge owners, contributors, and change history for a directory | `repo_path`, `directory` |

## Resources

| URI | Description |
|-----|-------------|
| `dig://tool-guide` | Tool selection guide — maps common questions to the right tool |
| `dig://repo-summary/{path}` | Dynamic repository summary — generates overview with branch, file count, contributors, and recent commits |

## Setup

### Prerequisites

- Node.js >= 22
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

### Zed

Add to your Zed `settings.json`:

```json
{
  "context_servers": {
    "dig": {
      "command": {
        "path": "mcp-server-dig",
        "args": []
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
    }
  }
}
```

## Configuration

### Timeout

All 33 tools accept an optional `timeout_ms` parameter (default: 30000ms, max: 300000ms) for large repositories.

### Output Format

All 33 tools accept an optional `output_format` parameter:
- `"text"` (default) — human-readable formatted output
- `"json"` — structured JSON for programmatic consumption

### Tool Annotations

All 33 tools declare MCP Tool Annotations (`readOnlyHint: true`, `openWorldHint: false`), enabling clients to understand that dig tools are read-only git analysis operations.

### Streamable HTTP Transport

By default, dig runs on stdio. To use Streamable HTTP transport:

```bash
# Via CLI flag
mcp-server-dig --http

# Via environment variable
DIG_TRANSPORT=http mcp-server-dig
```

HTTP mode listens on `http://127.0.0.1:3000/mcp`. Change the port with `DIG_PORT`:

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig",
      "args": ["--http"],
      "env": {
        "DIG_PORT": "8080"
      }
    }
  }
}
```

### Auto-completion

Prompt arguments and resource URI paths support MCP completion protocol for interactive clients.

### Structured Logging

Logging uses the MCP Logging Protocol when connected to a client, with stderr fallback.

Set `DIG_LOG_LEVEL` environment variable to control log verbosity:

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig",
      "env": {
        "DIG_LOG_LEVEL": "debug"
      }
    }
  }
}
```

Available levels: `debug`, `info` (default), `warn`, `error`.

When `DIG_LOG_LEVEL=debug`, every git command execution logs its duration, and the analysis cache logs hit/miss events. This enables performance profiling and bottleneck identification.

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
