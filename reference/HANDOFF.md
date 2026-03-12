## セッション引き継ぎ

日時: 2026-03-12

### 完了したタスク
- **v0.16.0 リリース完了**
  - PR #71 作成 → CI全パス → マージ
  - Release PR #72 自動作成 → CI全パス → auto-merge
  - npm publish (`mcp-server-dig@0.16.0`) 完了
  - GitHub Release + tag `v0.16.0` 作成済み
- **v0.16.0 実装内容（前セッション）**
  - MCP統合テスト移行（21テストファイル、`client.callTool()` 経由に書き換え）
  - テストカバレッジ: statements 33%→84%, branches 28%→64%, functions 33%→89%, lines 28%→85%

### 現在の状態
- ブランチ: `main`（v0.16.0リリース済み）
- 未コミット変更: `.claude/settings.local.json`（ローカル設定、コミット不要）
- ツール数: 22（データ取得18 + 組み合わせ分析2 + ワークフロー統合2）
- Prompts: 8、Resources: 2
- npm最新バージョン: 0.16.0

### 次にやるべきこと
1. v0.17.0 のスコープ検討（ROADMAP未定義）
   - カバレッジ向上の継続（branches 64%が最も低い）
   - 新ツール追加の検討
   - 依存関係更新の再評価（zod 4, MCP SDK更新）

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN は年次更新が必要（2027-03頃）
- zod 4 は MCP SDK の `zod-to-json-schema` が v3 専用のためブロック中。SDK側の対応を待つ
- @types/node 25 はサポート対象Node.js（20/22）と不整合のため見送り
- CIマトリクス変更時はブランチ保護の必須チェックも同時に更新すること（v0.14.0の教訓）
- GitHub Actions で Node.js 20 アクション非推奨警告あり（2026-06-02以降 Node.js 24 強制）。release-please-action@v4 の更新を注視
