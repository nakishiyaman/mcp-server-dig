## セッション引き継ぎ

日時: 2026-03-12

### 完了したタスク
- **v0.10.0 Phase 1 実装完了**（feat/v0.10.0-phase1ブランチ）
  - `git_knowledge_map` ツール: ディレクトリ別知識所有者マップ + バス係数計算
    - `src/analysis/knowledge-map.ts`（分析関数 + computeBusFactor, getDirectoryAtDepth）
    - `src/tools/git-knowledge-map.ts`（ツール登録）
    - 統合テスト6件 + 単体テスト10件
  - `git_dependency_map` ツール: ディレクトリ間共変更ネットワーク可視化
    - `src/analysis/dependency-map.ts`（分析関数、parseNameOnlyLog再利用）
    - `src/tools/git-dependency-map.ts`（ツール登録）
    - 統合テスト4件
  - `git_bisect_guide` ツール: bisect事前分析
    - `src/tools/git-bisect-guide.ts`（ツール登録、既存パーサー再利用）
    - 統合テスト5件
  - `onboard-codebase` Prompt: 新規参入者向けオンボーディングガイド
    - `src/prompts/onboard-codebase.ts`
    - プロンプトテスト追加
  - エラーメッセージ改善: ENOENT / not a git repository のガイダンス付きメッセージ
  - `tool-guide` リソース更新: 20ツール対応 + 新連携パターン2件追加

### 現在の状態
- ブランチ: `feat/v0.10.0-phase1`（PR作成前）
- 未コミット変更: `.claude/settings.local.json` のみ
- ツール数: 20（データ取得16 + 組み合わせ分析2 + ワークフロー統合2）
- Prompts: 5、Resources: 1
- テスト: 126テスト全通過（25ファイル）
- build / lint / typecheck 全パス
- npm: mcp-server-dig@0.9.1（release-please管理）

### 次にやるべきこと
1. **PR作成**: feat/v0.10.0-phase1 → main
2. **Phase 2 実装**:
   - `find-bug-origin` Prompt（git_bisect_guide依存 → 完了済み）
   - `dig://repo-summary/{path}` 動的Resource（ResourceTemplate使用）
3. **Phase 3 実装**:
   - ツール出力へのアクション提案（組み合わせ・ワークフローツールのみ）
   - README更新
   - ROADMAP最終更新
4. v0.10.0リリース

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN は年次更新が必要（2027-03頃）
- `git_branch_summary` はスコープ外（git_review_prepとの重複が大きい）
- v0.11.0以降: 結果キャッシュ層、構造化ログ、タイムアウト柔軟化
