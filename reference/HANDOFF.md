## セッション引き継ぎ

日時: 2026-03-13

### 完了したタスク
- **v0.23.0 リリース完了**
  - PR #92 マージ（CI全パス: Node 20/22/24）
  - ブランチ保護に `ci (24)` 追加（GitHub API経由）
  - Release PR #93 自動マージ → GitHub Release v0.22.0 作成 → npm公開成功
  - `git-workflow.md` のCI記述を Node 20/22/24 に更新
  - ROADMAP.md のブランチ保護タスクを完了に更新

### 現在の状態
- ブランチ: `main`（最新、リリース済み）
- npm: `mcp-server-dig@0.22.0` 公開済み
- ツール数: 31（データ取得25 + 組み合わせ分析4 + ワークフロー統合2）
- カバレッジ: statements 96%, branches 85%, functions 94%, lines 97%
- 未コミット変更: `git-workflow.md`, `ROADMAP.md`, `HANDOFF.md` の更新

### 注意点
- release-pleaseがバージョンを `0.22.0` として公開（v0.22.0のtestコミット + v0.23.0のfeatコミットが合算）
- 実装内容はv0.23.0相当だが、npmバージョンは0.22.0
- Node.js 20 EOLは2026-04-30 → 次バージョンで廃止検討
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- GitHub Actions Node.js 20 deprecation警告あり（2026-06-02からNode 24強制）→ FORCE_JAVASCRIPT_ACTIONS_TO_NODE24は既に設定済み

### 次にやるべきこと
1. ドキュメント更新のコミット・push（git-workflow.md, ROADMAP.md, HANDOFF.md）
2. 次バージョンの計画策定
