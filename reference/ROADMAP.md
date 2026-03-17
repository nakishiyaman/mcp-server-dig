# mcp-server-dig ロードマップ

最終更新: 2026-03-17 (v0.43.0/v0.42.0ロードマップ策定)

## v0.43.0 — 新分析ツール + MCPプロトコル対応

詳細な評価記録: `docs/recommended-practices.md` 第5回評価

### Phase 1: `git_code_survival`（データツール）
- [ ] コード生存率分析 — 特定期間に書かれたコードが現在何%残っているか
  - git blame + 日付分析でcohort別生存率を算出
  - `git_code_age`の拡張概念（スナップショット→時系列）
  - Hercules/git-of-theseusの手法をgit CLIのみで実現

### Phase 2: `git_rework_rate`（データツール）
- [ ] 短期チャーン分析 — コードが追加後N日以内に書き直される率
  - DORA 2025の第5指標「Deployment Rework Rate」に対応
  - git log + diff解析で「追加後2週間以内の変更」を検出
  - `git_revert_analysis` + `git_code_churn`の発展形

### Phase 3: Bus Factor Risk Matrix（組み合わせ分析ツール）
- [ ] 変更頻度×コントリビューター数の2軸分類
  - Danger Zone（高頻度変更×少数コントリビューター）の検出
  - 既存の`git_hotspots` + `git_knowledge_map`データを組み合わせ
  - 新データ取得不要の純粋な組み合わせ分析

### Phase 4: Sum of Coupling強化
- [ ] `git_related_changes`にSum of Coupling指標を追加
  - ファイルが他の全ファイルと共変更される回数の総和
  - code-maat/CodeSceneの標準メトリクス

### Phase 5: `extract-dora-metrics` Prompt
- [ ] DORA 5指標抽出ワークフロー
  - tag_analysis → Deployment Frequency
  - commit_frequency → Lead Time近似
  - revert_analysis → Change Failure Rate近似
  - git_rework_rate → Rework Rate

### Phase 6: outputSchema宣言
- [ ] JSON出力対応ツールにoutputSchemaを追加
  - June 2025 MCP Spec準拠
  - `structuredContent` + `content`テキストの併用で既存出力と両立

### Phase 7: ドキュメント・仕上げ
- [ ] `src/index.ts` — 新ツール登録
- [ ] `src/resources/tool-guide.ts` — 新ツール追加
- [ ] `CLAUDE.md` — v0.43.0、ツール数更新
- [ ] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [ ] `reference/ROADMAP.md` — v0.43.0完了チェック

## v0.42.0 — セキュリティ硬化 + 品質基盤 + 配布改善

詳細な評価記録: `docs/recommended-practices.md` 第5回評価

### Phase 1: セキュリティ硬化（CVE-2025-68144対策）
- [ ] `src/git/executor.ts` — 引数インジェクション防止
  - `-`で始まるref/ブランチ引数を入力検証レイヤーで明示的に拒否
  - CVE-2025-68144（Anthropic mcp-server-git）の直接的教訓
- [ ] `src/git/executor.ts` — シンボリックリンクバイパス防止
  - `validateFilePath()`に`fs.realpath()`チェック追加
  - `path.resolve()` + `startsWith()`はsymlinkを追跡しない問題の修正
- [ ] `src/git/executor.ts` — Git環境変数サニタイズ
  - execFileの`env`オプションで`GIT_DIR`、`GIT_CONFIG*`等をunset
  - 親プロセス経由のgit操作リダイレクト防止
- [ ] 出力サニタイズ — 制御文字ストリッピング
  - git出力から`\x00`-`\x1f`（`\n`/`\t`除く）を除去
  - プロンプトインジェクション/ANSIエスケープ対策
- [ ] セキュリティテスト追加

### Phase 2: 品質基盤
- [ ] Strykerインクリメンタル変異テスト導入
  - `@stryker-mutator/core` + `@stryker-mutator/vitest-runner` + `@stryker-mutator/typescript-checker`
  - 対象: `src/git/parsers.ts` + `src/analysis/` (クリティカルパス)
  - `--incremental`モードでPR単位のCI実行
- [ ] eslint-plugin-sonarjs導入
  - Cognitive Complexityメトリクス（閾値15、`"warn"`から開始）
  - `complexity`ルール（閾値10、`"warn"`）
  - `max-depth`ルール（閾値4、`"warn"`）
- [ ] Vitest `expect.schemaMatching()` 活用
  - 既存Zodスキーマをテストアサーションに転用する箇所の特定・適用

### Phase 3: 配布改善
- [ ] `server.json` バージョン同期自動化
  - release-pleaseワークフローで`server.json`のversion更新
  - `mcp-publisher` CLIによるMCP Registry自動公開（GitHub OIDC）
