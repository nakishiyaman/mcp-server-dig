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

## v0.2.0 — 品質・公開準備（予定）

- [ ] GitHub公開
- [ ] CI/CDパイプライン（GitHub Actions）
- [ ] main保護ルール
- [ ] npm公開
- [ ] release-please導入

## 将来検討

- [ ] `git_search_commits` ツール（コミットメッセージ検索）
- [ ] `git_diff_context` ツール（特定コミット間の差分）
- [ ] Zed拡張としてのパッケージング
- [ ] エラー時のリッチなフィードバック（isError フラグ活用）
