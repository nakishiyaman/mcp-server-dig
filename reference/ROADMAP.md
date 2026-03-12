# mcp-server-dig ロードマップ

最終更新: 2026-03-12 (v0.22.0)

## v0.4.0 — 品質改善

- [x] isError フラグ導入（全8ツールにエラー時 `isError: true` を返す）
- [x] 共通レスポンスヘルパー（`successResponse` / `errorResponse`）
- [x] 出力 truncation 統一（全ツールに50,000文字制限）
- [x] パス検証の完全化（`git_diff_context` に `validateFilePath` 追加）
- [x] 数値バリデーション強化（Zod `.int().min(1)` — max_commits, top_n, start_line, end_line, context_lines, min_coupling）
- [x] サイレント catch 改善（スキップ数・失敗情報を出力に含める）
- [x] executor エラーメッセージ改善（git args 全体を記録）
- [x] npm公開（mcp-server-dig@0.4.0）
- [x] CI publish修正（NPM_TOKEN追加 — `--provenance` は認証にならない）

## v0.1.0 — 基盤構築

- [x] プロジェクトスキャフォールディング（package.json, tsconfig.json）
- [x] git executor（execFile, バリデーション, タイムアウト）
- [x] git出力パーサー（log, blame porcelain, shortlog, name-only）
- [x] git_file_history ツール
- [x] git_blame_context ツール
- [x] git_related_changes ツール
- [x] git_contributor_patterns ツール
- [x] MCPサーバーエントリポイント（stdio transport）
- [x] ESLint + Prettier設定
- [x] Claude Codeフック（PreToolUse, PostToolUse, Stop）
- [x] AGENTS.md + 推奨プラクティス記録
- [x] セッション管理コマンド（/handoff, /progress）
- [x] パーサー単体テスト（vitest）
- [x] ツール統合テスト（一時gitリポジトリ）
- [x] README.md
- [x] vitest.config.ts（build/除外）

## v0.2.0 — 品質・公開準備

- [x] GitHub公開（private → public）
- [x] CI/CDパイプライン（GitHub Actions — Node 18/20/22マトリクス）
- [x] main保護ルール（CI必須, force push禁止, 管理者適用）
- [x] release-please導入（自動バージョニング・changelog生成）
- [x] package.jsonメタデータ整備（author, repository, homepage, bugs）
- [x] npmパッケージからテストファイル除外
- [x] MCP Inspector / MCPクライアント統合テストによる動作確認
- [x] npm公開（mcp-server-dig@0.2.0）

## v0.3.0 — コード考古学ツール拡充

- [x] `git_search_commits` ツール（コミットメッセージ検索）
  - [x] パーサー: 既存 parseLogOutput 再利用
  - [x] ツール実装 + 統合テスト
- [x] `git_commit_show` ツール（コミット詳細表示）
  - [x] 型定義: DiffStat, DiffFileStat, FileHotspot (types.ts)
  - [x] ツール実装 + 統合テスト
- [x] `git_diff_context` ツール（任意2点間の差分）
  - [x] パーサー: parseDiffStatOutput + 単体テスト
  - [x] 出力サイズ制御（50,000文字truncation）
  - [x] ツール実装 + 統合テスト
- [x] `git_hotspots` ツール（変更頻度ホットスポット分析）
  - [x] パーサー: parseFileFrequency + 単体テスト
  - [x] ツール実装 + 統合テスト
- [x] npm公開（mcp-server-dig@0.3.0）
- [x] Trusted Publishing (OIDC) に移行（トークンレスCI/CD）
- [x] README.md 更新（新4ツールのドキュメント追加）

## v0.4.1 — 国際化・配布拡大

