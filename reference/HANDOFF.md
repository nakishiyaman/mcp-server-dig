## セッション引き継ぎ

日時: 2026-03-15

### 完了したタスク
- **v0.34.0 リリース完了**
  - PR #131 作成 → CI全パス → マージ
  - release-please PR #132 → auto-merge → npm publish成功
  - `mcp-server-dig@0.34.0` 公開済み
- **GitHub Actions Node.js 24対応**（PR #133）
  - `actions/checkout@v4` → `@v5`
  - `actions/setup-node@v4` → `@v5`
  - `ci.yml` から `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` 削除（v5で不要）
  - Node.js 20 deprecation警告が完全に解消

### 現在の状態
- ブランチ: `main`（最新）
- 未コミット変更: `.claude/settings.local.json` のみ（無視可）
- v0.34.0: リリース済み（45ツール、13 Prompts、2 Resources）

### 次にやるべきこと
- v0.35.0の計画（新ツール追加、カバレッジ向上、依存関係更新等）
- `release-please-action` v5リリース時に更新（現在v4が最新、Node 20）

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- `release-please-action@v4` はまだNode 20 — `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` で対応中
