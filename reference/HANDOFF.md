## セッション引き継ぎ

日時: 2026-03-12

### 完了したタスク
- **v0.14.0 実装完了（PR #65 CIパス待ち）**
  - Phase 1: Node.js 18サポート廃止 + vitest 4アップグレード
    - `package.json`: `engines.node` を `">=20"` に変更
    - `ci.yml`: マトリクス `[18, 20, 22]` → `[20, 22]`
    - vitest `^2.1.0` → `^4.0.0` にアップグレード
    - vitest 4破壊的変更対応: `GlobalSetupContext`削除→インライン型、`logger.test.ts`暗黙any修正
    - 全164テストパス確認
  - Phase 2: ドキュメント更新
    - README.md / README.ja.md: Node.js要件 `>=18` → `>=20`
    - CLAUDE.md: v0.14.0に更新
    - ROADMAP: v0.14.0セクション追加 + 見送り判断記録（zod 4, @types/node 25）
    - git-workflow.md / release-validation.md: CIマトリクス表記更新

### 現在の状態
- ブランチ: `feat/v0.14.0-vitest4-node20`（pushed, PR #65 作成済み）
- 未コミット変更: `.claude/settings.local.json` のみ（ローカル設定、コミット不要）
- ツール数: 20（データ取得16 + 組み合わせ分析2 + ワークフロー統合2）
- Prompts: 8、Resources: 2
- テスト: 164テスト全通過（28ファイル）
- build / lint / typecheck 全パス

### 次にやるべきこと
1. PR #65 の CI パス確認 → マージ
2. release-please が Release PR を自動作成 → auto-merge → npm公開
3. v0.15.0 計画策定

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN は年次更新が必要（2027-03頃）
- zod 4 は MCP SDK の `zod-to-json-schema` が v3 専用のためブロック中。SDK側の対応を待つ
- @types/node 25 はサポート対象Node.js（20/22）と不整合のため見送り
