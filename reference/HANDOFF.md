## セッション引き継ぎ

日時: 2026-03-12

### 完了したタスク
- **v0.12.0 リリース完了**（npm `mcp-server-dig@0.12.0` 公開済み、GitHub Release v0.12.0 作成済み）
  - Phase 1: timeout_ms全20ツール展開
    - 直接execGit呼び出し10ツールにtimeout_msパラメータ追加
    - 分析関数経由4ツール + knowledge-map.ts, dependency-map.tsにtimeoutMsオプション追加
    - 全パラメータはoptional（破壊的変更なし）
  - Phase 2: 実行タイミングログ
    - execGitにperformance.now()計測 + logger.debugログ追加
    - AnalysisCacheにhit/miss理由付きログ追加
    - startTimerユーティリティ（src/tools/timing.ts）+ テスト3件追加
  - Phase 3: ドキュメント・リソース更新
    - tool-guide: 全20ツールtimeout_ms対応に更新
    - README/README.ja: タイムアウト・ログ機能の説明更新
    - ROADMAP: v0.12.0完了、v0.13.0候補追加
    - CLAUDE.md: バージョン更新

### 現在の状態
- ブランチ: `main`（v0.12.0リリース済み）
- 未コミット変更: `.claude/settings.local.json` のみ（ローカル設定）
- ツール数: 20（データ取得16 + 組み合わせ分析2 + ワークフロー統合2）
- Prompts: 8、Resources: 2
- テスト: 164テスト全通過（28ファイル）
- build / lint / typecheck 全パス

### 次にやるべきこと
1. **v0.13.0 計画**:
   - executor層キャッシュ（粒度検証後）
   - JSON出力モード（構造化出力オプション）
2. **release-please auto-merge タイミング問題の調査**:
   - v0.12.0リリース時、Release PR作成直後のauto-merge有効化ステップでラベル検索がヒットしなかった
   - 手動で`gh pr merge --auto --merge`を実行して解決
   - ワークフローのタイミング調整が必要な可能性あり

### ブロッカー/注意点
- RELEASE_PLEASE_TOKEN は年次更新が必要（2027-03頃）
- release-pleaseのauto-mergeステップにタイミング問題あり（PR作成直後はラベル検索がヒットしないことがある）
- キャッシュのTTL 60秒は保守的な値。実運用でチューニング可能
