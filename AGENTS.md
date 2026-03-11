# mcp-server-dig — AGENTS.md

AIパワード・コード考古学用MCPサーバー。Git履歴をAIがクエリ可能なコンテキストとして公開する。

## テックスタック

| レイヤー | 技術 |
|---------|------|
| 言語 | TypeScript (strict, ESM) |
| MCP SDK | @modelcontextprotocol/sdk |
| スキーマ | zod |
| テスト | vitest |
| ビルド | tsc → build/ |

## ビルド・テスト・リント

```bash
npm run build            # tsc + chmod
npm run test             # vitest run
npm run test:watch       # vitest --watch
npm run typecheck        # tsc --noEmit（※lint設定追加後）
```

Rustはない。git操作は `child_process.execFile` で実行。

## プロジェクト構造

```
src/
├── index.ts              # エントリポイント（McpServer + stdio transport）
├── git/
│   ├── types.ts          # 型定義（CommitInfo, BlameBlock等）
│   ├── executor.ts       # gitコマンド実行（execFile, バリデーション）
│   └── parsers.ts        # git出力パーサー（log, blame porcelain, shortlog）
└── tools/
    ├── git-file-history.ts        # git_file_history ツール
    ├── git-blame-context.ts       # git_blame_context ツール
    ├── git-related-changes.ts     # git_related_changes ツール
    └── git-contributor-patterns.ts # git_contributor_patterns ツール
```

## コード規約

- ファイル名: kebab-case
- `console.log` 禁止（stdioを汚染する）。診断出力は `console.error` のみ
- `@ts-ignore` / `eslint-disable` / `as any` / 空catch 禁止
- git引数は配列で渡す（`execFile` でシェルインジェクション防止）
- `repo_path` 入力は `validateGitRepo()` で検証
- `file_path` 入力は `validateFilePath()` でパストラバーサル防止

## ワークフロー

詳細は `.claude/rules/` を参照。以下は概要。

### コミット

- 日本語 Conventional Commits形式: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- 例: `feat: git_blame_contextツール実装`, `fix: porcelainパーサーの行番号ずれ修正`

### ブランチ・PR・リリース

`.claude/rules/git-workflow.md` を参照。

### 品質ゲート

完了前に必ず実行:
```bash
npm run build && npm run test
```

### テスト規律

`.claude/rules/testing.md` を参照。要点:

- TDD (Red-Green-Refactor) を厳守
- テストが失敗したとき、アサーションを緩めて通す方向に逃げない
- 本番コードにテスト都合を持ち込まない
- パーサーテスト: サンプルgit出力文字列で単体テスト
- ツールテスト: 一時gitリポジトリで統合テスト

## 修正の原則・実装規律

`.claude/rules/implementation.md` を参照。要点:

1. **原因を特定してから手を動かす**
2. **修正を書く前にシミュレーションする**
3. **隠蔽と解決を区別する**
4. **間違いをスケールさせない**
5. **インフラ変更は事前リサーチ必須**（推測で提案しない）

## Claude Code使用時の規律

- **Plan Modeデフォルト**: 3ステップ以上のタスクはPlan Modeから開始する
- **完了前検証**: `npm run build && npm run test` が通ることを確認してから完了を宣言する
- **「できない」と言う前に試す**: 推測で判断せず、まず実行して結果を報告する
- **インフラ変更は慎重に**: CI/CD・リポジトリ設定の変更前に `.claude/rules/git-workflow.md` を読み、公式ドキュメントをリサーチする
- **1タスク1ウィンドウ**: 大きなタスクは分割する
- **コンテキスト管理**: 会話が長くなったら `/compact` で圧縮
- **セッション間継続性**: `reference/ROADMAP.md` でファイルベース進捗管理
- **セッション開始時**: `/progress` で前回の状態を把握してから作業開始
- **セッション終了時**: `/handoff` で進捗を記録（コミット・push含む）

## セッション管理

| コマンド | タイミング | 動作 |
|---------|----------|------|
| `/progress` | セッション開始時 | HANDOFF.md + ROADMAP.md を読んで現状報告・次タスク提案 |
| `/handoff` | セッション終了時 | 未コミット変更のcommit+push → ROADMAP.md進捗更新 → HANDOFF.md生成 |

ファイル構成:
- `reference/HANDOFF.md` — セッション間の唯一の真実の情報源（上書き更新）
- `reference/ROADMAP.md` — バージョン別タスクリスト（`[x]`/`[ ]`で進捗管理）

## 禁止事項

`.claude/rules/general.md` の隠蔽禁止テーブルも参照。

- `console.log`（stdioプロトコルを破壊する）
- `@ts-ignore` / `eslint-disable` / `as any` / 空catch
- `exec()` でのgitコマンド実行（`execFile()` を使う）
- パストラバーサルを許すファイルパス処理
- 設定ファイル（tsconfig.json等）の変更でリント違反を回避

## 段階的導入プラクティス

Tesseraワークフローから抽出した追加プラクティスの導入計画: `docs/recommended-practices.md`
- npm公開時 → release-please, CI/CD, main保護
- 規模拡大時 → ADR, Exploreサブエージェント
- v1.0リリース時 → 検証チェックリスト, セッション引き継ぎ

## MCP固有の注意点

- ツールの出力は `{ content: [{ type: "text", text: "..." }] }` 形式
- 出力テキストはLLMが理解しやすい構造化テキスト（生JSONではない）
- stdioトランスポート: stdin/stdoutはJSON-RPCに専有される
- 全診断メッセージは `stderr` へ