- [ ] Smithery登録
  - 使用分析 + Cursorワンクリックインストール
- [ ] awesome-mcp-servers PR
  - Developer ToolsまたはCode Analysisカテゴリ
- [ ] README改善
  - 「Why」セクション追加（「Without dig」vs「With dig」の対比）
  - npm version/downloads/license/CIバッジ追加
  - VS Code `.vscode/mcp.json` 設定スニペット追加

### Phase 4: ドキュメント
- [ ] `CLAUDE.md` — v0.42.0
- [ ] `reference/ROADMAP.md` — v0.42.0完了チェック
- [ ] `docs/recommended-practices.md` — 第5回評価記録（本セクション）

## v0.41.0 — 新ツール2本 + 新Prompt1本

### Phase 1: git_activity_drought（データツール）
- [x] `src/tools/period-utils.ts` — `generatePeriodRange()` 追加
- [x] `src/tools/period-utils.test.ts` — generatePeriodRange テスト6件追加
- [x] `src/tools/git-activity-drought.ts` — ツール実装（NEW）
- [x] `src/tools/__tests__/git-activity-drought.integration.test.ts` — テスト7件

### Phase 2: git_stability_prediction（組み合わせ分析ツール）
- [x] `src/analysis/risk-classifiers.ts` — `classifyRevertRatio`, `classifyChurnTrend` 追加
- [x] `src/analysis/risk-classifiers.test.ts` — 境界値テスト10件追加
- [x] `src/analysis/stability-prediction.ts` — 純粋スコアリング関数（NEW）
- [x] `src/analysis/stability-prediction.test.ts` — 単体テスト6件
- [x] `src/tools/git-stability-prediction.ts` — ツール実装（NEW）
- [x] `src/tools/__tests__/git-stability-prediction.integration.test.ts` — テスト6件

### Phase 3: prepare-knowledge-transfer Prompt
- [x] `src/prompts/prepare-knowledge-transfer.ts` — Prompt実装（NEW）
- [x] `src/prompts/prompts.test.ts` — テスト4件追加

### Phase 4: ドキュメント・仕上げ
- [x] `src/resources/tool-guide.ts` — 2ツール追加（52→54）
- [x] `CLAUDE.md` — v0.41.0、54ツール、18 Prompts
- [x] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.41.0セクション追加
- [x] `src/index.ts` — 登録（データ38 + 組み合わせ14 + Prompt18）

## v0.40.0 — ブランチカバレッジ86%回復

### Phase 1: ブランチカバレッジ回復（83.57% → 86.06%）
- [x] `src/tools/__tests__/branch-coverage-v040.integration.test.ts` 新規作成（144テスト）
  - git-tag-analysis純粋関数単体テスト（parseTags, analyzeSemver, computeIntervals, detectTrend, extractPrefixes）
  - repo-summary直接関数テスト
  - 低カバレッジツール（Tier 1/Tier 2）のエッジケース統合テスト
  - 未テストツール初回カバレッジ（revert_analysis, survival_analysis, code_ownership_changes, commit_message_quality, branch_activity, complexity_hotspots）
  - カスタムマルチ期間リポジトリ（バックデートコミットで contributor growth retention, revert time-to-revert, expertise decay inactive/fading, formatSize KB分岐をカバー）
  - 空結果パスのsinceなしフィルタテスト（commit_frequency, author_timeline, commit_patterns）

### カバレッジ結果
| 指標 | v0.39.0 | v0.40.0 |
|------|---------|---------|
| Statements | 94% | 95.7% |
| Branches | 83.57% | 86.06% |
| Functions | 92% | 93.75% |
| Lines | 95% | 96.8% |

## v0.39.0 — formatPeriodKey共通化 + git_tag_analysis + analyze-release-cadence

### Phase 1: formatPeriodKey共通化（リファクタリング）
- [x] `src/tools/period-utils.ts` — `formatPeriodKey` 共通モジュール（NEW）
- [x] `src/tools/period-utils.test.ts` — テスト8件
- [x] `src/tools/git-commit-frequency.ts` — ローカル定義削除、import追加
- [x] `src/tools/git-velocity-anomalies.ts` — 同上
- [x] `src/tools/git-survival-analysis.ts` — 同上

### Phase 2: git_tag_analysis ツール（TDD）
- [x] `src/tools/git-tag-analysis.ts` — タグベースリリースパターン分析ツール（NEW）
- [x] `src/tools/__tests__/git-tag-analysis.integration.test.ts` — 統合テスト7件

### Phase 3: analyze-release-cadence Prompt
- [x] `src/prompts/analyze-release-cadence.ts` — リリースケイデンス分析Prompt（NEW）
- [x] `src/prompts/prompts.test.ts` — テスト4件追加

