## セッション引き継ぎ

日時: 2026-03-13

### 完了したタスク
- **v0.23.0 リリース完了（npm 0.22.0として公開）**
  - PR #92 マージ（CI全パス: Node 20/22/24）
  - ブランチ保護に `ci (24)` 追加（GitHub API経由）
  - Release PR #93 自動マージ → GitHub Release v0.22.0 作成 → npm公開成功
  - ドキュメント更新 → PR #94 マージ（git-workflow.md, ROADMAP.md, HANDOFF.md）

### 現在の状態
- ブランチ: `main`（最新、リリース済み）
- npm: `mcp-server-dig@0.22.0` 公開済み（v0.23.0実装内容を含む）
- ツール数: 31（データ取得25 + 組み合わせ分析4 + ワークフロー統合2）
- Prompts: 8, Resources: 2
- カバレッジ: statements 96%, branches 85%, functions 94%, lines 97%
- 未コミット変更: `.claude/settings.local.json` のみ（ローカル設定、コミット不要）

### 次にやるべきこと
1. 次バージョンの計画策定

### ブロッカー/注意点
- release-pleaseがバージョンを `0.22.0` として公開（v0.22.0のtestコミット + v0.23.0のfeatコミットが合算）
- Node.js 20 EOLは2026-04-30 → 次バージョンで廃止検討
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- GitHub Actions Node.js 20 deprecation警告あり（2026-06-02からNode 24強制）→ FORCE_JAVASCRIPT_ACTIONS_TO_NODE24は既に設定済み
