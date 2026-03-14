# v0.30.0 方向性リサーチ

日時: 2026-03-14

## 背景

v0.29.0リリース完了後、次バージョンの方向性を決定するために実施した包括的リサーチ。
4つの並列調査（プロダクト哲学分析、競合分析、git機能ギャップ分析、ユーザーワークフロー分析）と
2軸の深掘り（縦軸: 複合分析実装可能性、横軸: 隣接領域・新セグメント）を統合。

## 現在地の評価

### プロダクトの哲学

- **コア**: Git履歴をAIが問い合わせ可能な考古学データベースに変換する
- **原則**: ツールはデータ提供に徹し、解釈はLLMに任せる
- **制約**: git-only、読み取り専用、外部サービス無依存、repo-agnostic

### 競合ポジション

| 観点 | 状態 |
|------|------|
| MCP git分析ツール | **競合なし**（37 tools vs 他の2-12 tools） |
| 最も近い直接競合 | davidorex/git-forensics-mcp（4 tools、狭いスコープ） |
| 商用ツール（CodeScene等） | 「組み合わせ分析」で差別化。digにない機能: temporal coupling閾値、DORA、off-boarding simulation、financial impact |
| 学術分野（MSR） | 未カバー: SZZアルゴリズム（バグ導入コミット検出）、defect prediction |

### 構造的特徴

4層の垂直統合:

```
データ取得 (31 tools) → 分析関数 (src/analysis/) → 複合分析 (4 tools) → ワークフロー (2 tools)
```

**不均衡**: データ取得31本 vs 複合分析4本（8:1の比率）。データは揃っているが「組み合わせて答える」層が薄い。

---

## 縦軸リサーチ: 既存資産の深掘り

### A. 新複合ツール候補の実装可能性

#### 1. git_knowledge_loss_risk（知識喪失リスク）— 推奨

- **答える問い**: 「この人が離脱したら何が危険か」
- **組み合わせ元**: knowledge_map + author_timeline + code_age + risk_classifiers
- **アルゴリズム**: 著者別に所有権%を集計、bus factor=1のディレクトリを特定、最終コミット日でrecency重み付け
- **データ構造**: `DirectoryKnowledge`, `AuthorTimeline`, `computeBusFactor()` — 全て既存
- **新規ロジック**: 著者別の所有権クロスディレクトリ集計 + 回復コスト推定ヒューリスティクス
- **工数**: ~350 LOC（`git_file_risk_profile`と同程度）
- **リスク**: 低（新gitコマンド不要、純粋な集計処理）
- **CodeSceneとの比較**: CodeSceneはMLベース。本ツールはgit履歴のみで軽量に実現

#### 2. git_trend_analysis（トレンド分析）— 推奨

- **答える問い**: 「品質は改善/悪化しているか」
- **組み合わせ元**: hotspots + churn + contributors + commit_frequency（時間窓比較）
- **アルゴリズム**: 同一分析関数を異なる`--since`で複数回呼び出し、期間間差分を計算
- **既存インフラ**: `formatPeriodKey()`（survival-analysis）、`cachedAnalyzeHotspotsAndChurn()`
- **出力**: 各メトリクスのperiod-over-period比較 + トレンド方向 + 解釈テキスト
- **工数**: ~400 LOC
- **リスク**: 低（全パターン実証済み）

#### 3. git_developer_overwrite（開発者間上書き行列）— 延期

- **答える問い**: 「誰が誰のコードを書き換えているか」
- **アルゴリズム**: 各コミットの変更行について、前リビジョンのblame結果と比較
- **問題**: O(commits × files × lines) のblame呼び出し → 大規模リポジトリでタイムアウト
- **代替案**: ファイルタッチ回数ベースの近似（10x高速、80%の情報量）
- **判断**: 性能問題が解決するまで延期。近似版は将来的に検討

### B. 既存ツールのgitフラグ拡張（低コスト高価値）

| ツール | 追加フラグ | 効果 | 工数 |
|--------|-----------|------|------|
| git_blame_context | `-M`（コード移動検出） | 著者 vs リファクタリングの区別 | 低 |
| git_blame_context | `-C`（コピペ検出） | コード複製パターン可視化 | 低 |
| git_diff_context | `--word-diff` | 語レベルの変更表示 | 低 |
| git_diff_context | `--find-renames`/`--find-copies` | リネーム・コピー検出 | 低 |
| git_file_history | `--all`（全ブランチ） | クロスブランチの進化追跡 | 低 |
| git_file_history | `-p`（パッチ付き） | コミットごとの差分表示 | 低〜中 |

### C. 既存複合ツールの強化余地

| ツール | 追加可能なデータソース | 効果 |
|--------|---------------------|------|
| git_repo_health | commit velocity trend（時系列） | スナップショット→トレンドに進化 |
| git_repo_health | knowledge_map（depth=1） | ディレクトリ別知識集中度 |
| git_file_risk_profile | code_age分析 | 「古いコード×高チャーン」リスク |
| git_file_risk_profile | contributor velocity | 「主要著者がまだ活動中か」 |
| git_review_prep | blame for changed lines | 「安定コード vs 不安定コードへの変更」判別 |
| git_review_prep | dependency_map（影響波及） | 「このPRの間接影響範囲」 |
| git_why | blame `-M`（移動検出） | 著者帰属の正確化 |

### D. 分析関数の再利用ポテンシャル

**1ツールでしか使われていない関数**（再利用余地あり）:

| 関数 | 現在の利用先 | 再利用候補 |
|------|------------|-----------|
| `analyzeKnowledgeMap()` | git_knowledge_map のみ | repo_health, risk_profile, 新ツール |
| `analyzeContributorNetwork()` | git_contributor_network のみ | repo_health |
| `analyzeDependencyMap()` | git_dependency_map + impact_analysis | review_prep |