- [x] README英語化（README.md → 英語、README.ja.md → 日本語）
- [x] LICENSE ファイル追加（MIT）
- [x] smithery.yaml 追加（Smithery対応準備）
- [ ] Smithery登録（有料プラン必要 — hosted deploymentは無料プラン非対応）
- [x] 公式MCP Registry登録（`io.github.nakishiyaman/dig`）
- [x] mcpName フィールド追加 + createSandboxServer エクスポート
- [x] npm公開（mcp-server-dig@0.4.1）
- [ ] Zed拡張パッケージング（API安定後、Rustラッパー必要）

## v0.6.0 — コード考古学ツール拡充 第2弾

- [x] `git_pickaxe` ツール（コード追加/削除コミット検索 — `git log -S/-G`）
  - [x] ツール実装 + 統合テスト
- [x] `git_code_churn` ツール（ファイル単位の変更量分析 — `git log --numstat`）
  - [x] パーサー: parseNumstatOutput + 型定義: FileChurn
  - [x] ツール実装 + 統合テスト
- [x] `git_stale_files` ツール（長期間未更新ファイル検出）
  - [x] パーサー: parseStaleFiles + 型定義: StaleFile
  - [x] ツール実装 + 統合テスト
- [x] `git_merge_base` ツール（ブランチ分岐点・差分分析）
  - [x] ツール実装 + 統合テスト
- [x] `git_tag_list` ツール（タグ/リリース一覧）
  - [x] パーサー: parseTagOutput + 型定義: TagInfo
  - [x] ツール実装 + 統合テスト
- [x] README.md 更新（新5ツールのドキュメント追加）
- [x] npm公開（mcp-server-dig@0.6.0）
- [x] release-please PAT修正（GITHUB_TOKEN → Fine-Grained PAT で CI トリガー問題解決）
- [x] Auto-merge有効化（Release PR の自動マージ）
- [x] 開発ワークフロー強化:
  - [x] `.claude/rules/` 導入（general, git-workflow, implementation, testing, validation）
  - [x] `CLAUDE.md` 作成（プロジェクト概要・規律）
  - [x] ADR導入（`docs/adr/` — 3件記録）
  - [x] GitHub Issueテンプレート（bug.yml, feature.yml）
  - [x] リリースボディテンプレート（`.github/release-body.md`）
  - [x] 検証チェックリストテンプレート（`reference/templates/release-validation.md`）

## v0.7.0 — 組み合わせ分析（垂直統合）

- [x] 分析ロジックの抽出（`src/analysis/`）
  - [x] `analyzeHotspots()` — 変更頻度分析
  - [x] `analyzeChurn()` — コードチャーン分析
  - [x] `analyzeContributors()` — コントリビューター分析
  - [x] `analyzeCoChanges()` — 共変更分析
  - [x] `analyzeFileStaleness()` — 鮮度分析
  - [x] 既存4ツールのリファクタリング（hotspots, churn, contributors, related_changes）
  - [x] 全55テストパス確認
- [x] `git_file_risk_profile` ツール（ファイルリスク評価）
  - [x] 5次元リスク分類（変更頻度, チャーン, 知識集中度, 結合度, 鮮度）
  - [x] 統合テスト追加
- [x] `git_repo_health` ツール（リポジトリ健全性サマリー）
  - [x] 並列分析実行（Promise.all）
  - [x] 統合テスト追加
- [x] README.md / README.ja.md 更新
  - [x] 新ツールドキュメント
  - [x] Zed/Cursor/Windsurf 設定例追加
- [x] ROADMAP更新（Zed拡張をスコープ外に移動）

## v0.8.0 — ワークフロー統合ツール

- [x] `git_review_prep` ツール（PRレビュー準備ブリーフィング）
  - [x] diff stat, commit一覧, hotspots, churn分析の並列実行
  - [x] リスクファイル検出 + 変更漏れ候補の警告
  - [x] レビュアー推薦（コントリビューター分析ベース）
  - [x] 統合テスト追加
- [x] `git_why` ツール（コード考古学ナラティブ）
  - [x] blame + commit詳細 + contributors + co-changes統合
  - [x] 行範囲指定対応
  - [x] 統合テスト追加
