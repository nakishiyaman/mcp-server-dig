import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const TOOL_GUIDE = `# mcp-server-dig ツール使い分けガイド

## 質問パターン → ツール対応表

| 質問 | 使うツール |
|------|-----------|
| このコードは誰がいつ書いた？ | git_blame_context |
| このファイルの変更履歴を見たい | git_file_history |
| この関数はなぜこうなっている？ | git_why |
| この文字列を追加/削除したコミットは？ | git_pickaxe |
| このコミットの詳細を見たい | git_commit_show |
| 2つのブランチの差分は？ | git_diff_context |
| よく一緒に変更されるファイルは？ | git_related_changes |
| このファイルの変更頻度は？ | git_code_churn |
| リポジトリの健全性を知りたい | git_repo_health |
| 変更が多いホットスポットは？ | git_hotspots |
| 放置されているファイルは？ | git_stale_files |
| PRレビューの準備をしたい | git_review_prep |
| コミットメッセージで検索したい | git_search_commits |
| 誰がどの領域を担当している？ | git_contributor_patterns |
| ブランチの分岐点を知りたい | git_merge_base |
| タグ一覧を見たい | git_tag_list |
| ファイルのリスクを評価したい | git_file_risk_profile |
| 誰がどのディレクトリを所有している？ | git_knowledge_map |
| ディレクトリ間の依存関係を知りたい | git_dependency_map |
| バグ導入コミットを特定したい | git_bisect_guide |
| このファイルの以前の名前は？ | git_rename_history |
| マージパターンを分析したい | git_commit_graph |
| ブランチの活性度を知りたい | git_branch_activity |
| 著者の活動期間を知りたい | git_author_timeline |
| 時間帯別のコミット頻度を知りたい | git_commit_frequency |

## カテゴリ別一覧

### データ取得ツール（21個）
- **git_blame_context** — ファイルの各行の著者・日時をブロック単位で表示
- **git_file_history** — ファイルのコミット履歴を時系列で表示
- **git_commit_show** — 特定コミットの詳細（diff含む）を表示
- **git_diff_context** — 2つのref間の差分を表示
- **git_pickaxe** — 特定の文字列を追加/削除したコミットを検索
- **git_search_commits** — コミットメッセージをキーワード検索
- **git_related_changes** — あるファイルと一緒に変更されることが多いファイルを特定
- **git_contributor_patterns** — ファイル/ディレクトリごとの貢献者パターンを分析
- **git_code_churn** — ファイルの変更頻度（追加/削除行数）を分析
- **git_hotspots** — リポジトリ内で変更頻度の高いファイルを特定
- **git_stale_files** — 長期間更新されていないファイルを特定
- **git_merge_base** — 2つのブランチの共通祖先（分岐点）を特定
- **git_tag_list** — タグ一覧を表示
- **git_knowledge_map** — ディレクトリ別の知識所有者マップとバス係数を表示
- **git_dependency_map** — ディレクトリ間の共変更ネットワークを可視化
- **git_bisect_guide** — バグ導入コミット特定の事前分析（bisect自体は実行しない）
- **git_rename_history** — ファイルのリネーム履歴を追跡（rename chainの再構築）
- **git_commit_graph** — マージパターンとブランチ統合トポロジーを分析
- **git_branch_activity** — ブランチの活性度分析（active/stale/abandoned分類）
- **git_author_timeline** — 著者活動タイムラインと所有権分析
- **git_commit_frequency** — 時間帯別コミット頻度分析（日次/週次/月次）

### 組み合わせ分析ツール（2個）
- **git_file_risk_profile** — ファイルのリスク評価（変更頻度、著者数、churn等を統合）
- **git_repo_health** — リポジトリ全体の健全性レポート

### ワークフロー統合ツール（2個）
- **git_review_prep** — PRレビュー用の変更サマリーとリスク情報を一括取得
- **git_why** — コード行の存在理由を blame + コミット詳細で解説

## 共通オプション

### output_format（全25ツール対応）
- \`output_format: "text"\` — デフォルト。人間が読みやすいテキスト形式
- \`output_format: "json"\` — 構造化JSON形式。プログラムからの利用に最適

### timeout_ms（全25ツール対応）
- 大規模リポジトリでタイムアウトする場合に、git操作のタイムアウトを延長できる
- 最小: 1000ms、最大: 300000ms（5分）、デフォルト: 30000ms（30秒）
- 例: \`timeout_ms: 120000\` で2分に延長

## 連携パターン

### コード考古学（なぜこのコードがあるのか調査）
1. git_why → 対象行の来歴を把握
2. git_pickaxe → 関連する文字列の追加/削除履歴を追跡
3. git_file_history → ファイル全体の変遷を確認
4. git_rename_history → ファイルの移動・改名を追跡

### PRレビュー
1. git_review_prep → 変更概要とリスクファイルを把握
2. git_file_risk_profile → 気になるファイルのリスク詳細を確認

### リポジトリ健全性評価
1. git_repo_health → 全体の健全性スコアを確認
2. git_hotspots → 変更集中箇所を特定
3. git_stale_files → メンテナンスが必要なファイルを特定

### 変更追跡
1. git_pickaxe → 特定の文字列変更を含むコミットを検索
2. git_commit_show → 該当コミットの詳細を確認

### オンボーディング（新規参入者向け）
1. git_repo_health → 全体の健全性と基本統計を確認
2. git_contributor_patterns → 主要な貢献者と担当領域を把握
3. git_knowledge_map → ディレクトリ別の知識所有者とバス係数を確認
4. git_hotspots → 開発が活発な領域を特定
5. git_stale_files → メンテナンスが必要なファイルを特定

### バグ原因調査（find-bug-origin Prompt推奨）
1. git_bisect_guide → 範囲内のコミット分析とbisectステップ推定
2. git_blame_context → 疑わしいコードの著者と経緯を確認
3. git_commit_show → 該当コミットの詳細を確認

### 技術的負債分析（technical-debt Prompt推奨）
1. git_hotspots → 変更集中ファイルを特定
2. git_code_churn → 変動量の多いファイルを特定
3. git_stale_files → 放置ファイルを特定
4. git_knowledge_map → 知識集中度を分析

### 領域別オンボーディング（onboard-area Prompt推奨）
1. git_knowledge_map → ディレクトリの知識所有者を確認
2. git_contributor_patterns → 領域の主要貢献者を特定
3. git_hotspots → 変更が集中しているファイルを確認
4. git_file_history → 主要ファイルの変更履歴を確認
`;

export function getToolGuideContent(): string {
  return TOOL_GUIDE;
}

export function registerToolGuide(server: McpServer): void {
  server.registerResource(
    "tool-guide",
    "dig://tool-guide",
    {
      description:
        "25ツールの使い分けガイド（質問パターン→ツール対応表、カテゴリ別一覧、連携パターン）",
      mimeType: "text/markdown",
    },
    () => ({
      contents: [
        {
          uri: "dig://tool-guide",
          mimeType: "text/markdown",
          text: TOOL_GUIDE,
        },
      ],
    }),
  );
}
