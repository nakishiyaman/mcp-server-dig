# mcp-server-dig

[English](./README.md) | 日本語

AI によるコード考古学のための MCP サーバー — git blame、ファイル履歴、コントリビューターパターン、変更関連性分析を [Model Context Protocol](https://modelcontextprotocol.io/) を通じて提供します。

## ツール一覧

### 組み合わせ分析

| ツール | 説明 |
|--------|------|
| `git_file_risk_profile` | 単一ファイルの多次元リスク評価 |
| `git_repo_health` | リポジトリ全体の健全性サマリー |

### データ取得

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

### git_pickaxe

特定の文字列や正規表現パターンを追加・削除したコミットを検索します（git の pickaxe 機能）。関数や変数がいつ導入・削除されたかの特定に不可欠です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| search_term | string | はい | コード変更内を検索する文字列または正規表現パターン |
| is_regex | boolean | いいえ | search_term を正規表現 `-G` として扱う（デフォルト: false、リテラル `-S`） |
| max_commits | number | いいえ | 返すコミットの最大数（デフォルト: 20） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| author | string | いいえ | 著者名またはメールでフィルタ |
| path_pattern | string | いいえ | このパスに影響するコミットに限定 |

### git_code_churn

ファイル単位のコードチャーン（追加行数 + 削除行数）を分析します。チャーンが多いファイルは不安定なコード、頻繁なリファクタリング、またはアーキテクチャの見直しが必要な領域を示す可能性があります。`git_hotspots` を補完し、変更頻度だけでなく変更量を計測します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定（例: `"src/"`） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |
| top_n | number | いいえ | 返すファイル数（デフォルト: 20） |

### git_stale_files

長期間更新されていないファイルを検出します。古いファイルはデッドコード、忘れられた設定、またはレビューや削除が必要な技術的負債を示す可能性があります。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| threshold_days | number | いいえ | 古いと判定する最低日数（デフォルト: 180） |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定（例: `"src/"`） |
| top_n | number | いいえ | 返すファイルの最大数（デフォルト: 30） |

### git_merge_base

2つのブランチまたは参照の共通祖先（マージベース）を見つけ、分岐以降の両側のコミットを表示します。ブランチの関係性の理解やマージ内容のレビューに便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| ref1 | string | はい | 1つ目のブランチまたは参照（例: `"main"`） |
| ref2 | string | はい | 2つ目のブランチまたは参照（例: `"feature-branch"`） |
| max_commits | number | いいえ | 各側で表示するコミットの最大数（デフォルト: 50） |

### git_tag_list

タグを作成日順で一覧表示し、関連メッセージも表示します。リリース履歴やバージョニングパターンの把握に便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| pattern | string | いいえ | タグをフィルタする glob パターン（例: `"v1.*"`） |
| max_tags | number | いいえ | 返すタグの最大数（デフォルト: 50） |
| sort | string | いいえ | ソート順: `"newest"` または `"oldest"`（デフォルト: `"newest"`） |

### git_file_risk_profile

単一ファイルの包括的リスク評価。変更頻度、コードチャーン、知識集中度、暗黙の結合、鮮度を組み合わせた多次元プロファイルを返します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |

出力例：

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

リポジトリ全体の健全性サマリー。ファイル数、コミットアクティビティ、ホットスポット、チャーン、コントリビューター分布、古いファイル数を一括で返します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | アクティビティ分析の日付フィルタ |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |
| stale_threshold_days | number | いいえ | 古いと判定する日数（デフォルト: 180） |

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

### Zed

Zed の `settings.json` に追加してください：

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

プロジェクトルートの `.cursor/mcp.json` に追加してください：

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

Windsurf の MCP 設定に追加してください：

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
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