- [x] index.ts にワークフロー統合ツール登録
- [x] CLAUDE.md ツール数・バージョン更新

## v0.9.0 — MCP体験強化・品質・パフォーマンス

優先順: B → A → C

### B. MCP体験強化（Prompts/Resources）
- [x] MCP Promptsの追加（ユースケース別ガイドテンプレート）
  - [x] investigate-code: コード調査（git_why → git_pickaxe → git_file_history）
  - [x] review-pr: PRレビュー（git_review_prep → git_file_risk_profile）
  - [x] assess-health: リポジトリ健全性評価（git_repo_health → git_hotspots → git_stale_files）
  - [x] trace-change: 変更追跡（git_pickaxe → git_commit_show）
- [x] ツール選択ガイドのResource提供（dig://tool-guide）

### A. コード品質・保守性向上
- [x] 統合テストファイルの分割（925行 → 18ファイル、vitest globalSetup + provide/inject）
- [ ] ツール登録パターンの共通化（ROI低のため保留 — ハンドラー多様性が高い）
- [x] `index.ts` の `version` ハードコード修正（createRequireでpackage.jsonから動的取得）

### C. パフォーマンス最適化
- [x] 組み合わせツール内の重複git呼び出し削減（`git_repo_health`, `git_review_prep`, `git_file_risk_profile`）
  - [x] `parseCombinedNumstat`: 1回のnumstat出力からhotspots+churn同時算出
  - [x] `analyzeHotspotsAndChurn`: 統合分析関数（git log 2回→1回）
  - [x] `countStaleFiles`: git log --since による一括判定（N回→1回）
  - [x] `git ls-files` 重複排除（2回→1回）
- [ ] 結果キャッシュ層の導入（プロファイリングで必要性確認後）

### D. ドキュメント
- [x] README更新（Prompts/Resources機能の記載追加）

## v0.10.0 — ツール拡充 + UX強化

### Phase 1（並行実装可能）
- [x] `git_knowledge_map` ツール（ディレクトリ別知識所有者マップ + バス係数）
  - [x] `src/analysis/knowledge-map.ts`（分析関数 + 純粋関数テスト）
  - [x] `src/tools/git-knowledge-map.ts`（ツール登録）
  - [x] 統合テスト（6件）+ 単体テスト（10件）
- [x] `git_dependency_map` ツール（ディレクトリ間共変更ネットワーク）
  - [x] `src/analysis/dependency-map.ts`（分析関数）
  - [x] `src/tools/git-dependency-map.ts`（ツール登録）
  - [x] 統合テスト（4件）
- [x] `git_bisect_guide` ツール（bisect事前分析）
  - [x] `src/tools/git-bisect-guide.ts`（ツール登録）
  - [x] 統合テスト（5件）
- [x] `onboard-codebase` Prompt（新規参入者向けオンボーディングガイド）
  - [x] `src/prompts/onboard-codebase.ts`
  - [x] プロンプトテスト追加
- [x] エラーメッセージ改善（ENOENT / not a git repository のガイダンス付きメッセージ）
- [x] `tool-guide` リソース更新（20ツール対応 + 新連携パターン追加）

### Phase 2（Phase 1に依存）
- [x] `find-bug-origin` Prompt（git_bisect_guide依存）
- [x] `dig://repo-summary/{path}` 動的Resource（ResourceTemplate使用）

### Phase 3（最終）
- [x] ツール出力へのアクション提案（組み合わせ・ワークフローツールのみ）
- [x] README更新（EN/JA: 3新ツール + 2新Prompt + 1新Resource）
- [x] ROADMAP更新

## v0.11.0 — 品質強化・パフォーマンス・運用改善

