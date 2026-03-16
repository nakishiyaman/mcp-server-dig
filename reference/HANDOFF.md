## セッション引き継ぎ

日時: 2026-03-16

### 完了したタスク
- v0.38.0 リリース完了
  - PR #143 作成 → CIパス → マージ
  - Release PR #144 自動作成 → CIパス → auto-merge
  - GitHub Release v0.38.0 公開済み
  - npm mcp-server-dig@0.38.0 公開済み
  - 51ツール（データ36 + 複合13 + ワークフロー2）、16 Prompts

### 現在の状態
- ブランチ: `main`（v0.38.0リリース済み、`42b3229`）
- 未コミット変更: なし（`.claude/settings.local.json` のみ対象外）

### 次にやるべきこと
- v0.39.0 の計画策定（新ツール・機能の検討）

### ブロッカー/注意点
- `.claude/settings.local.json` の変更はコミット対象外にすること
- `@fast-check/vitest` のdeprecation warning: "Importing from vitest/suite is deprecated since Vitest 4.1" — fast-check側の対応待ち
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- release-please-action が Node.js 20 で警告あり（2026-06-02以降 Node.js 24 強制）→ v4の更新を追跡
- `formatPeriodKey` がgit-commit-frequency.tsとgit-velocity-anomalies.tsで重複定義（非export関数のため）→ 将来のリファクタ候補