### Phase 4: 登録・ドキュメント
- [x] `src/index.ts` — データ37 + 複合13 + Prompt17登録
- [x] `src/resources/tool-guide.ts` — 52ツール対応、リリースケイデンス分析パターン追加
- [x] `CLAUDE.md` — v0.39.0、52ツール、17 Prompts
- [x] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.39.0セクション追加

## v0.38.0 — 新ツール2本 + 新Prompt1本（知識衰退・速度異常・エキスパート発見）

### Phase 1: 分析層 — 純粋関数 (TDD)
- [x] `src/analysis/velocity-anomaly.ts` — 速度異常検出純粋関数（NEW）
- [x] `src/analysis/velocity-anomaly.test.ts` — テスト6件
- [x] `src/analysis/expertise-decay.ts` — 専門知識衰退分析（NEW）
- [x] `src/analysis/risk-classifiers.ts` — `classifyExpertiseDecay` 追加
- [x] `src/analysis/risk-classifiers.test.ts` — テスト6件追加

### Phase 2: キャッシュ層
- [x] `src/analysis/cached-analysis.ts` — `cachedAnalyzeExpertiseDecay` 追加

### Phase 3: git_expertise_decay ツール（複合分析）
- [x] `src/tools/git-expertise-decay.ts` — 知識所有者活動鮮度分析ツール（NEW）
- [x] `src/tools/__tests__/git-expertise-decay.integration.test.ts` — 統合テスト7件

### Phase 4: git_velocity_anomalies ツール（データ）
- [x] `src/tools/git-velocity-anomalies.ts` — コミット頻度異常検出ツール（NEW）
- [x] `src/tools/__tests__/git-velocity-anomalies.integration.test.ts` — 統合テスト7件

### Phase 5: find-experts Prompt
- [x] `src/prompts/find-experts.ts` — エキスパート発見Prompt（NEW）
- [x] `src/prompts/prompts.test.ts` — テスト4件追加

### Phase 6: 登録・ドキュメント
- [x] `src/index.ts` — データ36 + 複合13 + Prompt16登録
- [x] `src/resources/tool-guide.ts` — 51ツール対応、新連携パターン3件追加
- [x] `CLAUDE.md` — v0.38.0、51ツール、16 Prompts
- [x] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.38.0セクション追加

## v0.37.0 — プロパティベーステスト導入（TLA+記事知見の転用）

### 背景
TLA+のモデル検査・状態空間爆発の解説記事から、形式検証の概念をテスト戦略に転用する。
詳細な評価記録: `docs/recommended-practices.md` 第4回評価

### Phase 1: fast-check導入 + パーサープロパティテスト
- [x] `package.json` — `@fast-check/vitest` devDependency追加
- [x] `src/git/parsers.property.test.ts` — パーサー堅牢性プロパティテスト（17テスト）
  - 全12パーサーが任意文字列入力でクラッシュしない
  - parseLogOutput: 出力が常に配列（空含む）
  - parseBlameOutput: 出力の各エントリにcommitHashが存在
  - parseDiffStatOutput: insertions/deletions >= 0
  - parseCombinedNumstat: hotspots/churnが常にArray
  - parseStaleFiles: daysSinceLastChange >= 0

### Phase 2: 不変条件テスト
- [x] `src/tools/__tests__/invariants.test.ts` — システム不変条件の体系的テスト（6テスト）
  - successResponse: 出力が常に50,000文字+truncation suffix以内
  - successResponse: MCP準拠構造（content[0].type === "text", isError undefined）
  - errorResponse: 常にisError: true + "Error: "プレフィックス
  - errorResponse: Error/非Error入力で常にクラッシュしない
  - formatResponse: text/json両モードでMCP準拠構造

### Phase 3: キャッシュ層プロパティテスト
- [x] `src/analysis/cache.property.test.ts` — キャッシュ不変条件テスト（6テスト）
  - TTL超過エントリが`get()`で返されない
  - エントリ数がmaxEntries（100）を超えない
  - ランダムなget/set操作列でクラッシュしない
  - set直後のgetが同じ値を返す（TTL内）
  - buildCacheKey: 同一引数で同一結果（決定性）
  - buildCacheKey: 異なる入力で異なるキー
- [x] `src/analysis/cache.ts` — evictLRU空文字キーバグ修正（プロパティテストで発見）

### Phase 4: ドキュメント
- [x] `CLAUDE.md` — v0.37.0、プロパティベーステスト導入記載
- [x] `reference/ROADMAP.md` — v0.37.0完了チェック

## v0.36.0 — 新ツール2本（組み合わせ分析2） + 新Prompt1本

