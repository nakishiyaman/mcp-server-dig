## セッション引き継ぎ

日時: 2026-03-16

### 完了したタスク
- TLA+記事（モデル検査・状態空間爆発）の分析・説明
- mcp-server-digへの推奨プラクティス評価（第4回評価、8項目）
  - 採用候補3件: 不変条件テスト、プロパティベーステスト（fast-check）、キャッシュ層プロパティテスト
  - 採用済み2件: 小さなモデルで検証、状態空間の意識的縮小
  - 見送り3件: TLA+仕様記述、TLC/Apalache導入
- `docs/recommended-practices.md` に第4回評価セクション追加
- `reference/ROADMAP.md` にv0.37.0セクション追加（プロパティベーステスト導入計画）

### 現在の状態
- ブランチ: `docs/handoff-v0.36.0`
- v0.36.0はリリース済み
- v0.37.0の計画策定完了（未実装）

### 次にやるべきこと
- v0.37.0の実装開始（`feat/v0.37.0-property-testing` ブランチをmainから作成）
  - Phase 1: `@fast-check/vitest` devDependency追加 + パーサープロパティテスト
  - Phase 2: 不変条件テスト（truncation、execFile引数安全性等）
  - Phase 3: キャッシュ層プロパティテスト（TTL/LRU不変条件）
  - Phase 4: ドキュメント更新

### ブロッカー/注意点
- `docs/handoff-v0.36.0` ブランチの変更をmainにマージしてからv0.37.0ブランチを作成すること
- fast-checkはvitest統合パッケージ `@fast-check/vitest` を使用する
- RELEASE_PLEASE_TOKEN 年次更新（2027-03頃）
- `.claude/settings.local.json` の変更はコミット対象外にすること
- release-please-action が Node.js 20 で警告あり（2026-06-02以降 Node.js 24 強制）→ v4の更新を追跡