### Phase 1: エッジケーステスト拡充 + パーサー堅牢化
- [x] テストデータ拡充（バイナリファイル、非ASCIIファイル名、大量コミット）
- [x] エッジケース統合テスト（3→14テストに拡充）
- [x] パーサー防御的改善（Bin行スキップ、空commitHashガード）

### Phase 2: タイムアウト柔軟化
- [x] `timeout_ms` パラメータ追加（6ツール: repo_health, review_prep, file_risk_profile, why, code_churn, hotspots）
- [x] 分析関数への `timeoutMs` 伝播

### Phase 3: 結果キャッシュ層
- [x] `AnalysisCache`（TTL 60秒、LRU eviction、最大100エントリ）
- [x] `cachedAnalyzeHotspotsAndChurn` / `cachedAnalyzeContributors`
- [x] `ToolContext` 型定義、複合ツールへのcontext伝播
- [x] ADR-0004: キャッシュ設計判断

### Phase 4: 構造化ログ
- [x] `Logger` クラス（JSON形式stderr出力、DIG_LOG_LEVEL環境変数制御）
- [x] index.ts の console.error → logger 置換

### Phase 5: Prompt追加 + ドキュメント
- [x] `technical-debt` Prompt（技術的負債分析ワークフロー）
- [x] `onboard-area` Prompt（領域別オンボーディング）
- [x] ADR-0004
- [x] tool-guide リソース更新（timeout_ms、新連携パターン）
- [x] ROADMAP更新

## v0.12.0 — timeout_ms完全展開 + 実行観測性

### Phase 1: timeout_ms全20ツール展開
- [x] 直接execGit呼び出し10ツールにtimeout_msパラメータ追加
- [x] 分析関数経由4ツール + 分析関数2件にtimeoutMs追加
- [x] 全パラメータはoptional（破壊的変更なし）

### Phase 2: 実行タイミングログ
- [x] execGitにperformance.now()計測 + logger.debugログ追加
- [x] AnalysisCacheにhit/missログ追加
- [x] startTimerユーティリティ（src/tools/timing.ts）+ テスト

### Phase 3: ドキュメント・リソース更新
- [x] tool-guideリソース更新（全20ツールtimeout_ms対応）
- [x] ROADMAP更新
- [x] README.md / README.ja.md 更新
- [x] CLAUDE.md バージョン更新

## v0.13.0 — ROADMAPクリーンアップ + 安定性改善

### Phase 1: ROADMAP・ドキュメント整理
- [x] v0.13.0候補の決着記録（不採用/延期の判断と理由）
- [x] CLAUDE.md バージョン更新
- [x] HANDOFF更新（auto-mergeブロッカー削除）

### Phase 2: `git_why`へのキャッシュ適用
- [x] `git_why` に `ToolContext` 受け取り追加
- [x] `analyzeContributors` をキャッシュ経由に変更
- [x] `index.ts` の `registerGitWhy` に `context` 渡し

### Phase 3: 依存関係更新
- [x] `npm outdated` で確認 — メジャーアップデートのみ（@types/node 25, vitest 4, zod 4）。互換性リスクが高いため v0.13.0 では見送り

### v0.13.0候補の決着

| 候補 | 判断 | 理由 |
|------|------|------|
| executor層キャッシュ | **不採用** | ADR-0004で分析レベルキャッシュ採用済み。データ取得ツール16個はLLMから個別に呼ばれ同一引数の連続呼び出しは稀。オプション違いでキャッシュキー正規化が複雑。分析レベルキャッシュが複合ツール間の重複を既にカバー |
| JSON出力モード | **延期** | 設計方針が「LLMが理解しやすい構造化テキスト」。MCPクライアントは現在LLM主流でJSON需要不明確。20ツール全てにdual format対応は変更面積大。内部型整備済みのため需要確認後に追加可能 |

## v0.14.0 — メジャー依存アップデート

