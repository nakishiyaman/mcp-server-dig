## セッション引き継ぎ

日時: 2026-03-15

### 完了したタスク
- **v0.33.0 リリース完了**
  - PR #128 作成 → CI全パス → マージ
  - Release PR #129 自動作成 → CI全パス → auto-merge
  - GitHub Release v0.33.0 公開、npm mcp-server-dig@0.33.0 公開済み
- v0.33.0の内容:
  - `git_complexity_hotspots` — 6次元リスク評価の複合分析ツール（統合テスト7件）
  - `git_merge_timeline` — マージ頻度時系列分析データツール（統合テスト5件）
  - `identify-tech-debt` — 技術的負債多角的分析Prompt（テスト4件）
  - ツール: 41 → 43、Prompts: 11 → 12、テスト: 735 → 756

### 現在の状態
- ブランチ: `main`（v0.33.0リリース済み、最新）
- 未コミット変更: `.claude/settings.local.json` のみ（ローカル設定、コミット不要）
- npm: mcp-server-dig@0.33.0 公開済み

### 次にやるべきこと
- v0.34.0の計画・実装（新ツールやカバレッジ向上など、ROADMAPに未定義）

### ブロッカー/注意点
- branches threshold 87%は見送り: 残り未カバー分岐はcache-context false branchesが大半
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- release-please.ymlの`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`未設定
