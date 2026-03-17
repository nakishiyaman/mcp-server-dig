# 推奨プラクティス検討結果

Tessera (~/projects/tessera) の成熟した開発ワークフローを分析し、mcp-server-digへの適合性を評価した記録。

## 採用済み

以下はAGENTS.md、`.claude/settings.json`、`.claude/commands/`、`.zed/settings.json` に組み込み済み。

| # | プラクティス | 導入先 | 根拠 |
|---|------------|-------|------|
| 1 | 日本語 Conventional Commits | AGENTS.md | 開発スタイルの一貫性 |
| 2 | ブランチ戦略 `{type}/{description}` | AGENTS.md | GitHub公開時にmain保護と併用 |
| 3 | TDD (Red-Green-Refactor) | AGENTS.md | パーサー・統合テストの品質担保 |
| 4 | 「原因を直せ、症状を消すな」原則 | AGENTS.md | プロジェクト種別を問わない普遍的規律 |
| 5 | 隠蔽パターン禁止 | AGENTS.md + eslint.config.js | @ts-ignore, console.log, 空catch等 |
| 6 | Plan Modeデフォルト | AGENTS.md | 3ステップ以上は計画から開始 |
| 7 | 完了前検証 | AGENTS.md + Stopフック | build + test必須 |
| 8 | PreToolUseフック（設定ファイル保護） | .claude/settings.json | .env, package-lock.json, tsconfig.json |
| 9 | PostToolUseフック（自動format+lint） | .claude/settings.json | prettier + eslint 自動実行 |
| 10 | Stopフック（品質ゲート） | .claude/settings.json | build + vitest + 未コミット警告 |
| 11 | セッション引き継ぎ (`/handoff`) | .claude/commands/handoff.md | 未コミット変更commit+push → ROADMAP更新 → HANDOFF.md生成 |
| 12 | セッション再開 (`/progress`) | .claude/commands/progress.md | HANDOFF.md + ROADMAP.md読み込み → 現状報告 + 次タスク提案 |
| 13 | ファイルベース進捗管理 | reference/ROADMAP.md + reference/HANDOFF.md | セッション間の継続性を保証する唯一の真実の情報源 |
| 14 | `/lint` コマンド | .claude/commands/lint.md | prettier --write + eslint --fix 一括実行 |
| 15 | `/test` コマンド | .claude/commands/test.md | build + vitest 一括実行、失敗分析付き |
| 16 | Zedエディタ設定 | .zed/settings.json | format_on_save, prettier, tab_size:2, inline_blame |
| 17 | `.claude/rules/` ディレクトリ | .claude/rules/git-workflow.md, implementation.md | ルールの自動ロードによる規律の実効性確保 |
| 18 | CLAUDE.md | CLAUDE.md | プロジェクト概要+ゴール駆動+規律の最上位文書 |

## 適合性評価の全記録

Tesseraのワークフロー要素を2回に分けて網羅的に評価した。以下はその全記録。

### 第1回評価（ワークフロー分析）

Tesseraの主要ワークフロー（CLAUDE.md, AGENTS.md, .claude/rules/, .claude/settings.json）を対象に評価。

| # | Tessera要素 | 概要 | 判定 | 理由 |
|---|-----------|------|------|------|
| 1 | 日本語 Conventional Commits | `feat:`, `fix:` 等の日本語コミット | **採用** | 開発スタイルの一貫性 |
| 2 | ブランチ戦略 `{type}/{description}` | main保護, PR必須 | **採用** | GitHub公開後にmain保護と併用 |
| 3 | TDD (Red-Green-Refactor) | テスト先行、最小実装、リファクタ | **採用** | パーサー・統合テストの品質担保 |
| 4 | PostToolUseフック | 編集後にprettier + eslint自動実行 | **採用** | 手動フォーマットのミス防止 |
| 5 | Stopフック | セッション終了時にtest + typecheck | **採用** | 完了前の品質ゲートとして有効 |
| 6 | PreToolUseフック | 設定ファイルの編集をブロック | **採用** | 設定変更によるlint回避を防止 |
| 7 | 「原因を直せ、症状を消すな」原則 | 全修正に適用される最上位規律 | **採用** | プロジェクト種別を問わず普遍的 |
| 8 | 隠蔽パターン禁止 | @ts-ignore, eslint-disable, 空catch等 | **採用** | TypeScriptプロジェクトとして同じリスク |
| 9 | Plan Modeデフォルト | 3ステップ以上は計画から開始 | **採用** | コンテキスト管理として有効 |
| 10 | セッション引き継ぎ (`/handoff`) | HANDOFF.md生成 + commit + push | **採用** | 初回から導入（後の評価で格上げ） |
| 11 | `.claude/rules/` ディレクトリ | ルールファイルの自動ロード | **採用** | git-workflow.md, implementation.md を導入（v0.6.0） |
| 12 | CLAUDE.md | プロジェクト概要+規律の最上位文書 | **採用** | tessera準拠で作成（v0.6.0） |
| 13 | ADR | `docs/adr/` で設計判断を記録 | **見送り** | v0.1の小規模プロジェクトには過剰 |
| 12 | E2Eテスト (WebdriverIO) | Tauri + ブラウザ自動テスト | **見送り** | MCPサーバーにはstdio統合テストで十分 |
| 13 | release-please自動リリース | feat:/fix:でRelease PR自動生成 | **見送り** | npm公開時に導入 |
| 14 | 検証チェックリスト (Write-Through) | `reference/validations/` | **見送り** | v1リリース時に検討 |
| 15 | Exploreサブエージェント活用 | 大規模調査の委任 | **見送り** | コードベースが小さいうちは不要 |

