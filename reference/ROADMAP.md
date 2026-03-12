# mcp-server-dig ロードマップ

最終更新: 2026-03-11

## v0.4.0 — 品質改善

- [x] isError フラグ導入（全8ツールにエラー時 `isError: true` を返す）
- [x] 共通レスポンスヘルパー（`successResponse` / `errorResponse`）
- [x] 出力 truncation 統一（全ツールに50,000文字制限）
- [x] パス検証の完全化（`git_diff_context` に `validateFilePath` 追加）
- [x] 数値バリデーション強化（Zod `.int().min(1)` — max_commits, top_n, start_line, end_line, context_lines, min_coupling）
- [x] サイレント catch 改善（スキップ数・失敗情報を出力に含める）
- [x] executor エラーメッセージ改善（git args 全体を記録）
- [x] npm公開（mcp-server-dig@0.4.0）
- [x] CI publish修正（NPM_TOKEN追加 — `--provenance` は認証にならない）

## v0.1.0 — 基盤構築

- [x] プロジェクトスキャフォールディング（package.json, tsconfig.json）
- [x] git executor（execFile, バリデーション, タイムアウト）
- [x] git出力パーサー（log, blame porcelain, shortlog, name-only）
- [x] git_file_history ツール
- [x] git_blame_context ツール
- [x] git_related_changes ツール
- [x] git_contributor_patterns ツール
- [x] MCPサーバーエントリポイント（stdio transport）
- [x] ESLint + Prettier設定
- [x] Claude Codeフック（PreToolUse, PostToolUse, Stop）
- [x] AGENTS.md + 推奨プラクティス記録
- [x] セッション管理コマンド（/handoff, /progress）
- [x] パーサー単体テスト（vitest）
- [x] ツール統合テスト（一時gitリポジトリ）
- [x] README.md
- [x] vitest.config.ts（build/除外）

## v0.2.0 — 品質・公開準備

- [x] GitHub公開（private → public）
- [x] CI/CDパイプライン（GitHub Actions — Node 18/20/22マトリクス）
- [x] main保護ルール（CI必須, force push禁止, 管理者適用）
- [x] release-please導入（自動バージョニング・changelog生成）
- [x] package.jsonメタデータ整備（author, repository, homepage, bugs）
- [x] npmパッケージからテストファイル除外
- [x] MCP Inspector / MCPクライアント統合テストによる動作確認
- [x] npm公開（mcp-server-dig@0.2.0）

## v0.3.0 — コード考古学ツール拡充

- [x] `git_search_commits` ツール（コミットメッセージ検索）
  - [x] パーサー: 既存 parseLogOutput 再利用
  - [x] ツール実装 + 統合テスト
- [x] `git_commit_show` ツール（コミット詳細表示）
  - [x] 型定義: DiffStat, DiffFileStat, FileHotspot (types.ts)
  - [x] ツール実装 + 統合テスト
- [x] `git_diff_context` ツール（任意2点間の差分）
  - [x] パーサー: parseDiffStatOutput + 単体テスト
  - [x] 出力サイズ制御（50,000文字truncation）
  - [x] ツール実装 + 統合テスト
- [x] `git_hotspots` ツール（変更頻度ホットスポット分析）
  - [x] パーサー: parseFileFrequency + 単体テスト
  - [x] ツール実装 + 統合テスト
- [x] npm公開（mcp-server-dig@0.3.0）
- [x] Trusted Publishing (OIDC) に移行（トークンレスCI/CD）
- [x] README.md 更新（新4ツールのドキュメント追加）

## v0.4.1 — 国際化・配布拡大

- [x] README英語化（README.md → 英語、README.ja.md → 日本語）
- [x] LICENSE ファイル追加（MIT）
- [x] smithery.yaml 追加（Smithery対応準備）
- [ ] Smithery登録（有料プラン必要 — hosted deploymentは無料プラン非対応）
- [x] 公式MCP Registry登録（`io.github.nakishiyaman/dig`）
- [x] mcpName フィールド追加 + createSandboxServer エクスポート
- [x] npm公開（mcp-server-dig@0.4.1）
- [ ] Zed拡張パッケージング（API安定後、Rustラッパー必要）

## v0.6.0 — コード考古学ツール拡充 第2弾

- [x] `git_pickaxe` ツール（コード追加/削除コミット検索 — `git log -S/-G`）
  - [x] ツール実装 + 統合テスト
- [x] `git_code_churn` ツール（ファイル単位の変更量分析 — `git log --numstat`）
  - [x] パーサー: parseNumstatOutput + 型定義: FileChurn
  - [x] ツール実装 + 統合テスト
- [x] `git_stale_files` ツール（長期間未更新ファイル検出）
  - [x] パーサー: parseStaleFiles + 型定義: StaleFile
  - [x] ツール実装 + 統合テスト
- [x] `git_merge_base` ツール（ブランチ分岐点・差分分析）
  - [x] ツール実装 + 統合テスト