### Phase 1: Node.js 18サポート廃止 + vitest 4
- [x] `package.json` — `engines.node` を `">=20"` に変更
- [x] `.github/workflows/ci.yml` — マトリクス `[18, 20, 22]` → `[20, 22]`
- [x] `package.json` — vitest `^2.1.0` → `^4.0.0` に更新
- [x] vitest 4破壊的変更対応
  - [x] `GlobalSetupContext` 削除対応（インライン型定義に変更）
  - [x] `logger.test.ts` 暗黙any型修正
- [x] 全164テストパス確認

### Phase 2: ドキュメント更新
- [x] README.md / README.ja.md — Node.js要件 `>=18` → `>=20`
- [x] CLAUDE.md — バージョン更新（v0.14.0）
- [x] ROADMAP — v0.14.0セクション追加

### v0.14.0候補の決着

| 候補 | 判断 | 理由 |
|------|------|------|
| zod 4 | **見送り** | MCP SDKの`zod-to-json-schema`がv3専用。SDK側の対応待ち |
| @types/node 25 | **見送り** | サポート対象Node.jsバージョン（20/22）と不整合。@types/nodeメジャー版はターゲットNode.jsに合わせる慣例 |

## v0.15.0 — 新ツール + テストカバレッジ基盤

### Phase 1: 依存関係メンテナンス
- [x] `npm update` でlockfileリフレッシュ（transitive deps更新）
- [x] ビルド・テスト確認

### Phase 2: `git_rename_history` ツール
- [x] `RenameEntry` 型追加（src/git/types.ts）
- [x] `parseRenameOutput()` パーサー追加（src/git/parsers.ts）
- [x] パーサー単体テスト（5件）
- [x] ツール実装（src/tools/git-rename-history.ts）
- [x] テストリポジトリにrename操作追加（global-setup.ts）
- [x] 統合テスト（2件）
- [x] index.ts にツール登録

### Phase 3: `git_commit_graph` ツール
- [x] ツール実装（src/tools/git-commit-graph.ts）
  - マージ比率、頻度/週、トップマージソース、統合スタイル分類
- [x] テストリポジトリにmerge操作追加（global-setup.ts — `--no-ff` で明示的マージコミット作成）
- [x] 統合テスト（3件）
- [x] index.ts にツール登録

### Phase 4: テストカバレッジ基盤
- [x] `@vitest/coverage-v8` 導入
- [x] vitest.config.ts にcoverage設定追加（v8 provider, text/lcov reporter）
- [x] `test:coverage` スクリプト追加
- [x] thresholds設定（statements: 28%, branches: 28%, functions: 33%, lines: 28%）

### Phase 5: ドキュメント・仕上げ
- [x] tool-guideリソース更新（22ツール対応）
- [x] CLAUDE.md バージョン・ツール数更新
- [x] README.md / README.ja.md 新ツールドキュメント追加
- [x] ROADMAP v0.15.0セクション追加

### v0.15.0候補の決着

| 候補 | 判断 | 理由 |
|------|------|------|
| zod 4 | **見送り** | MCP SDKの`zod-to-json-schema`がv3専用。SDK側の対応待ち |
| @types/node 25 | **見送り** | サポート対象Node.jsバージョン（20/22）と不整合 |

## v0.16.0 — テストカバレッジ向上（MCP統合テスト移行）

### Phase 1: MCP統合テスト基盤
- [x] `src/tools/__tests__/mcp-test-helpers.ts` 作成
  - `createTestMcpClient()`: InMemoryTransport + Client + Server接続
  - `closeMcpClient()`: クリーンアップ
  - `getToolText()` / `isToolError()`: レスポンスユーティリティ
- [x] `src/index.ts` のエントリポイントガード（テスト時のstdio接続を防止）

### Phase 2: データ取得ツールの移行（13ファイル）
- [x] `execGit()` + パーサー呼び出し → `client.callTool()` に書き換え
- [x] アサーション: `content[0].text` の `toContain` マッチ
- [x] エラーケース追加: 不正パスで `isError: true`
- [x] 対象: git_file_history, git_blame_context, git_related_changes, git_contributor_patterns, git_search_commits, git_commit_show, git_diff_context, git_hotspots, git_pickaxe, git_code_churn, git_stale_files, git_merge_base, git_tag_list