### Phase 1-2: 分析層
- [x] `src/analysis/offboarding-simulation.ts` — 離脱シミュレーション純粋関数
- [x] `src/analysis/offboarding-simulation.test.ts` — テスト3件
- [x] `src/analysis/coordination-bottleneck.ts` — 調整コスト計算純粋関数
- [x] `src/analysis/coordination-bottleneck.test.ts` — テスト4件
- [x] `src/analysis/risk-classifiers.ts` — `classifyCoordinationCost` 追加
- [x] `src/analysis/risk-classifiers.test.ts` — テスト8件追加

### Phase 3: キャッシュ層
- [x] `src/analysis/cached-analysis.ts` — `cachedAnalyzeKnowledgeMap` 追加

### Phase 4: git_offboarding_simulation
- [x] `src/tools/git-offboarding-simulation.ts` — 離脱シミュレーションツール新規作成
- [x] `src/tools/__tests__/git-offboarding-simulation.integration.test.ts` — 統合テスト7件

### Phase 5: git_coordination_bottleneck
- [x] `src/tools/git-coordination-bottleneck.ts` — 調整コスト分析ツール新規作成
- [x] `src/tools/__tests__/git-coordination-bottleneck.integration.test.ts` — 統合テスト7件

### Phase 6: plan-release Prompt
- [x] `src/prompts/plan-release.ts` — リリース計画レビューPrompt新規作成
- [x] `src/prompts/prompts.test.ts` — テスト4件追加

### Phase 7: 登録・ドキュメント
- [x] `src/index.ts` — 2ツール + 1 Prompt登録（47→49ツール、14→15 Prompts）
- [x] `src/resources/tool-guide.ts` — 2ツール追加、新ワークフローパターン
- [x] `CLAUDE.md` — v0.36.0、ツール数更新
- [x] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.36.0セクション追加

## v0.35.0 — 新ツール2本（データ1 + 複合分析1） + 新Prompt1本

### Phase 1: git_revert_analysis（データツール）
- [x] `src/tools/__tests__/global-setup.ts` — リバートコミット追加（Alice: buggy feature + revert）
- [x] `src/tools/git-revert-analysis.ts` — リバートパターン分析ツール新規作成
- [x] `src/tools/__tests__/git-revert-analysis.integration.test.ts` — 統合テスト7件

### Phase 2: git_contributor_growth（複合分析ツール）
- [x] `src/tools/git-contributor-growth.ts` — コントリビューター増減・定着率分析ツール新規作成
- [x] `src/tools/__tests__/git-contributor-growth.integration.test.ts` — 統合テスト7件

### Phase 3: post-incident-review Prompt
- [x] `src/prompts/post-incident-review.ts` — ポストインシデントレビューPrompt新規作成
- [x] `src/prompts/prompts.test.ts` — テスト4件追加

### Phase 4: 登録・ドキュメント
- [x] `src/index.ts` — 2ツール + 1 Prompt登録（45→47ツール、13→14 Prompts）
- [x] `src/resources/tool-guide.ts` — 2ツール追加、新ワークフローパターン
- [x] `CLAUDE.md` — v0.35.0、ツール数更新
- [x] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.35.0セクション追加

## v0.34.0 — 新データツール2本 + 新Prompt1本

### Phase 1: git_repo_statistics（データツール）
- [x] `src/tools/git-repo-statistics.ts` — リポジトリ物理構造分析ツール新規作成
- [x] `src/tools/__tests__/git-repo-statistics.integration.test.ts` — 統合テスト6件

### Phase 2: git_commit_patterns（データツール）
- [x] `src/tools/git-commit-patterns.ts` — 曜日・時間帯別コミット分布分析ツール新規作成
- [x] `src/tools/__tests__/git-commit-patterns.integration.test.ts` — 統合テスト7件

### Phase 3: diagnose-performance Prompt
- [x] `src/prompts/diagnose-performance.ts` — パフォーマンス診断ワークフローPrompt新規作成
- [x] `src/prompts/prompts.test.ts` — テスト4件追加

### Phase 4: 登録・ドキュメント
- [x] `src/index.ts` — 2ツール + 1 Prompt登録（43→45ツール、12→13 Prompts）
- [x] `src/resources/tool-guide.ts` — 2ツール追加、新ワークフローパターン
- [x] `CLAUDE.md` — v0.34.0、ツール数更新
- [x] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.34.0セクション追加

## v0.33.0 — 新ツール2本 + 新Prompt1本

### Phase 1: git_complexity_hotspots（複合分析ツール）
- [x] `src/analysis/risk-classifiers.ts` — `classifyConflictFrequency()` 追加
- [x] `src/analysis/risk-classifiers.test.ts` — 境界値テスト5件追加
- [x] `src/tools/git-complexity-hotspots.ts` — 6次元リスク評価ツール新規作成
- [x] `src/tools/__tests__/git-complexity-hotspots.integration.test.ts` — 統合テスト7件

