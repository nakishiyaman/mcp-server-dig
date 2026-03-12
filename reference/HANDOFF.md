## セッション引き継ぎ

日時: 2026-03-12

### 完了したタスク
- **v0.15.0 リリース完了**
  - PR #68 作成 → CI全パス（Node 20/22） → マージ
  - release-please Release PR #69 → auto-merge → GitHub Release v0.15.0 作成
  - npm公開: `mcp-server-dig@0.15.0`

### 現在の状態
- ブランチ: `main`（リモートと同期済み）
- 未コミット変更: `.claude/settings.local.json` のみ（ローカル設定、コミット不要）
- ツール数: 22（データ取得18 + 組み合わせ分析2 + ワークフロー統合2）
- Prompts: 8、Resources: 2
- 最新リリース: v0.15.0

### 次にやるべきこと
1. v0.16.0の計画策定（ROADMAPに新セクション追加）
   - 候補: テストカバレッジ向上、新ツール追加、パフォーマンス改善等

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN は年次更新が必要（2027-03頃）
- zod 4 は MCP SDK の `zod-to-json-schema` が v3 専用のためブロック中。SDK側の対応を待つ
- @types/node 25 はサポート対象Node.js（20/22）と不整合のため見送り
- CIマトリクス変更時はブランチ保護の必須チェックも同時に更新すること（v0.14.0の教訓）