### Phase 3: 追加ツール群の移行（8ファイル）
- [x] git_knowledge_map, git_dependency_map, git_bisect_guide, git_rename_history, git_commit_graph
- [x] composite-tools: git_file_risk_profile, git_repo_health
- [x] workflow-tools: git_review_prep, git_why

### Phase 4: エッジケース・エラー系テスト
- [x] edge-cases.integration.test.ts の移行（blame, バイナリ, 非ASCII, truncation）
- [x] MCPプロトコル経由でのエラーケース検証

### Phase 5: thresholds引き上げ + ドキュメント
- [x] `vitest.config.ts` のthresholdsを50%に引き上げ
- [x] ROADMAP.md に v0.16.0 セクション追加
- [x] CLAUDE.md バージョン更新

### カバレッジ結果
| 指標 | v0.15.0 | v0.16.0 |
|------|---------|---------|
| Statements | 33% | 84% |
| Branches | 28% | 64% |
| Functions | 33% | 89% |
| Lines | 28% | 85% |

### 移行しなかったもの
- `src/git/parsers.test.ts`（48件）: パーサーアルゴリズムの単体テスト
- `src/analysis/cache.test.ts`（12件）: キャッシュ動作の単体テスト
- `src/analysis/knowledge-map.test.ts`（10件）: 分析アルゴリズムの単体テスト
- `executor.integration.test.ts`: execGit自体のテスト
- `analysis-layer.integration.test.ts`: 分析関数の統合テスト

## v0.17.0 — ブランチカバレッジ向上

### Phase 1: 高インパクトツール（branches 64% → 71%+）
- [x] `git_diff_context`: stat_only分岐、同一コミット差分なし分岐、stat_only+file_path
- [x] `git_file_history`: sinceパラメータ空結果分岐、パス検証エラー分岐
- [x] `git_repo_health`: sinceパラメータで空結果系分岐
- [x] `git_review_prep`: HEAD~1..HEAD（少変更PR）、HEAD..HEAD（変更なし）

### Phase 2: 中インパクトツール
- [x] `git_commit_graph`: 未来日付でコミットなし分岐
- [x] `git_tag_list`: マッチなしpatternでタグなし分岐
- [x] `git_why`: max_commits=1で「... and N more commit(s)」分岐
- [x] `git_bisect_guide`: 同一refで0コミット分岐

### Phase 3: 低コスト高カバレッジ
- [x] `git_contributor_patterns`: path_pattern付き空結果
- [x] `git_related_changes`: 高min_couplingで共変更なし
- [x] `git_stale_files`: path_pattern付きスコープ表示
- [x] `git_merge_base`: 同一refで(no commits)分岐

### Phase 4: リソース
- [x] `repo-summary`: 生成関数の統合テスト

### Phase 5: thresholds引き上げ + ドキュメント
- [x] `vitest.config.ts` のbranches thresholdを50% → 65%に引き上げ
- [x] `reference/ROADMAP.md` にv0.17.0セクション追加
- [x] `CLAUDE.md` バージョン更新

### カバレッジ結果
| 指標 | v0.16.0 | v0.17.0 |
|------|---------|---------|
| Statements | 84% | 90% |
| Branches | 64% | 71% |
| Functions | 89% | 92% |
| Lines | 85% | 92% |

## v0.18.0 — ブランチカバレッジ80%+、新ツール2本、分類ロジック共通化、Node.js 24準備

### Phase 1: GitHub Actions Node.js 24 対応準備
- [x] CI/CDワークフローに `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"` 追加
- [x] CI（Node 20/22）パス確認

