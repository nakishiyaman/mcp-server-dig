## セッション引き継ぎ

日時: 2026-03-11

### 完了したタスク
- **v0.9.0-B: MCP Prompts/Resources 追加**
  - Resource 1つ: `tool-guide` (`dig://tool-guide`) — 17ツールの使い分けガイド
  - Prompt 4つ: `investigate-code`, `review-pr`, `assess-health`, `trace-change`
  - テスト: 13テスト追加（prompts 9 + resources 4）、全95テスト通過
  - ビルド成功確認済み

### 現在の状態
- ブランチ: `feat/v0.9.0-prompts-resources`（コミット・PR待ち）
- 未コミット変更: あり（新規6ファイル + index.ts変更 + ROADMAP/HANDOFF更新）
- ツール数: 17（データ取得13 + 組み合わせ分析2 + ワークフロー統合2）
- Prompts: 4、Resources: 1
- テスト: 95テスト全通過
- npm: mcp-server-dig@0.8.1 公開済み

### 次にやるべきこと
1. このブランチのPR作成・マージ
2. v0.9.0-A: コード品質・保守性向上（統合テスト分割、ボイラープレート削減、version修正）
3. v0.9.0-C: パフォーマンス最適化（重複git呼び出し削減、キャッシュ層）
4. README更新（Prompts/Resources機能の記載）

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN は年次更新が必要（2027-03頃）
