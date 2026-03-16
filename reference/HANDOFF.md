## セッション引き継ぎ

日時: 2026-03-16

### 完了したタスク
- v0.37.0 リリース完了（PR #140 → Release PR #141 → npm publish）
  - PR作成・CIパス・マージ
  - release-please Release PR自動作成・auto-merge
  - GitHub Release + tag `v0.37.0` 作成
  - npm publish (`mcp-server-dig@0.37.0`) 成功

### 現在の状態
- ブランチ: `main`（v0.37.0リリース済み）
- 未コミット変更: `.claude/settings.local.json` のみ（コミット対象外）
- テスト: 853件全パス（うちプロパティテスト29件）
- typecheck/lint/build: 全パス

### 次にやるべきこと
- v0.38.0の計画策定（ROADMAPにセクション追加）
- 候補検討:
  - 新ツール追加
  - MCP SDK更新（最新バージョン確認）
  - release-please-action v4 → Node.js 24対応版への更新（2026-06-02期限）

### ブロッカー/注意点
- `.claude/settings.local.json` の変更はコミット対象外にすること
- `@fast-check/vitest` のdeprecation warning: "Importing from vitest/suite is deprecated since Vitest 4.1" — fast-check側の対応待ち
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- release-please-action が Node.js 20 で警告あり（2026-06-02以降 Node.js 24 強制）→ v4の更新を追跡