### Phase 2: 分類ロジック共通化リファクタリング
- [x] `src/analysis/risk-classifiers.ts` に分類関数8個を抽出
- [x] `git-file-risk-profile.ts` のローカル関数を共通モジュールからimport
- [x] `git-commit-graph.ts` の `classifyIntegrationStyle` を共通モジュールからimport
- [x] 37件のユニットテスト（境界値テスト完備）

### Phase 3: ブランチカバレッジ向上
- [x] テストリポジトリに4追加著者（Carol, Dave, Eve, Frank）
- [x] 15件の統合テスト追加
- [x] branches threshold 65%→78%

### Phase 4: 新ツール追加
- [x] `git_branch_activity` — ブランチ活性度分析（active/stale/abandoned）
- [x] `git_author_timeline` — 著者活動タイムライン分析
- [x] 12件の統合テスト（各ツール6件）
- [x] ツールガイド・CLAUDE.md更新（22→24ツール）

### カバレッジ結果
| 指標 | v0.17.0 | v0.18.0 |
|------|---------|---------|
| Statements | 90% | 92% |
| Branches | 71% | 79% |
| Functions | 92% | 93% |
| Lines | 92% | 94% |

## v0.20.0 — JSON出力モード + 新ツール + カバレッジ80%

### Phase 1: MCP SDK + zod アップデート
- [x] `@modelcontextprotocol/sdk` 1.26.0 → 1.27.1
- [x] `zod` 3.23.0 → 4.3.6（zod 4はMCP SDK 1.27.1でサポート）

### Phase 2: JSON出力モード基盤
- [x] `outputFormatSchema`: text/json選択スキーマ
- [x] `formatResponse`: テキスト/JSON出力切り替えヘルパー
- [x] 単体テスト8件

### Phase 3: 全25ツールにJSON出力モード適用
- [x] 全ツールに`output_format`パラメータ追加
- [x] 構造化データオブジェクト構築 + formatResponse適用
- [x] 既存テスト全パス確認

### Phase 4: `git_commit_frequency` ツール
- [x] 時間帯別コミット頻度分析（daily/weekly/monthly粒度）
- [x] `CommitFrequencyBucket` 型追加（src/git/types.ts）
- [x] tool-guideリソース更新（25ツール対応）
- [x] 統合テスト6件

### Phase 5: ブランチカバレッジ80%+
- [x] JSON出力モード統合テスト追加
- [x] staleness/knowledge-map/dependency-mapのエッジケーステスト
- [x] ブランチカバレッジ: 79% → 80%+

### Phase 6: ドキュメント更新
- [x] CLAUDE.md バージョン・ツール数更新（24→25）
- [x] ROADMAP v0.20.0セクション追加
- [x] README.md / README.ja.md 更新

### カバレッジ結果
| 指標 | v0.18.0 | v0.20.0 |
|------|---------|---------|
| Statements | 92% | 93% |
| Branches | 79% | 80% |
| Functions | 93% | 93% |
| Lines | 94% | 94% |

## v0.21.0 — 新ツール3本 + ブランチカバレッジ82%+

### Phase 1: ブランチカバレッジ向上（80% → 83%+）
- [x] 11ファイルのエッジケーステスト追加（~22件）
- [x] カスタムテストリポジトリ追加（古いコミット日付、単一著者、非標準マージ）
- [x] branches threshold 78% → 82%

### Phase 2: `git_release_notes` ツール
- [x] Conventional Commits解析（type/scope/breaking change検出）
- [x] group_by: type/scope/none、コントリビューター一覧
- [x] 統合テスト8件

### Phase 3: `git_code_ownership_changes` ツール
- [x] 日付境界での前期/後期所有権比較
- [x] `getDirectoryAtDepth` / `computeBusFactor` 再利用（knowledge-map.ts）
- [x] 所有者交代・バス係数変化・新規/離脱コントリビューター検出
- [x] 統合テスト7件