- [x] `git_tag_list` ツール（タグ/リリース一覧）
  - [x] パーサー: parseTagOutput + 型定義: TagInfo
  - [x] ツール実装 + 統合テスト
- [x] README.md 更新（新5ツールのドキュメント追加）
- [x] npm公開（mcp-server-dig@0.6.0）
- [x] release-please PAT修正（GITHUB_TOKEN → Fine-Grained PAT で CI トリガー問題解決）
- [x] Auto-merge有効化（Release PR の自動マージ）
- [x] 開発ワークフロー強化:
  - [x] `.claude/rules/` 導入（general, git-workflow, implementation, testing, validation）
  - [x] `CLAUDE.md` 作成（プロジェクト概要・規律）
  - [x] ADR導入（`docs/adr/` — 3件記録）
  - [x] GitHub Issueテンプレート（bug.yml, feature.yml）
  - [x] リリースボディテンプレート（`.github/release-body.md`）
  - [x] 検証チェックリストテンプレート（`reference/templates/release-validation.md`）

## v0.7.0 — 組み合わせ分析（垂直統合）

- [x] 分析ロジックの抽出（`src/analysis/`）
  - [x] `analyzeHotspots()` — 変更頻度分析
  - [x] `analyzeChurn()` — コードチャーン分析
  - [x] `analyzeContributors()` — コントリビューター分析
  - [x] `analyzeCoChanges()` — 共変更分析
  - [x] `analyzeFileStaleness()` — 鮮度分析
  - [x] 既存4ツールのリファクタリング（hotspots, churn, contributors, related_changes）
  - [x] 全55テストパス確認
- [x] `git_file_risk_profile` ツール（ファイルリスク評価）
  - [x] 5次元リスク分類（変更頻度, チャーン, 知識集中度, 結合度, 鮮度）
  - [x] 統合テスト追加
- [x] `git_repo_health` ツール（リポジトリ健全性サマリー）
  - [x] 並列分析実行（Promise.all）
  - [x] 統合テスト追加
- [x] README.md / README.ja.md 更新
  - [x] 新ツールドキュメント
  - [x] Zed/Cursor/Windsurf 設定例追加
- [x] ROADMAP更新（Zed拡張をスコープ外に移動）

## v0.8.0 — ワークフロー統合ツール

- [x] `git_review_prep` ツール（PRレビュー準備ブリーフィング）
  - [x] diff stat, commit一覧, hotspots, churn分析の並列実行
  - [x] リスクファイル検出 + 変更漏れ候補の警告
  - [x] レビュアー推薦（コントリビューター分析ベース）
  - [x] 統合テスト追加
- [x] `git_why` ツール（コード考古学ナラティブ）
  - [x] blame + commit詳細 + contributors + co-changes統合
  - [x] 行範囲指定対応
  - [x] 統合テスト追加
- [x] index.ts にワークフロー統合ツール登録
- [x] CLAUDE.md ツール数・バージョン更新

## v0.9.0 — MCP体験強化・品質・パフォーマンス

優先順: B → A → C

### B. MCP体験強化（Prompts/Resources）
- [x] MCP Promptsの追加（ユースケース別ガイドテンプレート）
  - [x] investigate-code: コード調査（git_why → git_pickaxe → git_file_history）
  - [x] review-pr: PRレビュー（git_review_prep → git_file_risk_profile）
  - [x] assess-health: リポジトリ健全性評価（git_repo_health → git_hotspots → git_stale_files）
  - [x] trace-change: 変更追跡（git_pickaxe → git_commit_show）
- [x] ツール選択ガイドのResource提供（dig://tool-guide）

### A. コード品質・保守性向上
- [x] 統合テストファイルの分割（925行 → 18ファイル、vitest globalSetup + provide/inject）
- [ ] ツール登録パターンの共通化（ROI低のため保留 — ハンドラー多様性が高い）
- [x] `index.ts` の `version` ハードコード修正（createRequireでpackage.jsonから動的取得）

### C. パフォーマンス最適化
- [x] 組み合わせツール内の重複git呼び出し削減（`git_repo_health`, `git_review_prep`, `git_file_risk_profile`）
  - [x] `parseCombinedNumstat`: 1回のnumstat出力からhotspots+churn同時算出
  - [x] `analyzeHotspotsAndChurn`: 統合分析関数（git log 2回→1回）
  - [x] `countStaleFiles`: git log --since による一括判定（N回→1回）
  - [x] `git ls-files` 重複排除（2回→1回）
- [ ] 結果キャッシュ層の導入（プロファイリングで必要性確認後）

### D. ドキュメント
- [x] README更新（Prompts/Resources機能の記載追加）

## v0.10.0 — ツール拡充 + UX強化