### Phase 2: git_merge_timeline（データツール）
- [x] `src/analysis/trend-analysis.ts` — `computePeriodBoundaries()`, `formatPeriodLabel()` をexport化
- [x] `src/tools/git-merge-timeline.ts` — マージ頻度時系列分析ツール新規作成
- [x] `src/tools/__tests__/git-merge-timeline.integration.test.ts` — 統合テスト5件

### Phase 3: identify-tech-debt Prompt
- [x] `src/prompts/identify-tech-debt.ts` — 技術的負債分析ワークフローPrompt新規作成
- [x] `src/prompts/prompts.test.ts` — テスト4件追加

### Phase 4: 登録・ドキュメント
- [x] `src/index.ts` — 2ツール + 1 Prompt登録
- [x] `src/resources/tool-guide.ts` — 2ツール追加、新ワークフローパターン
- [x] `README.md` / `README.ja.md` — 新ツール・Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.33.0セクション追加

## v0.32.0 — ブランチカバレッジ回復

### Phase 1: ブランチカバレッジ回復（85.93% → 86.72%）
- [x] `src/tools/__tests__/branch-coverage-v032.integration.test.ts` 新規作成（17テスト）
  - git_release_comparison: formatDelta正負ゼロ分岐、topHotspots表示、assessment分岐
  - git_refactor_candidates: HIGH risk next actions、サマリー表示
  - git_reflog_analysis: 空reflog分岐
  - git_trend_analysis: worsening方向 + next actions（hotspots/contributors）
  - git_knowledge_loss_risk: HIGH/MEDIUM/LOW risk directory出力、highRisk next actions
  - git_survival_analysis: daily粒度、since+path_pattern空結果
  - ref-comparison.ts: busFactors.length === 0分岐

### Phase 2: ドキュメント
- [x] `CLAUDE.md` — v0.31.0 → v0.32.0
- [x] `reference/ROADMAP.md` — v0.32.0セクション追加

### カバレッジ結果
| 指標 | v0.31.0 | v0.32.0 |
|------|---------|---------|
| Statements | 96% | 96% |
| Branches | 85.93% | 86.72% |
| Functions | 94% | 94% |
| Lines | 97% | 97% |

### 見送り判断
| 候補 | 判断 | 理由 |
|------|------|------|
| branches threshold 87% | 見送り（86%維持） | 残り未カバー分岐はcache-context false branches（`context ? cached : uncached`ternary）が大半。MCP統合テストではcachedパスのみ通るため87%到達にはテスト基盤変更が必要 |
| @types/node 25 | 見送り継続 | ターゲットNode 22と不整合 |

## v0.31.0 — 新ツール2本 + 新Prompt2本

### Phase 1: `git_refactor_candidates`
- [x] `src/tools/git-refactor-candidates.ts` — 5次元リスク評価でリファクタリング候補ランキング
- [x] `src/tools/__tests__/git-refactor-candidates.integration.test.ts` — 統合テスト6件

### Phase 2: `git_release_comparison`
- [x] `src/analysis/knowledge-map.ts` — `until`パラメータ追加
- [x] `src/analysis/ref-comparison.ts` — `analyzeAtRef()` 新規
- [x] `src/analysis/cached-analysis.ts` — `cachedAnalyzeAtRef()` 追加
- [x] `src/tools/git-release-comparison.ts` — ツール実装
- [x] `src/tools/__tests__/git-release-comparison.integration.test.ts` — 統合テスト6件

### Phase 3: Prompt 2本
- [x] `src/prompts/plan-refactoring.ts` — リファクタリング計画ワークフロー
- [x] `src/prompts/assess-change-risk.ts` — 変更前リスク評価ワークフロー
- [x] `src/prompts/prompts.test.ts` — テスト追加

### Phase 4: ドキュメント・仕上げ
- [x] `src/index.ts` — 2ツール + 2 Prompt登録
- [x] `src/resources/tool-guide.ts` — 2ツール追加（39→41）
- [x] `CLAUDE.md` — v0.31.0、ツール数41、Prompt数11
- [x] `README.md` / `README.ja.md` — 新ツール・新Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.31.0セクション追加

## v0.30.0 — 複合分析の深化

### Phase 0: 準備
- [x] ブランチ作成: `feat/v0.30.0-composite-depth`
- [x] CLAUDE.md — v0.29.0リリース済み → v0.30.0開発中