**新規分析関数候補**:

| 関数 | 効果 | 活用先 |
|------|------|--------|
| `analyzeCommitVelocity()` | 月別コミット数トレンド | repo_health, trend_analysis |
| `analyzeContributorVelocity()` | 著者別活動トレンド | risk_profile, knowledge_loss_risk |

---

## 横軸リサーチ: 隣接領域の探索

### A. ワークフロー拡張（新Prompt）— 最高効率

コードゼロで新ワークフローを追加可能。最高のROI。

| Prompt | 対象シナリオ | 組み合わせるツール |
|--------|------------|-----------------|
| **incident-postmortem** | インシデント後の原因調査 | pickaxe + blame + file_history + commit_cluster |
| **migration-impact** | ライブラリ移行の影響評価 | dependency_map + code_age + hotspots + knowledge_map |
| **release-readiness** | リリース前リスク評価 | code_churn + risk_profile + stale_files + commit_message_quality |
| **security-forensics** | セキュリティインシデント調査 | pickaxe + blame + file_history + reflog_analysis |
| **assess-contributor-health** | OSS維持者向け健全性評価 | author_timeline + contributor_network + knowledge_map + commit_frequency |
| **sprint-retrospective-data** | スプリント振り返りデータ | commit_frequency + author_timeline + contributor_patterns + hotspots |

### B. AIエージェント最適化 — 戦略的ポジショニング

**発見**: Claude Code 63%普及率の時代。digは「エージェントが変更前に必ず参照する制度的記憶層」になれる。競合ゼロ。

| 施策 | 内容 | 工数 |
|------|------|------|
| pre-flightチェックPrompt | 「このファイルを変更する前にリスクを評価」 | 低 |
| post-editチェックPrompt | 「変更後に関連ファイルの漏れを検出」 | 低 |
| compact出力モード | トークン節約のための要約出力 | 中 |
| Tool Annotations強化 | `idempotentHint`等でエージェント判断を支援 | 低 |

### C. DX改善・エコシステム対応

| 施策 | 内容 | 工数 |
|------|------|------|
| MCP Registry登録 | 公式レジストリへのserver.json公開 | 最低 |
| クライアント設定プリセット | Claude Desktop, Cursor, VS Code, JetBrains用の設定例 | 低 |
| Roots対応 | MCP Rootsでrepo_path自動検出（呼び出し摩擦低減） | 低 |

### D. MCPプロトコル進化

| 機能 | 内容 | 状態 | digへの適用 |
|------|------|------|-----------|
| Tasks API (SEP-1686) | 長時間実行のfire-and-forget | 実験的だが安定化中 | 大規模リポジトリでのタイムアウト解消 |
| Elicitation | 対話的な絞り込み | SDK対応済み | pickaxeの結果が多すぎる場合の対話的絞り込み |
| Sampling | サーバー側LLM呼び出し | クライアント依存 | release-notesの要約等 |
| Server Cards | .well-known/mcp.json | HTTP transport必要 | 将来的な発見性向上 |

### E. ユーザーセグメント拡張

| セグメント | 整合性 | 工数 | 競合状況 | 推奨 |
|-----------|--------|------|---------|------|
| **AIコーディングエージェント** | 完全一致 | 低〜中 | 競合ゼロ | **推進** |
| **OSS維持者** | 高 | 低 | 弱（CHAOSSは重い） | **推進** |
| **エンジニアリングマネージャー** | 中 | 低 | 強（LinearB等） | **探索** |
| **セキュリティ監査** | 低（forensics除く） | 最低 | 強（GitGuardian等） | **Promptのみ** |
| **教育・学生** | 中 | 最低 | 弱 | **受動的サポート** |

---

## 決定: v0.30.0 の3本柱

### 柱1: 複合分析深化（新ツール2本）

- `git_knowledge_loss_risk` — 著者離脱時の知識喪失リスク評価
- `git_trend_analysis` — メトリクスの期間比較トレンド分析

### 柱2: ワークフロー拡張（新Prompt 3-4本）

- incident-postmortem, release-readiness, assess-contributor-health, security-forensics

### 柱3: エコシステム適応

- MCP Registry登録
- 主要クライアント設定プリセット
- エージェント向けPrompt（pre-flight risk check）

---

## 延期・見送り判断

| 項目 | 判断 | 理由 |
|------|------|------|
| git_developer_overwrite | 延期 | O(N×M×K)のblame呼び出し。性能問題が解決するまで保留 |
| DORA metrics | 見送り | CI/CD情報が必要。git-only哲学と不整合 |
| マルチリポ分析 | 見送り | アーキテクチャ変更大。スコープ外に明記済み |
| API破壊的変更検出 | 見送り | AST解析が必要。git履歴の範囲を超える |
| Tasks API | 延期 | 実験的機能。SDKの安定化を待つ |
| 既存ツールgitフラグ拡張 | v0.30.0以降 | ROIは高いが今回のスコープ外（複合分析とPromptに集中） |
| 既存複合ツール強化 | v0.30.0以降 | 個別の強化は次回以降に順次実施 |

## 参考: リサーチで参照した主要情報源

- CodeScene: Behavioral Code Analysis（temporal coupling, off-boarding simulation）
- GitClear: Code churn metrics, AI code quality tracking
- code-maat (Adam Tornhill): オープンソース temporal coupling分析
- Hercules (source{d}): Developer overwrite matrix
- CHAOSS: OSS community health metrics
- MCP 2026 Roadmap: Tasks API, Elicitation, Server Cards
- MCP Registry: server.json format, npm-based distribution
- Claude Code普及率: 4% → 63%（2025-05 → 2026-02）
- AI code assistant市場: $4.7B (2025) → $14.6B (2033予測)
