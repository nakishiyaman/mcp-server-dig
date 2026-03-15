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
| リリースノートを生成したい | git_release_notes |
| コード所有権の変化を追いたい | git_code_ownership_changes |
| 変更の影響範囲を知りたい | git_impact_analysis |
| 開発者間のコラボレーション関係を知りたい | git_contributor_network |
| マージで頻繁に変更されるファイルは？ | git_conflict_history |
| コードの追加/削除トレンドを知りたい | git_survival_analysis |
| ファイル内のコード年齢分布を知りたい | git_code_age |
| コミットメッセージの品質を分析したい | git_commit_message_quality |
| reflogでHEADの移動履歴を見たい | git_reflog_analysis |
| cherry-pick済みコミットを検出したい | git_cherry_pick_detect |
| 特定の行や関数の変遷を追いたい | git_line_history |
| 関連コミットのまとまりを検出したい | git_commit_cluster |
| コントリビューター離脱時のリスクを知りたい | git_knowledge_loss_risk |
| メトリクスの時系列トレンドを知りたい | git_trend_analysis |
| リファクタリング候補をランキングしたい | git_refactor_candidates |
| リリース間のメトリクスを比較したい | git_release_comparison |
| 保守困難度を6次元で評価したい | git_complexity_hotspots |
| マージ頻度の時系列推移を知りたい | git_merge_timeline |
| リポジトリの物理的なサイズ・構造を知りたい | git_repo_statistics |
| 曜日・時間帯別のコミットパターンを知りたい | git_commit_patterns |
| リバートパターンを分析したい | git_revert_analysis |
| コントリビューターの増減・定着率を知りたい | git_contributor_growth |

## カテゴリ別一覧

### データ取得ツール（35個）
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
- **git_release_notes** — 2つのref間のリリースノートを生成（Conventional Commits分類）
- **git_contributor_network** — コントリビューター間のコラボレーションネットワーク分析
- **git_conflict_history** — マージコミットで頻繁に変更されるファイルを検出
- **git_survival_analysis** — コードチャーンの時系列トレンド分析（追加/削除/チャーンレート）
- **git_code_age** — ファイル内の行を年齢ブラケット別に集計（blame出力ベース）
- **git_commit_message_quality** — コミットメッセージ品質分析（Conventional Commits準拠率・長さ・issue参照率）
- **git_reflog_analysis** — reflogエントリ分析（HEAD移動履歴・アクション別集計・フィルタ）
- **git_cherry_pick_detect** — cherry-pick検出（git cherry -vベース、equivalent/not-applied分類）
- **git_line_history** — 特定の行範囲や関数の変遷履歴（git log -Lベース、blameやfile_historyでは不可能な行レベル進化追跡）
- **git_commit_cluster** — 時間近接性+ファイル共有度で関連コミット群を検出（logical changeset境界の可視化）
- **git_merge_timeline** — マージ頻度の時系列推移を可視化（期間別マージ回数・ブランチ数・トレンド方向）
- **git_repo_statistics** — リポジトリの物理的構造・規模分析（オブジェクト数・パックサイズ・最大ファイル・リポジトリ年齢）
- **git_commit_patterns** — 曜日・時間帯別コミット分布ヒートマップ分析（ピーク活動ウィンドウ・平日/週末比率・TZ分布）
- **git_revert_analysis** — リバートパターン分析（リバート検出・オリジナルコミット紐付け・time-to-revert統計・リバートホットスポット）

### 組み合わせ分析ツール（10個）
- **git_file_risk_profile** — ファイルのリスク評価（変更頻度、著者数、churn等を統合）
- **git_repo_health** — リポジトリ全体の健全性レポート
- **git_code_ownership_changes** — 日付境界でのコード所有権比較（所有者交代・バス係数変化検出）
- **git_impact_analysis** — 変更のblast radius分析（co-change・コントリビューター重複・ディレクトリ結合度統合）
- **git_knowledge_loss_risk** — コントリビューター離脱時の知識喪失リスク評価（bus factor=1ディレクトリ特定・回復コスト分類）
- **git_trend_analysis** — メトリクスの期間比較トレンド分析（hotspots/churn/contributors/commit_count）
- **git_refactor_candidates** — リポジトリ全体から5次元リスク評価でリファクタリング候補をランキング
- **git_release_comparison** — 2つのref間でhotspots/churn/contributors/bus factorを比較
- **git_complexity_hotspots** — 6次元リスク評価（変更頻度・churn・知識集中・結合度・陳腐化・コンフリクト頻度）で保守困難度をランキング
- **git_contributor_growth** — コントリビューター増減・定着率の時系列分析（新規/離脱検出・bus factorトレンド・growing/stable/shrinking判定）

