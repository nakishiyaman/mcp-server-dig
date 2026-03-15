## セッション引き継ぎ

日時: 2026-03-15

### 完了したタスク
- **v0.36.0 実装・リリース完了**
  - `git_offboarding_simulation` — 特定著者の離脱シミュレーション（bus factor再計算・新規SPOF検出）
  - `git_coordination_bottleneck` — ディレクトリ別調整コスト分析（変更頻度×著者数×所有分散度）
  - `plan-release` Prompt — リリース計画レビューワークフロー（5ツール連鎖）
  - 分析層: offboarding-simulation.ts, coordination-bottleneck.ts, classifyCoordinationCost, cachedAnalyzeKnowledgeMap
  - ツール: 47 → 49（組み合わせ分析10→12）、Prompts: 14 → 15、テスト: 791 → 824
- PR #137 マージ → Release PR #138 自動マージ → npm publish `mcp-server-dig@0.36.0` 公開完了
- タグ `v0.36.0` 作成済み

### 現在の状態
- ブランチ: `main`（v0.36.0リリース後、最新）
- 未コミット変更: なし（`.claude/settings.local.json` のみローカル変更、コミット対象外）

### 次にやるべきこと
- v0.37.0の計画（リサーチ結果の残項目から次のスコープを策定）

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- `.claude/settings.local.json` の変更はコミット対象外にすること
- release-please-action が Node.js 20 で警告あり（2026-06-02以降 Node.js 24 強制）→ v4の更新を追跡