### Phase 1: `git_knowledge_loss_risk` (TDD)
- [x] `src/analysis/knowledge-loss-risk.ts` — `analyzeKnowledgeLossRisk()` 分析関数
  - 再利用: `analyzeKnowledgeMap()`, `analyzeContributors()`, `computeBusFactor()`
  - 著者別所有権集計 + bus_factor=1ディレクトリ特定 + 回復コスト分類
- [x] `src/analysis/cached-analysis.ts` — `cachedAnalyzeKnowledgeLossRisk()` 追加
- [x] `src/tools/git-knowledge-loss-risk.ts` — `registerGitKnowledgeLossRisk(server, context)`
- [x] `src/tools/__tests__/git-knowledge-loss-risk.integration.test.ts` — 統合テスト8件
- [x] `src/index.ts` — 登録追加（複合分析セクション）

### Phase 2: `git_trend_analysis` (TDD)
- [x] `src/analysis/trend-analysis.ts` — `analyzeTrend()` 分析関数
  - 再利用: `analyzeHotspotsAndChurn()`, `analyzeContributors()`
  - 期間別分析呼び出し + delta計算 + トレンド方向分類
- [x] `src/analysis/cached-analysis.ts` — `cachedAnalyzeTrend()` 追加
- [x] `src/tools/git-trend-analysis.ts` — `registerGitTrendAnalysis(server, context)`
- [x] `src/tools/__tests__/git-trend-analysis.integration.test.ts` — 統合テスト8件
- [x] `src/index.ts` — 登録追加

### Phase 3: gitフラグ強化（既存ツール深化）
- [x] `src/tools/git-blame-context.ts` — `detect_moves: boolean` パラメータ追加 → blame `-M` フラグ
- [x] `src/tools/git-diff-context.ts` — `word_diff: boolean` パラメータ追加 → diff `--word-diff=plain`
- [x] 各ツールの統合テストに2件追加

### Phase 4: ai-agent-safety Prompt
- [x] `src/prompts/ai-agent-safety.ts` — `buildAiAgentSafetyPrompt()` + `registerAiAgentSafety()`
  - args: repo_path, target_files(string)
  - chains: file_risk_profile → impact_analysis → related_changes → conflict_history
- [x] `src/prompts/prompts.test.ts` — 4アサーション追加
- [x] `src/index.ts` — Prompt登録追加

### Phase 5: ドキュメント・仕上げ
- [x] `src/resources/tool-guide.ts` — 2新ツール + 1新Prompt追加、ツール数37→39
- [x] `CLAUDE.md` — v0.30.0、ツール数37→39（複合分析4→6）、Prompts 8→9
- [x] `README.md` / `README.ja.md` — 新ツール・新Promptドキュメント
- [x] `reference/ROADMAP.md` — v0.30.0セクション追加
- [x] `vitest.config.ts` — branches threshold 86→84（trend_analysis presentation branches）
- [x] `src/tools/__tests__/v030-branch-coverage.integration.test.ts` — 26テスト追加

### カバレッジ
| 指標 | v0.29.0 | v0.30.0 |
|------|---------|---------|
| Statements | 96% | 95% |
| Branches | 86% | 84% |
| Functions | 94% | 94% |
| Lines | 97% | 96% |

**注**: branches 86→84%の低下は `git_trend_analysis` の presentation branches（4 metrics × 3 directions × 3 period lengths のswitch文）が原因。テストリポジトリのデータでは全組み合わせを網羅できないため、次バージョンで unit test 追加により回復予定。

## v0.29.0 — 新ツール2本（git_line_history + git_commit_cluster）

- [x] Phase 0: CLAUDE.mdバージョン修正（v0.27.0開発中 → v0.29.0開発中）
- [x] Phase 1: `git_line_history` — git log -Lベースの行レベル変遷追跡
  - LineHistoryEntry interface追加
  - parseLineLogOutput() パーサー + 単体テスト
  - テストリポジトリにcalculator.tsの複数編集追加
  - registerGitLineHistory() ツール登録
  - 統合テスト7件
- [x] Phase 2: `git_commit_cluster` — 時間近接性+ファイル共有度でコミット群検出
  - CommitCluster interface追加
  - clusterCommits() 純粋関数（union-findベースクラスタリング）
  - registerGitCommitCluster() ツール登録
  - 統合テスト8件
- [x] Phase 3: 登録・ドキュメント
  - index.ts — 2ツール登録（データ取得29→31）
  - tool-guide.ts — 2ツール追加（35→37）
  - CLAUDE.md — v0.29.0、ツール数37
  - README.md / README.ja.md — 新ツールドキュメント
  - ROADMAP.md — v0.29.0セクション追加
- [x] Phase 4: ブランチカバレッジ86%維持
  - 4テスト追加（reflog_analysis, pickaxe, dependency_map, line_history）
  - branches 85.73% → 86.12%