### ワークフロー統合ツール（2個）
- **git_review_prep** — PRレビュー用の変更サマリーとリスク情報を一括取得
- **git_why** — コード行の存在理由を blame + コミット詳細で解説

## 共通オプション

### output_format（全47ツール対応）
- \`output_format: "text"\` — デフォルト。人間が読みやすいテキスト形式
- \`output_format: "json"\` — 構造化JSON形式。プログラムからの利用に最適

### timeout_ms（全47ツール対応）
- 大規模リポジトリでタイムアウトする場合に、git操作のタイムアウトを延長できる
- 最小: 1000ms、最大: 300000ms（5分）、デフォルト: 30000ms（30秒）
- 例: \`timeout_ms: 120000\` で2分に延長

## Tool Annotations

全47ツールにMCP Tool Annotationsが設定されています:
- \`readOnlyHint: true\` — 全ツールが読み取り専用（gitリポジトリを変更しない）
- \`openWorldHint: false\` — 全ツールがローカルgitリポジトリのみを対象とする

## トランスポート

- **stdio**（デフォルト）— 標準入出力。Claude Desktop、Claude Code等のクライアント向け
- **Streamable HTTP** — \`--http\`フラグまたは\`DIG_TRANSPORT=http\`で有効化。\`http://127.0.0.1:3000/mcp\`でリッスン（\`DIG_PORT\`でポート変更可）

## 連携パターン

### コード考古学（なぜこのコードがあるのか調査）
1. git_why → 対象行の来歴を把握
2. git_line_history → 特定の関数/行範囲の変遷を追跡
3. git_pickaxe → 関連する文字列の追加/削除履歴を追跡
4. git_file_history → ファイル全体の変遷を確認
5. git_rename_history → ファイルの移動・改名を追跡

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

### 知識喪失リスク評価
1. git_knowledge_loss_risk → コントリビューター別の離脱リスクを評価
2. git_knowledge_map → ディレクトリ別の知識集中度を詳細確認
3. git_author_timeline → 主要コントリビューターの活動期間を確認

### トレンド分析（品質改善/悪化の検出）
1. git_trend_analysis → hotspots/churn/contributorsの時系列トレンド
2. git_hotspots → トレンド悪化時の変更集中ファイル特定
3. git_file_risk_profile → リスクの高いファイルの詳細確認

### リファクタリング計画（plan-refactoring Prompt推奨）
1. git_refactor_candidates → リポジトリ全体のリファクタリング候補をランキング
2. git_file_risk_profile → 上位候補の詳細リスクを確認
3. git_why → リスクの高いコードの経緯を調査
4. git_impact_analysis → リファクタリングの影響範囲を確認

### リリース比較
1. git_release_comparison → 2つのref間のメトリクス比較
2. git_hotspots → 変更集中ファイルの詳細確認
3. git_trend_analysis → メトリクスの時系列トレンド分析

### 変更リスク評価（assess-change-risk Prompt推奨）
1. git_file_risk_profile → 変更対象ファイルの現在のリスク状態を把握
2. git_impact_analysis → 変更の影響範囲を分析
3. git_knowledge_map → 知識分布とレビュワー候補を特定
4. git_why → 対象コードの経緯を調査

### 技術的負債の多角的分析（identify-tech-debt Prompt推奨）
1. git_refactor_candidates → 5次元リスク評価でリファクタリング候補をランキング
2. git_complexity_hotspots → 6次元評価で保守困難度ホットスポットを特定
3. git_file_risk_profile → 上位候補の詳細リスクを確認
4. git_code_age → コードの古さと更新頻度を確認
5. git_knowledge_loss_risk → 知識集中リスクを評価

### パフォーマンス診断（diagnose-performance Prompt推奨）
1. git_repo_statistics → リポジトリの物理的サイズ・構造を把握
2. git_hotspots → 変更集中領域を特定
3. git_stale_files → 放置コードを特定
4. git_trend_analysis → メトリクスの悪化傾向を確認
5. git_dependency_map → ディレクトリ間の結合度を分析

### ポストインシデントレビュー（post-incident-review Prompt推奨）
1. git_search_commits → インシデント前後のコミット調査
2. git_diff_context → 変更差分の確認
3. git_revert_analysis → リバートパターンの分析
4. git_file_risk_profile → 関連ファイルのリスク評価
5. git_impact_analysis → 変更の影響範囲分析

### AIエージェント安全チェック（ai-agent-safety Prompt推奨）
1. git_file_risk_profile → 変更対象ファイルのリスク評価
2. git_impact_analysis → 変更の影響範囲分析
3. git_related_changes → 変更漏れの可能性がある関連ファイル特定
4. git_conflict_history → マージコンフリクトリスク確認
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
        "47ツールの使い分けガイド（質問パターン→ツール対応表、カテゴリ別一覧、連携パターン）",
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
