## セッション引き継ぎ

日時: 2026-03-14

### 完了したタスク
- **v0.28.0（計画時v0.27.0）: 新ツール2本 + リリース**
  - `git_reflog_analysis` ツール実装 + 統合テスト7件
  - `git_cherry_pick_detect` ツール実装 + 統合テスト6件
  - `ReflogEntry` / `CherryPickEntry` interface追加
  - テストリポジトリにcherry-pick・reset操作追加
  - ドキュメント更新（tool-guide 33→35, CLAUDE.md, README EN/JA, ROADMAP）
  - PR #110 作成 → CI全パス → マージ
  - release-please → v0.28.0としてGitHub Release + npm公開完了

### 現在の状態
- ブランチ: `main`（リリース済み）
- 未コミット変更: `.claude/settings.local.json` のみ（コミット不要）
- ツール数: 35（データ取得29 + 組み合わせ分析4 + ワークフロー統合2）
- テスト: 598件（全PASS）
- カバレッジ: branches 86.14%
- npm: `mcp-server-dig@0.28.0` 公開済み

### 次にやるべきこと
1. v0.29.0の計画策定（新ツール候補、カバレッジ向上等）
2. 依存関係アップデート確認（`npm outdated`）

### ブロッカー/注意点
- v0.27.0バージョン番号がスキップされた: release-pleaseがRelease PR (#111, `chore(main): release 0.27.0`) のマージで0.27.0タグを作成せず、累積commitからv0.28.0を生成。CLAUDE.md内のバージョン表記は「v0.27.0」のままだが、package.jsonは0.28.0（release-pleaseが自動更新済み）
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- `.claude/settings.local.json` はローカル設定のためコミット不要