### 第2回評価（網羅的監査）

第1回で見落としたTesseraの全ワークフロー要素を監査し、追加評価を実施。

| # | Tessera要素 | 概要 | 判定 | 理由 |
|---|-----------|------|------|------|
| 16 | `/lint` コマンド | cargo clippy + eslint --fix + prettier一括実行 | **採用** | eslint --fix + prettier で品質維持 |
| 17 | `/test` コマンド | cargo test + vitest 一括実行 | **採用** | build + vitest + 失敗分析の一括実行 |
| 18 | `.zed/settings.json` | format_on_save, prettier, inline_blame等 | **採用** | TypeScript部分はそのまま適用可能 |
| 19 | code-reviewerエージェント | `.claude/agents/` にサブエージェント定義 | **見送り→規模拡大時** | PRレビュー自動化が必要になった時に導入 |
| 20 | カスタムスキル (block-lock等) | `.claude/skills/` にドメイン知識 | **見送り→規模拡大時** | Tessera固有。mcp-dig用にはドメイン知識蓄積後 |
| 21 | UI行動検証ルール | 状態遷移の事前列挙義務化 | **見送り（恒久）** | UIがないため該当しない |
| 22 | CSSルール | overflow:hidden等の隠蔽禁止 | **見送り（恒久）** | CSSがないため該当しない |
| 23 | frontend/react.md ルール | named export, hooks only, Zustand等 | **見送り（恒久）** | Reactを使わないため該当しない |
| 24 | backend/rust.md ルール | thiserror, unwrap禁止, ?演算子 | **見送り（恒久）** | Rustを使わないため該当しない |
| 25 | CRDT関連テストルール | Yjsリアルインスタンス必須等 | **見送り（恒久）** | Yjs/TipTapを使わないため該当しない |
| 26 | GitHub Issueテンプレート | bug.yml / feature.yml（日本語） | **見送り→npm公開時** | リポジトリ公開時に導入 |
| 27 | リリースボディテンプレート | `.github/release-body.md` | **見送り→npm公開時** | 初回リリース時に導入 |
| 28 | sequential-thinking MCP | `.mcp.json` で思考補助サーバー | **見送り（恒久）** | 当プロジェクトの複雑度では不要 |
| 29 | 検証マイクロコミット | セクション単位で即コミット | **見送り→v1.0時** | 検証チェックリスト導入時に併せて導入 |
| 30 | `/phase` コマンド (deprecated) | フェーズ切替 | **見送り（恒久）** | Tessera自身でも廃止済み |
| 31 | CI/CDパイプライン | `.github/workflows/ci.yml` | **見送り→npm公開時** | lint→typecheck→test→build |
| 32 | main保護ルール | GitHub Branch Protection Rules | **見送り→npm公開時** | CI必須、PR必須 |

## 見送り → 導入タイミング

以下はプロジェクトの成長に応じて段階的に取り込む。

### 採用済み（v0.6.0で導入）

以下は当初見送りだったが、導入条件を満たしたため v0.6.0 で採用。

| プラクティス | 導入先 | 当初の判定 |
|------------|-------|----------|
| release-please自動リリース | `.github/workflows/release-please.yml` | npm公開時 → v0.2.0で導入済み |
| CI/CDパイプライン | `.github/workflows/ci.yml` | npm公開時 → v0.2.0で導入済み |
| main保護ルール | GitHub Branch Protection Rules | npm公開時 → v0.2.0で導入済み |
| GitHub Issueテンプレート | `.github/ISSUE_TEMPLATE/bug.yml` + `feature.yml` | npm公開時 → v0.6.0で導入 |
| リリースボディテンプレート | `.github/release-body.md` | 初回リリース時 → v0.6.0で導入 |
| ADR | `docs/adr/` | 規模拡大時（ツール8以上）→ v0.6.0で導入（13ツール） |
| Exploreサブエージェント | CLAUDE.md | ソースファイル20以上 → v0.6.0で導入（17ファイル） |
| 検証チェックリスト | `reference/validations/` + `.claude/rules/validation.md` | v1.0時 → v0.6.0で導入 |
| 検証マイクロコミット | `.claude/rules/validation.md` | チェックリスト導入時 → v0.6.0で導入 |