## v0.24.0 — MCP SDK新機能フル活用

- [x] Phase 1: Tool Annotations（全33ツールに `readOnlyHint: true, openWorldHint: false`）
- [x] Phase 2: MCP Logging Protocol移行（`server.sendLoggingMessage()` + stderrフォールバック）
- [x] Phase 3: Streamable HTTP Transport対応（`--http`フラグ / `DIG_TRANSPORT=http`）
- [x] Phase 4: Completion（プロンプト引数・リソースURIの自動補完）
- [x] Phase 5: ドキュメント・リリース準備

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

## v0.23.0 — メンテナンス + 新ツール3本 + Node.js 24 CI

### Phase 1: メンテナンス
- [x] vitest `^4.0.0` → `^4.1.0`, @vitest/coverage-v8 `^4.0.18` → `^4.1.0`
- [x] package.json files に `"!build/**/*.js.map"` 追加（ソースマップ除外、npm軽量化）

### Phase 2: Node.js 24 CI
- [x] `.github/workflows/ci.yml` matrix `[20, 22]` → `[20, 22, 24]`
- [x] ブランチ保護に `ci (24)` 追加

### Phase 3: 新ツール3本
- [x] `git_contributor_network` — コントリビューター共同作業グラフ
  - `src/analysis/contributor-network.ts`: analyzeContributorNetwork()
  - `src/tools/git-contributor-network.ts`: registerGitContributorNetwork()
  - 統合テスト4件
- [x] `git_conflict_history` — マージコンフリクト頻発ファイル検出
  - `src/tools/git-conflict-history.ts`: registerGitConflictHistory()
  - 統合テスト5件
- [x] `git_survival_analysis` — コードチャーン時系列分析
  - `src/tools/git-survival-analysis.ts`: registerGitSurvivalAnalysis()
  - 統合テスト6件

### Phase 4: カバレッジ維持
- [x] ブランチカバレッジ向上テスト追加（43件）
- [x] パーサー単体テスト追加（1件）
- [x] branches threshold 85%維持

### Phase 5: ドキュメント
- [x] `src/index.ts` — 3ツール登録（データ取得22→25）
- [x] `src/resources/tool-guide.ts` — 3ツール追加、ツール数更新（28→31）
- [x] `CLAUDE.md` — v0.23.0、ツール数28→31
- [x] `README.md` / `README.ja.md` — 新ツールドキュメント
- [x] `reference/ROADMAP.md` — v0.23.0セクション追加

### カバレッジ結果
| 指標 | v0.22.0 | v0.23.0 |
|------|---------|---------|
| Statements | 96% | 96% |
| Branches | 85% | 85% |
| Functions | 95% | 94% |
| Lines | 97% | 97% |

## v0.24.0 — Node.js 20廃止 + 新ツール2本 + ブランチカバレッジ維持

### Phase 1: Node.js 20サポート廃止
- [x] `.github/workflows/ci.yml` — matrix `[20, 22, 24]` → `[22, 24]`
- [x] `package.json` — `engines.node` `">=20"` → `">=22"`, `@types/node` `^20` → `^22`
- [x] `.claude/rules/git-workflow.md` — Required checks更新（`ci (20)` 削除）
- [x] `README.md` / `README.ja.md` — Node.js要件更新

### Phase 2: 新ツール2本
- [x] `git_code_age` — ファイル内の行をage bracket別に集計（blameデータ再利用）
  - `src/tools/git-code-age.ts` + 統合テスト6件
- [x] `git_commit_message_quality` — コミットメッセージ品質分析
  - `src/tools/git-commit-message-quality.ts` + 統合テスト6件
- [x] `src/index.ts` にツール登録（データ取得25→27）

### Phase 3: ブランチカバレッジ維持（85%）
- [x] `branch-coverage-v024.integration.test.ts` 新規作成（59テスト）
- [x] 新ツールのエッジケース + 既存ツールの未カバーブランチ追加
- [x] branches threshold 85%維持

### Phase 4: ドキュメント
- [x] `src/resources/tool-guide.ts` — 2ツール追加（31→33）
- [x] `CLAUDE.md` — v0.24.0、ツール数33、Node>=22
- [x] `README.md` / `README.ja.md` — 新ツールドキュメント
- [x] `reference/ROADMAP.md` — v0.24.0セクション追加
- MCP SDK 1.27.1は最新 → no-op

### カバレッジ結果
| 指標 | v0.23.0 | v0.24.0 |
|------|---------|---------|
| Statements | 96% | 96% |
| Branches | 85% | 85% |
| Functions | 94% | 94% |
| Lines | 97% | 96% |

### ブランチ保護（手動）
- [x] GitHub Settings → Required checks から `ci (20)` を削除

## v0.25.0 — server.registerTool() 移行

