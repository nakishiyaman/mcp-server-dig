## セッション引き継ぎ

日時: 2026-03-14

### 完了したタスク
- **v0.25.0: server.tool() → server.registerTool() 移行**
  - 全33ツールファイル（`src/tools/git-*.ts`）を `server.registerTool()` に一括変換
  - description・inputSchema・annotationsを設定オブジェクトにまとめる形式に統一
  - CLAUDE.md バージョン更新、ROADMAP v0.25.0セクション追加
  - PR #104 作成 → CI全パス → マージ済み

### 現在の状態
- ブランチ: `main`（最新、リモートと同期済み）
- 未コミット変更: `.claude/settings.local.json` のみ（ローカル設定、コミット不要）
- npm: `mcp-server-dig@0.24.0`（公開済み）/ v0.25.0開発中
- ツール数: 33（データ取得27 + 組み合わせ分析4 + ワークフロー統合2）
- Prompts: 8, Resources: 2
- テスト: 546件（全PASS）

### 次にやるべきこと
1. release-pleaseによるv0.25.0リリースPR自動作成を確認
2. npm公開確認

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- Streamable HTTP Transportは `127.0.0.1` にバインド（外部公開には追加設定が必要）
