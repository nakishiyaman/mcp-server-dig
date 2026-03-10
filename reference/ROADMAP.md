# mcp-server-dig ロードマップ

最終更新: 2026-03-10

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
- [x] NPM_TOKENシークレット設定
- [x] MCP Inspector / MCPクライアント統合テストによる動作確認
- [x] npm公開（mcp-server-dig@0.2.0）

## v0.3.0 — コード考古学ツール拡充

- [ ] `git_search_commits` ツール（コミットメッセージ検索）
  - [ ] パーサー: 既存 parseLogOutput 再利用
  - [ ] ツール実装 + 統合テスト
- [ ] `git_commit_show` ツール（コミット詳細表示）
  - [ ] 型定義: CommitDetail (types.ts)
  - [ ] パーサー: parseShowOutput + 単体テスト
  - [ ] ツール実装 + 統合テスト
- [ ] `git_diff_context` ツール（任意2点間の差分）
  - [ ] 型定義: DiffStat (types.ts)
  - [ ] パーサー: parseDiffStatOutput + 単体テスト
  - [ ] 出力サイズ制御（truncation）
  - [ ] ツール実装 + 統合テスト
- [ ] `git_hotspots` ツール（変更頻度ホットスポット分析）
  - [ ] 型定義: FileHotspot (types.ts)
  - [ ] パーサー: parseFileFrequency + 単体テスト
  - [ ] ツール実装 + 統合テスト
- [ ] README.md 更新（全4ツールのドキュメント）

## 将来検討

- [ ] Zed拡張としてのパッケージング
- [ ] エラー時のリッチなフィードバック（isError フラグ活用）
- [ ] Smithery / MCP Registry への登録
- [ ] README 英語化