### Phase 1: server.tool() → server.registerTool() 移行
- [x] 全33ツールファイル（`src/tools/git-*.ts`）を `server.registerTool()` に変換
  - `server.tool("name", "desc", {schema}, {annotations}, handler)` → `server.registerTool("name", {description, inputSchema, annotations}, handler)`
- [x] ビルド・全テストパス確認
- [x] CLAUDE.md バージョン更新
- [x] ROADMAP v0.25.0セクション追加

## v0.26.0 — TypeScript 5.9 + ブランチカバレッジ86%+

### Phase 1: TypeScript 5.9 アップデート
- [x] `package.json`: `typescript` `^5.8.0` → `^5.9.0`
- [x] 検証: typecheck → build → test（全585テストパス）

### Phase 2: ブランチカバレッジ向上（85% → 86%+）
- [x] `src/tools/__tests__/branch-coverage-v026.integration.test.ts` 新規作成
  - git_contributor_network: 21+著者でnodes/edges truncation分岐カバー
  - git_why: 空ファイルで`blocks.length === 0`分岐カバー
  - git_survival_analysis: 空結果 + monthly粒度複数期間ソート
  - git_conflict_history: マージコミットありだがファイル変更なし
  - git_impact_analysis: ディレクトリカップリング分岐カバー
  - git_repo_health: staleファイル分岐 + knowledge_map提案
  - その他: JSON出力・エッジケースバッチテスト（15件）
- [x] `src/transports.test.ts` 拡張: HTTP startTransport + 404パス + /mcpパス
- [x] `src/git/parsers.test.ts` 拡張: 不完全blame出力、空ハッシュ、staleファイルエッジケース
- [x] `src/analysis/cache.test.ts` 拡張: LRU eviction false branch
- [x] `src/analysis/knowledge-map.test.ts` 拡張: getDirectoryAtDepth複数階層
- [x] `vitest.config.ts` branches threshold 85 → 86
- [x] `vitest.config.ts` coverage exclude: `src/git/types.ts`（純粋型定義ファイル）

### Phase 3: TransportHandle導入
- [x] `src/transports.ts`: `startTransport` 戻り値を `TransportHandle` に変更（close + port）
  - HTTPモードのテスタビリティ向上（ポート取得 + サーバー停止）

### Phase 4: ドキュメント
- [x] `CLAUDE.md` バージョン更新（v0.25.0 → v0.26.0）
- [x] `reference/ROADMAP.md` v0.26.0セクション追加

### カバレッジ結果
| 指標 | v0.25.0 | v0.26.0 |
|------|---------|---------|
| Statements | 96% | 96% |
| Branches | 85% | 86% |
| Functions | 94% | 94% |
| Lines | 97% | 97% |

### 見送り判断
| 候補 | 判断 | 理由 |
|------|------|------|
| @types/node 25 | 見送り | ターゲットNode 22と不整合 |
| executor.ts ENOENT分岐 | 延期 | PATH操作が必要、ROI低 |
| index.ts isMainModule分岐 | 許容 | エントリポイントガードはモジュールimportテストで本質的にカバー不可 |
| branches 87% | 調整（86%） | 残り163未カバー分岐の大半はcache-context false branches（14）、defensive dead code（parsers/executor）、unreachable switch defaults。87%到達にはテスト基盤の再構築が必要でROI低 |

## v0.27.0 — 新ツール2本（git_reflog_analysis + git_cherry_pick_detect）

### Phase 1: テストリポジトリ拡張
- [x] `global-setup.ts` — cherry-pick操作追加、reset操作追加（reflogエントリ生成）

### Phase 2: `git_reflog_analysis`（TDD）
- [x] `ReflogEntry` interface追加（src/git/types.ts）
- [x] `src/tools/git-reflog-analysis.ts` — registerGitReflogAnalysis()
- [x] 統合テスト7件
- [x] `src/index.ts` にツール登録（データ取得27→28）

### Phase 3: `git_cherry_pick_detect`（TDD）
- [x] `CherryPickEntry` interface追加（src/git/types.ts）
- [x] `src/tools/git-cherry-pick-detect.ts` — registerGitCherryPickDetect()
- [x] 統合テスト6件
- [x] `src/index.ts` にツール登録（データ取得28→29）

### Phase 4: ドキュメント・仕上げ
- [x] `src/resources/tool-guide.ts` — 2ツール追加（33→35）
- [x] `CLAUDE.md` — v0.27.0、ツール数33→35（データ取得27→29）
- [x] `README.md` / `README.ja.md` — 新ツールドキュメント
- [x] `reference/ROADMAP.md` — v0.27.0セクション追加
- [x] `vitest.config.ts` — branches threshold 86維持

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
