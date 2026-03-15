## セッション引き継ぎ

日時: 2026-03-15

### 完了したタスク
- **v0.36.0 実装完了**（PR #137 作成済み・CIパス待ち）
  - `git_offboarding_simulation` — 特定著者の離脱シミュレーション（bus factor再計算・新規SPOF検出）
  - `git_coordination_bottleneck` — ディレクトリ別調整コスト分析（変更頻度×著者数×所有分散度）
  - `plan-release` Prompt — リリース計画レビューワークフロー（5ツール連鎖）
  - 分析層: offboarding-simulation.ts, coordination-bottleneck.ts, classifyCoordinationCost, cachedAnalyzeKnowledgeMap
  - ツール: 47 → 49（組み合わせ分析10→12）、Prompts: 14 → 15、テスト: 791 → 824
  - 全ドキュメント更新済み（CLAUDE.md, README.md, README.ja.md, tool-guide, ROADMAP）

### 現在の状態
- ブランチ: `feat/v0.36.0-offboarding-coordination`（mainから分岐）
- 未コミット変更: なし（`.claude/settings.local.json` のみローカル変更、コミット対象外）
- PR: https://github.com/nakishiyaman/mcp-server-dig/pull/137
- 検証済み: `npm run build && npm run test && npm run typecheck && npm run lint` 全パス（824テスト）

### 次にやるべきこと
- PR #137 のCIパス確認 → マージ
- release-pleaseによるv0.36.0リリース（自動）
- v0.37.0の計画

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- `.claude/settings.local.json` の変更はコミット対象外にすること