### Phase 4: `git_impact_analysis` ツール
- [x] blast radius分析（co-change + contributor + dependency map統合）
- [x] `ToolContext` キャッシュ活用（cachedAnalyzeContributors）
- [x] blast radius分類: low (<3), medium (3-10), high (10+)
- [x] 統合テスト8件

### Phase 5: ドキュメント更新
- [x] `src/index.ts` — 3ツール登録（データ取得21→22, 複合分析2→4）
- [x] `src/resources/tool-guide.ts` — 3ツール追加、ツール数更新
- [x] `CLAUDE.md` — v0.21.0、ツール数25→28
- [x] `README.md` / `README.ja.md` — 新ツールドキュメント
- [x] `reference/ROADMAP.md` — v0.21.0セクション追加
- [x] `vitest.config.ts` — branches threshold 78% → 82%

### カバレッジ結果
| 指標 | v0.20.0 | v0.21.0 |
|------|---------|---------|
| Statements | 93% | 94%+ |
| Branches | 80% | 83%+ |
| Functions | 93% | 93%+ |
| Lines | 94% | 94%+ |

## v0.22.0 — ブランチカバレッジ85%+

### Phase 1: 高インパクトテスト追加
- [x] `branch-coverage-v022.integration.test.ts` 新規作成（43テスト）
- [x] カスタムテストリポジトリ6種作成（dominant author, unrelated histories, no tags, high coupling, master branch, large diff）
- [x] git_impact_analysis: high blast radius + >20 co-changed truncation
- [x] git_review_prep: 変更なしケース + missing files検出
- [x] git_branch_activity: symbolic-refフォールバック + masterデフォルト + ブランチなし
- [x] git_author_timeline: dominant contributor + 単一著者警告 + 空結果（since+path_pattern）

### Phase 2: 中・低インパクトテスト追加
- [x] git_search_commits: since/path_pattern条件分岐
- [x] git_blame_context: start_lineのみ / end_lineのみ指定
- [x] git_why: start_lineのみ / end_lineのみ / JSON出力
- [x] git_merge_base: 共通祖先なし（orphanブランチ）
- [x] git_commit_show: diff表示
- [x] git_commit_graph: マージなしリポジトリ + JSON出力
- [x] git_knowledge_map: 単一所有者ディレクトリ
- [x] git_contributor_patterns: 空結果
- [x] git_tag_list: パターン不一致
- [x] git_code_churn: 空結果
- [x] git_commit_frequency: weekly/daily粒度
- [x] git_diff_context: 大きなdiff
- [x] git_code_ownership_changes: ソート分岐

### Phase 3: ユニットテスト追加
- [x] response.test.ts: 非ErrorオブジェクトのerrorResponse
- [x] logger.test.ts: DIG_LOG_LEVEL環境変数テスト

### Phase 4: thresholds引き上げ
- [x] `vitest.config.ts` branches threshold 82% → 85%

### カバレッジ結果
| 指標 | v0.21.0 | v0.22.0 |
|------|---------|---------|
| Statements | 95% | 96% |
| Branches | 82% | 85% |
| Functions | 94% | 95% |
| Lines | 95% | 97% |

## スコープ外

| 項目 | 理由 |
|------|------|
| Zed拡張のRust実装 | 設定ベース接続で十分。ROI極低 |
| HTTP/SSEトランスポート | ADR-0003で決定済み |
| Smithery有料プラン | MCP Registry登録済みで配布十分 |
| git以外のVCS対応 | スコープ拡大は焦点を失わせる |
| 単純ラッパーの追加 | 価値を生まない。垂直統合に注力 |
| AIによる自動解釈・要約 | LLMの仕事。ツールはデータ提供に専念 |

## 既知の技術的課題

- [ ] RELEASE_PLEASE_TOKEN の年次更新（2027-03頃）
- release-please re-runでは `release_created` が false になる（workflow_dispatch で手動publish可能）