### 今後の導入候補

| プラクティス | Tessera実装 | 導入条件 | アクション |
|------------|------------|---------|----------|
| **code-reviewerエージェント** | `.claude/agents/code-reviewer.md` | PRレビューの自動化が必要になった時 | MCP固有のレビュー観点（stdio安全性、execFile使用、パストラバーサル、タイムアウト）で定義 |
| **カスタムスキル** | `.claude/skills/` | ドメイン知識が蓄積された時 | git考古学パターン（blame解析、co-change分析等）をスキル化 |

### 評価の結果見送ったもの

| プラクティス | 理由 |
|------------|------|
| **E2Eテスト (WebdriverIO)** | MCPサーバーはstdio統合テストで十分。GUIがないためE2Eフレームワークは不適合 |
| **CRDT関連テストルール** | Yjs/TipTapを使わないため該当しない |
| **CSSルール** | UIコンポーネントがないため該当しない |
| **UI行動検証ルール** | UIがないため該当しない |
| **frontend/react.md ルール** | Reactを使わないため該当しない |
| **backend/rust.md ルール** | Rustを使わないため該当しない |
| **カスタムスキル（Tessera固有）** | block-lock, yjs-crdt, tiptap-extensions はTessera固有ドメイン |
| **sequential-thinking MCP** | 当プロジェクトの複雑度では不要。必要時に .mcp.json に追加 |

## 第3回評価（Insights分析 2026-03-13）

Claude Code Insightsレポート（178セッション分析）に基づく推奨プラクティスの適合性評価。

### 採用（AGENTS.md・CLAUDE.mdに組み込み済み）

| # | 推奨 | 出典 | 対処する摩擦 |
|---|------|------|-------------|
| 33 | 計画で止まらない（ステータス確認後は即実装） | Usage Pattern | 5+セッションが計画のみで終了（Excessive Planning摩擦） |
| 34 | 状態を推測しない（実際に確認してから判断） | CLAUDE.md Addition | NPM_TOKEN誤検知、release-please履歴の不正確な報告 |
| 35 | コミット前にtypecheck+lint実行 | CLAUDE.md Addition | 19件のBuggy Code摩擦（unused import、型エラー等） |
| 36 | 複雑な変更はスパイクテストで検証 | Usage Pattern | 8件のWrong Approach摩擦（PDF解析、循環依存等） |
| 37 | サブエージェントのスコープ制限 | Usage Pattern | Agent Timeout摩擦（2エージェント同時タイムアウト） |

### 既に導入済み（重複のため新規アクション不要）

