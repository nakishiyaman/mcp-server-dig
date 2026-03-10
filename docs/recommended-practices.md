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
| 11 | ADR | `docs/adr/` で設計判断を記録 | **見送り** | v0.1の小規模プロジェクトには過剰 |
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

### npm公開時に導入

| プラクティス | Tessera実装 | 導入条件 | アクション |
|------------|------------|---------|----------|
| **release-please自動リリース** | `.github/workflows/release-please.yml` + `release-please-config.json` | npm公開を決定した時点 | GitHub Actionsワークフロー追加、`release-please-config.json` 作成、`scripts/set-version.mjs` で package.json のバージョン同期 |
| **CI/CDパイプライン** | `.github/workflows/ci.yml` (lint→typecheck→test→build) | GitHubリポジトリ公開時 | ci.yml作成: `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build` |
| **main保護ルール** | GitHub Branch Protection Rules | GitHubリポジトリ公開時 | Settings → Branches → main に保護ルール設定、CI必須、PR必須 |
| **GitHub Issueテンプレート** | `.github/ISSUE_TEMPLATE/bug.yml` + `feature.yml` | GitHubリポジトリ公開時 | Tessera版をベースに、MCP固有のフィールド（ツール名、再現git操作等）にカスタマイズ |
| **リリースボディテンプレート** | `.github/release-body.md` | 初回リリース時 | インストール手順（npx, claude mcp add, Zed設定）を記載 |

### プロジェクト規模拡大時に導入

| プラクティス | Tessera実装 | 導入条件 | アクション |
|------------|------------|---------|----------|
| **ADR (Architecture Decision Records)** | `docs/adr/` ディレクトリ | ツール数が8以上、またはアーキテクチャ判断で迷いが生じた時 | `docs/adr/` 作成、テンプレート（Status/Context/Decision/Consequences）を用意 |
| **Exploreサブエージェント活用** | CLAUDE.mdに記載 | ソースファイルが20以上になった時 | AGENTS.mdの「Claude Code使用時の規律」に追記 |
| **code-reviewerエージェント** | `.claude/agents/code-reviewer.md` | PRレビューの自動化が必要になった時 | MCP固有のレビュー観点（stdio安全性、execFile使用、パストラバーサル、タイムアウト）で定義 |
| **カスタムスキル** | `.claude/skills/` | ドメイン知識が蓄積された時 | git考古学パターン（blame解析、co-change分析等）をスキル化 |

### v1.0リリース時に導入

| プラクティス | Tessera実装 | 導入条件 | アクション |
|------------|------------|---------|----------|
| **検証チェックリスト (Write-Through)** | `reference/validations/` + `.claude/rules/validation.md` | リリース候補のQA時 | `reference/validations/` にチェックリスト作成、ツールごとの検証項目（正常系/異常系/エッジケース） |
| **検証マイクロコミット** | `.claude/rules/validation.md` | 検証チェックリスト導入時 | セクション単位の確認完了で即コミット（`docs: 検証 git_blame_context PASS`） |

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
