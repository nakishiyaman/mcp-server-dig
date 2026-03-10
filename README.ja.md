# mcp-server-dig

[English](./README.md) | 日本語

AI によるコード考古学のための MCP サーバー — git blame、ファイル履歴、コントリビューターパターン、変更関連性分析を [Model Context Protocol](https://modelcontextprotocol.io/) を通じて提供します。

## ツール一覧

### git_file_history

特定ファイルのコミット履歴を差分統計付きで取得します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| max_commits | number | いいえ | 返すコミットの最大数（デフォルト: 20） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |

### git_blame_context

同一コミットによる連続行をブロックにまとめるセマンティック blame。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| start_line | number | いいえ | 行範囲の開始行 |
| end_line | number | いいえ | 行範囲の終了行 |

### git_related_changes

指定ファイルと一緒に頻繁に変更されるファイルを検出します（共変更分析）。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 100） |
| min_coupling | number | いいえ | 含める最小共変更回数（デフォルト: 2） |

### git_contributor_patterns

コントリビューターパターンの分析 — 誰がどの領域に詳しいかを把握します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| path_pattern | string | いいえ | 分析範囲を絞るディレクトリまたはパス（例: `"src/api/"`） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"1 year ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 500） |

### git_search_commits

キーワードでコミットメッセージを検索します。機能の導入時期、バグ修正、チケット番号に関連するコミットの特定に便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| query | string | はい | コミットメッセージに対する検索文字列 |
| max_commits | number | いいえ | 返すコミットの最大数（デフォルト: 20） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| author | string | いいえ | 著者名またはメールでフィルタ |
| path_pattern | string | いいえ | このパスに影響するコミットに限定 |

### git_commit_show

特定コミットの詳細情報を表示します：完全なメッセージ、変更ファイル一覧、オプションで差分も表示。`git_search_commits` で見つけたコミットの深掘りに便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| commit | string | はい | コミットハッシュ（短縮・完全）、ブランチ名、またはタグ |
| show_diff | boolean | いいえ | 完全な差分を含める（デフォルト: false、統計のみ表示） |

### git_diff_context

2つのコミット、ブランチ、またはタグ間の差分を表示します。リリース間、ブランチ間、または履歴上の任意の2点間の変更内容の把握に便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| commit | string | はい | 対象コミット、ブランチ、またはタグ |
| compare_to | string | いいえ | 比較元（デフォルト: 親コミット） |
| file_path | string | いいえ | 差分を特定ファイルに限定 |
| stat_only | boolean | いいえ | ファイル変更統計のみ表示（デフォルト: false） |
| context_lines | number | いいえ | unified diff のコンテキスト行数（デフォルト: 3） |

### git_hotspots

リポジトリ内で最も頻繁に変更されるファイルを特定します。変更頻度の高いファイルは、技術的負債、活発な開発、またはバグが多い領域を示すことが多いです。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定（例: `"src/"`） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |
| top_n | number | いいえ | 返すファイル数（デフォルト: 20） |

## セットアップ

### 前提条件

- Node.js >= 18
- Git

### インストール

```bash
npm install -g mcp-server-dig
```

ソースからビルドする場合：

```bash
git clone https://github.com/nakishiyaman/mcp-server-dig.git
cd mcp-server-dig
npm install
npm run build
```

### 設定

MCP クライアントの設定ファイル（例: Claude Desktop の `claude_desktop_config.json`）に追加してください：

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
    }
  }
}
```

ソースから実行する場合：

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

## 開発

```bash
npm install
npm run build        # TypeScript コンパイル
npm run typecheck    # 型チェック（出力なし）
npm run lint         # ESLint
npm test             # テスト実行（vitest）
npm run test:watch   # ウォッチモード
```

## ライセンス

MIT