| 推奨 | 既存の対応 |
|------|-----------|
| Hooks（pre-commit lint+typecheck） | PostToolUse/PreToolUse/Stopフック設定済み (#4,#8,#9,#10) |
| Custom Skills（handoff, status） | `/handoff`, `/progress`, `/lint`, `/test` コマンド設定済み (#11,#12,#14,#15) |
| セッション終了時handoff作成 | `/handoff`コマンド + AGENTS.mdセッション管理 (#11) |
| テスト・リント完了前実行 | Stopフック + 品質ゲート (#7,#10) |

### 見送り

| 推奨 | 理由 |
|------|------|
| Headless Mode（CI内Claude実行） | release-pleaseで自動化済み。CI内Claude実行は過剰 |
| 自律リリースパイプライン | release-please + auto-mergeで十分自動化済み |
| 並列TDDエージェント | 現行TDD規律で品質維持できている。worktree制約もある |
| 自己修復CI | 現行フック体制で摩擦は十分軽減。過剰な仕組み |

## 第4回評価（TLA+記事分析 2026-03-16）

TLA+のモデル検査・状態空間爆発の解説記事から、形式検証の知見をmcp-server-digに転用できるか評価。

### 記事の要点

- TLA+はシステムを状態機械として記述し、TLCモデルチェッカーが全状態を網羅探索する
- 変数・プロセス数の増加で状態空間が指数爆発する（根本的課題）
- 3つの対策: (a) 状態空間縮小（小さなモデル・対称性）、(b) サンプリング（ランダム実行）、(c) SATソルバー（Apalache記号的検査）

### 採用候補

| # | プラクティス | 記事の対応概念 | 判定 | 理由 |
|---|------------|--------------|------|------|
| 38 | 不変条件の明示的テスト | TLCの不変条件チェック | **採用候補（v0.37.0）** | truncation上限・execFile引数安全性・レスポンス非空等をプロパティとして体系的にテスト。安全性保証の明示化 |
| 39 | プロパティベーステスト（fast-check） | TLCシミュレーションモード（サンプリング） | **採用候補（v0.37.0）** | パーサー20+本が純粋関数。ランダム入力でクラッシュ耐性を検証。開発初期の高速フィードバックに最適（記事の推奨と一致） |
| 42 | キャッシュ層プロパティテスト | 有界モデル検査 | **採用候補（v0.37.0）** | AnalysisCache（TTL 60秒、LRU 100エントリ）は状態を持つ唯一のコンポーネント。fast-checkでTTL・LRU不変条件を検証 |

### 採用済み（既に実践している概念）

| # | プラクティス | 記事の対応概念 | 根拠 |
|---|------------|--------------|------|
| 40 | 小さなモデルで検証 | Small Model Property | global-setup.tsのテストリポジトリ（著者2-6名、コミット10-30件）が既に最小構成で検証 |
| 45 | テストの状態空間意識的縮小 | 変数ドメイン最小化 | 統合テストの入力パラメータ（max_commits, top_n等）を小さく保つ方針が定着 |

### 見送り

| # | プラクティス | 記事の対応概念 | 理由 |
|---|------------|--------------|------|
| 41 | MCPプロトコル状態機械のTLA+仕様 | TLA+による状態機械記述 | MCP SDKが状態管理を担当。自前の状態機械がないため形式検証の対象がない |
| 43 | キャッシュのTLA+形式検証 | TLCモデルチェック | Map + TTLのシンプル設計。TLA+の学習コストに見合わない |
| 44 | Apalache/SMTソルバー | 記号的モデル検査 | 分散システムではない。並行性はPromise.allのみで状態空間が小さい |

## Tessera参照元

検討の元になったTesseraの設定ファイル一覧（将来の導入時にコピー元として参照）:

| カテゴリ | 設定 | パス |
|---------|------|------|
| **フック・権限** | Claude Codeフック | `~/projects/tessera/.claude/settings.json` |
| | ローカル権限拡張 | `~/projects/tessera/.claude/settings.local.json` |
| **ルール** | 全般ルール | `~/projects/tessera/.claude/rules/general.md` |
| | 実装規律 | `~/projects/tessera/.claude/rules/implementation.md` |
| | テストルール | `~/projects/tessera/.claude/rules/testing.md` |
| | Gitワークフロー | `~/projects/tessera/.claude/rules/git-workflow.md` |
| | 検証チェックリスト規律 | `~/projects/tessera/.claude/rules/validation.md` |
| | CSSルール | `~/projects/tessera/.claude/rules/css.md` |
| | UI行動ルール | `~/projects/tessera/.claude/rules/ui-behavior.md` |
| | React規約 | `~/projects/tessera/.claude/rules/frontend/react.md` |
| | Rust規約 | `~/projects/tessera/.claude/rules/backend/rust.md` |
| **コマンド** | /handoff | `~/projects/tessera/.claude/commands/handoff.md` |
| | /progress | `~/projects/tessera/.claude/commands/progress.md` |
| | /lint | `~/projects/tessera/.claude/commands/lint.md` |
| | /test | `~/projects/tessera/.claude/commands/test.md` |
| | /phase (deprecated) | `~/projects/tessera/.claude/commands/phase.md` |
| **エージェント・スキル** | code-reviewer | `~/projects/tessera/.claude/agents/code-reviewer.md` |
| | block-lock スキル | `~/projects/tessera/.claude/skills/block-lock.md` |
| | yjs-crdt スキル | `~/projects/tessera/.claude/skills/yjs-crdt.md` |
| | tiptap スキル | `~/projects/tessera/.claude/skills/tiptap-extensions.md` |
| **セッション管理** | HANDOFF.md（実例） | `~/projects/tessera/reference/HANDOFF.md` |
| | ROADMAP.md（実例） | `~/projects/tessera/reference/ROADMAP.md` |
| | 検証チェックリスト（実例） | `~/projects/tessera/reference/validations/v1.1.0-validation.md` |
| | 検証テンプレート | `~/projects/tessera/reference/templates/release-validation.md` |
| **CI/CD** | CI | `~/projects/tessera/.github/workflows/ci.yml` |
| | release-please | `~/projects/tessera/.github/workflows/release-please.yml` |
| | リリースビルド | `~/projects/tessera/.github/workflows/release.yml` |
| | リリースボディ | `~/projects/tessera/.github/release-body.md` |
| | Issueテンプレート(bug) | `~/projects/tessera/.github/ISSUE_TEMPLATE/bug.yml` |
| | Issueテンプレート(feature) | `~/projects/tessera/.github/ISSUE_TEMPLATE/feature.yml` |
| | release-please設定 | `~/projects/tessera/release-please-config.json` |
| **プロジェクト文書** | AGENTS.md | `~/projects/tessera/AGENTS.md` |
| | CLAUDE.md | `~/projects/tessera/CLAUDE.md` |
| | 設計 | `~/projects/tessera/docs/design.md` |
| | 要件定義 | `~/projects/tessera/docs/requirements.md` |
| | ADR | `~/projects/tessera/docs/adr/` |
| **エディタ** | Zed設定 | `~/projects/tessera/.zed/settings.json` |
| | VS Code推奨拡張 | `~/projects/tessera/.vscode/extensions.json` |

## 第5回評価（エコシステム総合リサーチ 2026-03-17）

6領域の並列リサーチに基づく推奨プラクティスの網羅的評価。プロダクトの哲学・提供価値・現状を前提に、各プラクティスの適合性を判定。

### プロダクトの哲学と提供価値（評価の前提）

**哲学**: Git履歴をAIがクエリ可能なコンテキストとして公開する。AIに解釈させるのではなく、データを正確に構造化して提供する。

**提供価値**:
- LLMが単独ではアクセスできないGit履歴データへのMCPブリッジ
- 54の読み取り専用ツールによる多角的分析（データ取得→組み合わせ分析→ワークフロー統合の3層）
- execFile + 配列引数によるシェルインジェクション防止、パス検証、出力truncationの安全設計
- LLMフレンドリーな構造化テキスト出力（生JSONではなく整形済み文字列、オプションでJSON出力）

**現状**: v0.41.0、54ツール、18 Prompts、2 Resources、1107テスト、ブランチカバレッジ86%、npm + MCP Registry公開済み

### リサーチソース

| 領域 | 主要情報源 |
|------|-----------|
| MCPプロトコル・SDK | MCP Spec 2025-06/2025-11、2026 Roadmap、TypeScript SDK v2 docs |
| Git分析ツール競合 | CodeScene、code-maat、GitClear、Hercules、git-of-theseus、GitEvo (MSR 2026)、EIS |
| TypeScript・テスト品質 | TypeScript 5.9/6/7、Vitest 4、fast-check、Stryker、eslint-plugin-sonarjs |
| DevEx・生産性指標 | DORA 2025 (5指標化)、DX Core 4、SPACE、GitClear AI品質研究 |
| 配布・採用 | MCP Registry、Smithery、awesome-mcp-servers (83.3k stars)、Glama |
| セキュリティ | OWASP MCP Top 10、CVE-2025-68144 (mcp-server-git)、CVE-2025-48384 (git) |

---

### A. MCPプロトコル・SDK

| # | プラクティス | 概要 | 判定 | 理由 |
|---|------------|------|------|------|
| 46 | outputSchema（構造化出力宣言） | June 2025 Spec: ツールがJSON Schema出力を宣言 → `structuredContent`返却 | **採用候補（v0.43.0）** | 既にJSON出力モードを全ツールに実装済み。outputSchemaを宣言すれば、プログラマティック消費者がスキーマ検証できる。specは`structuredContent`と`content`テキストの併用を許可するため、既存のLLMフレンドリー出力と両立可能 |
| 47 | Tasks primitive（非同期タスク） | Nov 2025 Spec: 長時間操作のcall-now/fetch-later | **見送り** | Git操作は30秒タイムアウトで十分高速。大規模リポジトリでの需要が確認されてから検討 |
| 48 | SDK v2移行 | パッケージ分割: `@modelcontextprotocol/server` に変更 | **監視** | Q1 2026安定予定。移行はimportパス変更が主。v1.xは6ヶ月間セキュリティパッチ継続。安定後に実施 |
| 49 | Elicitation（ユーザー問い合わせ） | サーバーがセッション中にユーザーに質問を送信 | **見送り（恒久）** | 読み取り専用ツールにユーザー入力の必要性がない。Promptsが既にワークフローガイダンスを提供 |
| 50 | MCP Apps（インタラクティブUI） | ツールがダッシュボード・フォーム・可視化を返却 | **見送り** | Git分析の可視化（ヒートマップ、グラフ）は魅力的だが、スコープ拡大が大きい。データ提供に専念する哲学と矛盾 |

---

### B. Git分析技術・新メトリクス

#### 競合分析サマリー

| ツール/プラットフォーム | mcp-server-digにない主要機能 |
|----------------------|---------------------------|
| **CodeScene** | CodeHealth複合スコア、Branch Delivery Risk予測、Conway's Law alignment |
| **GitClear** | Diff Delta分類（Add/Update/Delete/Move/Copy-Paste）、2週間チャーン率、AI生成コード検出 |
| **Hercules** | コード生存曲線（行のage cohort別生存率）、超高速インクリメンタルblame |
| **git-of-theseus** | コード生存のスタックエリアチャート |
| **code-maat** | Sum of Coupling、Temporal Periodグルーピング |
| **GitEvo (MSR 2026)** | Tree-sitterベースのAST構造レベル進化追跡 |
| **git2net** | 文字レベルの共同編集ネットワーク |
| **EIS** | Code Entropy、Survival Score、Breadth Score |

**mcp-server-digの差別化ポイント**: MCPサーバーとしてGit履歴分析をこの深さで提供するものは他にない。公式git MCPサーバーは基本的なread/search/manipulateのみ。Greptileはセマンティックコードグラフに特化。mcp-server-digの54ツール・18 Promptsの組み合わせ分析は唯一無二。

#### 新ツール・メトリクス評価

| # | プラクティス | 概要 | 判定 | 理由 |
|---|------------|------|------|------|
| 51 | コード生存率分析 | 特定期間に書かれたコードが現在何%残っているか（Hercules/git-of-theseusの概念） | **採用候補（v0.43.0）** | コード考古学の中核概念。git blame + 日付分析で実装可能。既存の`git_code_age`を拡張する形で「cohort別生存率」を提供。git CLI操作のみで完結 |
| 52 | Rework Rate（短期チャーン） | DORA第5指標: コードが追加後2週間以内に書き直される率 | **採用候補（v0.43.0）** | DORA 2025で公式指標化。git log + diff解析で実装可能。既存の`git_revert_analysis`と`git_code_churn`の発展形 |
| 53 | Bus Factor Risk Matrix | 変更頻度×コントリビューター数の2軸分類（Danger Zone検出） | **採用候補（v0.43.0）** | 既存の`git_hotspots` + `git_knowledge_map`データを組み合わせるだけで実現。新しいデータ取得不要の純粋な組み合わせ分析 |
| 54 | Sum of Coupling強化 | ファイルが他の全ファイルと共変更される回数の総和 | **採用候補（v0.43.0）** | `git_related_changes`の自然な拡張。code-maat/CodeSceneの標準メトリクス。実装コスト低 |
| 55 | DORA指標抽出Prompt | Lead time、Deployment frequency、Rework Rateをタグ+コミットから導出 | **採用候補（v0.43.0）** | 既存の`git_tag_analysis` + `git_commit_frequency` + 新Rework Rateツールを連鎖するPrompt。新ツール不要 |
| 56 | Diff Delta分類 | 変更行をAdd/Update/Delete/Move/Copy-Pasteに分類 | **見送り** | GitClearの独自アルゴリズム。正確な実装は非常に複雑。rename検出（`-M`）は既に`git_blame_context`でサポート |
| 57 | Conway's Law alignment | チーム構造とコードアーキテクチャの一致度 | **見送り** | チーム/組織情報がgit履歴だけでは不十分。メールドメインで推測可能だが精度が低い |
| 58 | AST構造レベル進化追跡 | Tree-sitterで関数/クラス単位の変遷を追跡（GitEvo） | **見送り（恒久）** | Tree-sitter依存の追加は「git CLIのみ」の設計原則に反する。スコープ外（git以外のVCS対応と同類の拡大） |
| 59 | 文字レベル共同編集ネットワーク | git2netの手法: 誰が誰のコードを編集したか | **見送り（恒久）** | CPU集約的。MCPツールの応答時間制約に収まらない。学術研究向け |
| 60 | Code Entropy | システムの無秩序度の増加率 | **見送り** | 定義が曖昧。既存のchurn/hotspots分析がより具体的に同じ問題をカバー |
| 61 | AI生成コード検出 | コミットパターンからAI生成コードを識別 | **見送り** | 推測的。正確な検出は困難。ツールの哲学（データ提供、解釈はLLMに委任）に反する |

---

### C. セキュリティ硬化

**背景**: CVE-2025-68144でAnthropicの公式mcp-server-git（Python）に引数インジェクション脆弱性が発見された。mcp-server-digは`execFile` + 配列引数 + パス検証で既に業界平均を上回るが、追加の硬化が推奨される。

| # | プラクティス | 概要 | 判定 | 理由 |
|---|------------|------|------|------|
| 62 | 引数インジェクション防止 | `-`で始まるref/ブランチ引数を明示的に拒否 | **採用（v0.42.0）** | execFileはシェルインジェクションを防ぐが引数インジェクションは防がない。CVE-2025-68144の直接的な教訓。`--`セパレータは既に使用しているが、入力検証レイヤーでの明示的拒否が追加防御 |
| 63 | シンボリックリンクバイパス防止 | `validateFilePath()`に`fs.realpath()`チェック追加 | **採用（v0.42.0）** | `path.resolve()` + `startsWith()`はシンボリックリンクを追跡しない。悪意のあるリポジトリがsymlinkで`/etc/`等を指せる。低コストの深層防御 |
| 64 | Git環境変数サニタイズ | execFileの`env`オプションで`GIT_DIR`、`GIT_CONFIG*`等をunset | **採用（v0.42.0）** | 親プロセスが設定した環境変数でgit操作がリダイレクトされるリスク。低コストの深層防御 |
| 65 | 制御文字ストリッピング | git出力から`\x00`-`\x1f`（`\n`/`\t`除く）を除去 | **採用（v0.42.0）** | コミットメッセージやファイル名に埋め込まれたANSIエスケープシーケンス/プロンプトインジェクション対策 |
| 66 | 並行操作制限 | 同時実行git プロセス数の追跡・制限 | **見送り** | 現時点で問題報告なし。stdioトランスポートでは実質的に逐次実行。HTTPモード普及時に再検討 |
| 67 | SBOM生成 | CycloneDXをCIパイプラインに追加 | **見送り** | EU CRA規制の動向次第。現時点では開発ツールに過剰。npm provenanceは既に実装済み |
| 68 | Dockerfile提供 | サンドボックス実行用のDocker設定 | **見送り→配布改善時** | Node >= 22要件の緩和とセキュリティ分離に有効。ただしgitリポジトリのvolume mount複雑性がある。配布戦略見直し時に検討 |

---

### D. テスト・コード品質

| # | プラクティス | 概要 | 判定 | 理由 |
|---|------------|------|------|------|
| 69 | Strykerインクリメンタル変異テスト | 変更されたコードのみ変異テスト実行 | **採用候補（v0.42.0）** | 1107テストの検出力を検証。インクリメンタルモードでCIのPR単位実行が実用的（Sentryの実績: 3731結果再利用、234変異のみ実行）。対象: parsers + analysis層 |
| 70 | Vitest `expect.schemaMatching()` | Zodスキーマをテストアサーションで再利用 | **採用候補（v0.42.0）** | Vitest 4の新機能。既存のZod入力スキーマをアサーションに転用可能。クイックウィン |
| 71 | eslint-plugin-sonarjs認知的複雑度 | Cognitive Complexityメトリクスをlintルールに追加 | **採用候補（v0.42.0）** | Cyclomatic Complexityより人間の可読性を正確に測定。`"warn"`から開始して既存違反を把握後に`"error"`に昇格 |
| 72 | fast-checkモデルベーステスト | 状態を持つコマンドシーケンスの検証 | **見送り** | ツールは基本的にステートレスクエリ。キャッシュ層は既にプロパティテスト済み。追加のROI低 |
| 73 | TypeScript 6/7準備 | Go製コンパイラ（8-10倍高速化） | **監視** | TS6がブリッジリリースとして安定後に検討。現時点でアクション不要 |
| 74 | スナップショットテスト | 複雑な構造化テキスト出力の検証 | **見送り（恒久）** | 明示的アサーションの方がテストの意図が明確。「approve and forget」リスクがある |

---

### E. 配布・採用

| # | プラクティス | 概要 | 判定 | 理由 |
|---|------------|------|------|------|
| 75 | server.jsonバージョン同期 + Registry自動公開 | release-pleaseワークフローでserver.json更新 + `mcp-publisher` CI | **採用（v0.42.0）** | 現在server.jsonは`0.4.1`のままnpmは`0.40.0`。メタデータの陳腐化は発見可能性を損なう。GitHub OIDC認証で自動化可能 |
| 76 | Smithery登録 | MCP マーケットプレイスに登録 | **採用候補（v0.42.0）** | 使用分析 + Cursorワンクリックインストール。サーバー作者に唯一使用状況の可視性を提供するプラットフォーム |
| 77 | awesome-mcp-servers登録 | 83.3k stars のキュレーションリストにPR | **採用候補（v0.42.0）** | 無料の可視性。Developer ToolsまたはCode Analysisカテゴリに該当 |
| 78 | README「Why」セクション + バッジ | 問題定義を機能リストの前に配置、npm/CI/license バッジ追加 | **採用候補（v0.42.0）** | 成功しているMCPサーバー（Context7: 49.3k stars）の共通パターン。「Without dig」vs「With dig」の対比で価値を明確化 |
| 79 | VS Code MCP設定スニペット | READMEにVS Code用`.vscode/mcp.json`設定例追加 | **採用候補（v0.42.0）** | Claude Desktop、Zed、Cursor、Windsurfは既にカバー。VS Code MCP対応が進んでおり需要増 |
| 80 | Docker配布 | Dockerfile + MCP RegistryにOCIパッケージ登録 | **見送り→需要確認後** | Node >= 22要件の緩和には有効だが、volume mount（gitリポジトリアクセス）の複雑性が高い。stdio利用がメインの間はnpmで十分 |

---

### F. DevEx・生産性指標

**DORA 2025の重要変更**:
- 4指標 → **5指標**: Deployment Rework Rate（計画外デプロイの比率）追加
- パフォーマンスティア（low/medium/high/elite）**廃止** → 7チームアーキタイプに置換
- AIパラドックス: 個人レベルで21%タスク増・98%PRマージ増、しかし組織レベルのデリバリー指標は横ばい

**DX Core 4の登場**: DORA・SPACE・DevExの統合フレームワーク（Speed/Effectiveness/Quality/Impact）。Nicole Forsgren、Margaret-Anne Storey、Thomas Zimmermanが共同設計。

**Microsoft Code Researcher**: コミット履歴の因果分析を組み込んだ初の深層研究エージェント。コミット履歴分析を除去するとクラッシュ解決率が~10%低下（48% → ~38%）。Git履歴コンテキストの価値を学術的に実証。

| # | プラクティス | 概要 | 判定 | 理由 |
|---|------------|------|------|------|
| 81 | DORA 5指標対応Prompt | 既存ツール連鎖でDORA 5指標を導出するPrompt | **採用候補（v0.43.0）** | tag_analysis（Deployment Frequency）+ commit_frequency（Lead Time近似）+ revert_analysis（Change Failure Rate近似）+ 新Rework Rateツール。全て既存+1新ツールで対応可能 |
| 82 | DX Core 4 Speed指標 | Diffs per engineer、Lead time | **見送り** | 「Diffs per engineer」はPR単位のカウントが必要で、gitだけでは正確に取得困難。GitHubのPR APIが必要 |

---

### 採用判定サマリー

#### v0.42.0 — セキュリティ硬化 + 品質基盤 + 配布改善

| # | カテゴリ | プラクティス | 優先度 |
|---|---------|------------|--------|
| 62 | セキュリティ | 引数インジェクション防止（`-`始まりref拒否） | HIGH |
| 63 | セキュリティ | シンボリックリンクバイパス防止（`fs.realpath()`） | HIGH |
| 64 | セキュリティ | Git環境変数サニタイズ | HIGH |
| 65 | セキュリティ | 制御文字ストリッピング | MEDIUM |
| 69 | テスト | Strykerインクリメンタル変異テスト（parsers/analysis対象） | MEDIUM |
| 70 | テスト | Vitest `expect.schemaMatching()` 活用 | LOW |
| 71 | 品質 | eslint-plugin-sonarjs 認知的複雑度 | MEDIUM |
| 75 | 配布 | server.jsonバージョン同期 + Registry自動公開 | HIGH |
| 76 | 配布 | Smithery登録 | MEDIUM |
| 77 | 配布 | awesome-mcp-servers登録 | MEDIUM |
| 78 | 配布 | README「Why」セクション + バッジ | LOW |
| 79 | 配布 | VS Code MCP設定スニペット | LOW |

#### v0.43.0 — 新分析ツール + MCPプロトコル対応

| # | カテゴリ | プラクティス | 優先度 |
|---|---------|------------|--------|
| 51 | 分析 | `git_code_survival` — コード生存率分析 | HIGH |
| 52 | 分析 | `git_rework_rate` — 短期チャーン（DORA Rework Rate） | HIGH |
| 53 | 分析 | Bus Factor Risk Matrix（組み合わせ分析） | MEDIUM |
| 54 | 分析 | Sum of Coupling強化（`git_related_changes`拡張） | LOW |
| 55 | Prompt | `extract-dora-metrics` — DORA 5指標抽出ワークフロー | MEDIUM |
| 46 | MCP | outputSchema宣言（JSON出力対応ツール） | MEDIUM |

#### 監視中

| # | プラクティス | 条件 |
|---|------------|------|
| 48 | SDK v2移行 | v2安定リリース後 |
| 73 | TypeScript 6/7 | TS6ブリッジリリース安定後 |
| 68 | Dockerfile提供 | Docker配布の需要確認後 |

#### 見送り（恒久）

| # | プラクティス | 理由 |
|---|------------|------|
| 49 | Elicitation | 読み取り専用ツールにユーザー入力不要 |
| 58 | AST構造レベル追跡 | Tree-sitter依存は「git CLIのみ」原則に反する |
| 59 | 文字レベル共同編集 | CPU集約的、MCPの応答時間制約に収まらない |
| 74 | スナップショットテスト | 明示的アサーションの方が意図明確 |