### Phase 1（並行実装可能）
- [x] `git_knowledge_map` ツール（ディレクトリ別知識所有者マップ + バス係数）
  - [x] `src/analysis/knowledge-map.ts`（分析関数 + 純粋関数テスト）
  - [x] `src/tools/git-knowledge-map.ts`（ツール登録）
  - [x] 統合テスト（6件）+ 単体テスト（10件）
- [x] `git_dependency_map` ツール（ディレクトリ間共変更ネットワーク）
  - [x] `src/analysis/dependency-map.ts`（分析関数）
  - [x] `src/tools/git-dependency-map.ts`（ツール登録）
  - [x] 統合テスト（4件）
- [x] `git_bisect_guide` ツール（bisect事前分析）
  - [x] `src/tools/git-bisect-guide.ts`（ツール登録）
  - [x] 統合テスト（5件）
- [x] `onboard-codebase` Prompt（新規参入者向けオンボーディングガイド）
  - [x] `src/prompts/onboard-codebase.ts`
  - [x] プロンプトテスト追加
- [x] エラーメッセージ改善（ENOENT / not a git repository のガイダンス付きメッセージ）
- [x] `tool-guide` リソース更新（20ツール対応 + 新連携パターン追加）

### Phase 2（Phase 1に依存）
- [x] `find-bug-origin` Prompt（git_bisect_guide依存）
- [x] `dig://repo-summary/{path}` 動的Resource（ResourceTemplate使用）

### Phase 3（最終）
- [x] ツール出力へのアクション提案（組み合わせ・ワークフローツールのみ）
- [x] README更新（EN/JA: 3新ツール + 2新Prompt + 1新Resource）
- [x] ROADMAP更新

## v0.11.0 — 品質強化・パフォーマンス・運用改善

### Phase 1: エッジケーステスト拡充 + パーサー堅牢化
- [x] テストデータ拡充（バイナリファイル、非ASCIIファイル名、大量コミット）
- [x] エッジケース統合テスト（3→14テストに拡充）
- [x] パーサー防御的改善（Bin行スキップ、空commitHashガード）

### Phase 2: タイムアウト柔軟化
- [x] `timeout_ms` パラメータ追加（6ツール: repo_health, review_prep, file_risk_profile, why, code_churn, hotspots）
- [x] 分析関数への `timeoutMs` 伝播

### Phase 3: 結果キャッシュ層
- [x] `AnalysisCache`（TTL 60秒、LRU eviction、最大100エントリ）
- [x] `cachedAnalyzeHotspotsAndChurn` / `cachedAnalyzeContributors`
- [x] `ToolContext` 型定義、複合ツールへのcontext伝播
- [x] ADR-0004: キャッシュ設計判断

### Phase 4: 構造化ログ
- [x] `Logger` クラス（JSON形式stderr出力、DIG_LOG_LEVEL環境変数制御）
- [x] index.ts の console.error → logger 置換

### Phase 5: Prompt追加 + ドキュメント
- [x] `technical-debt` Prompt（技術的負債分析ワークフロー）
- [x] `onboard-area` Prompt（領域別オンボーディング）
- [x] ADR-0004
- [x] tool-guide リソース更新（timeout_ms、新連携パターン）
- [x] ROADMAP更新

## v0.12.0 — timeout_ms完全展開 + 実行観測性

### Phase 1: timeout_ms全20ツール展開
- [x] 直接execGit呼び出し10ツールにtimeout_msパラメータ追加
- [x] 分析関数経由4ツール + 分析関数2件にtimeoutMs追加
- [x] 全パラメータはoptional（破壊的変更なし）

### Phase 2: 実行タイミングログ
- [x] execGitにperformance.now()計測 + logger.debugログ追加
- [x] AnalysisCacheにhit/missログ追加
- [x] startTimerユーティリティ（src/tools/timing.ts）+ テスト

### Phase 3: ドキュメント・リソース更新
- [x] tool-guideリソース更新（全20ツールtimeout_ms対応）
- [x] ROADMAP更新
- [x] README.md / README.ja.md 更新
- [x] CLAUDE.md バージョン更新

## v0.13.0候補

- [ ] executor層キャッシュ（粒度検証後）
- [ ] JSON出力モード（構造化出力オプション）

## スコープ外

| 項目 | 理由 |
|------|------|
| Zed拡張のRust実装 | 設定ベース接続で十分。ROI極低 |
| HTTP/SSEトランスポート | ADR-0003で決定済み |
| Smithery有料プラン | MCP Registry登録済みで配布十分 |
| git以外のVCS対応 | スコープ拡大は焦点を失わせる |
| 単純ラッパーの追加 | 価値を生まない。垂直統合に注力 |
| AIによる自動解釈・要約 | LLMの仕事。ツールはデータ提供に専念 |

## 既知の技術的課題

- [ ] RELEASE_PLEASE_TOKEN の年次更新（2027-03頃）
- release-please re-runでは `release_created` が false になる（workflow_dispatch で手動publish可能）
