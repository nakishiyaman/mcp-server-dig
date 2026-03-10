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
- [ ] npm公開（mcp-server-dig@0.6.0）

## 既知の技術的課題

- [ ] Smithery登録（有料プラン or URL方式でのHTTPトランスポート対応が必要）
- release-please re-runでは `release_created` が false になる（workflow_dispatch で手動publish可能）
