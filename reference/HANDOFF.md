## セッション引き継ぎ

日時: 2026-03-14

### 完了したタスク
- **v0.24.0リリース完了**
  - PR #101 作成 → CI全パス（Node 22/24） → マージ
  - release-please PR #102 自動作成 → CI全パス → auto-merge発動
  - npm publish (`mcp-server-dig@0.24.0`) 成功
  - GitHub Release + tag `v0.24.0` 作成済み

### 現在の状態
- ブランチ: `main`（v0.24.0リリース済み）
- npm: `mcp-server-dig@0.24.0`（公開済み）
- ツール数: 33（データ取得27 + 組み合わせ分析4 + ワークフロー統合2）
- Prompts: 8, Resources: 2
- テスト: 546件（全PASS）
- カバレッジ: Statements 96% / Branches 85% / Functions 94% / Lines 96%

### 次にやるべきこと
1. v0.25.0の方針策定（候補: MCP SDK registerTool()移行、zod 4ネイティブ対応、新ツール追加）
2. 古いドキュメントPR（#89, #95, #99, #100）のクローズ検討
3. `server.tool()` deprecated対応の調査（SDK側の`registerTool()` API安定化待ち）

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- `server.tool()` APIはSDK内でdeprecated扱い（動作に問題なし）。将来的に `registerTool()` への移行を検討
- Streamable HTTP Transportは `127.0.0.1` にバインド（外部公開には追加設定が必要）
- release-please-action Node.js 20 deprecation警告あり（2026-06-02以降Node 24強制）
