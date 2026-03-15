# mcp-server-dig

## WHAT — このプロジェクトについて

AIパワード・コード考古学用MCPサーバー。Git履歴をAIがクエリ可能なコンテキストとして公開する。

### アーキテクチャ

```
┌───────────────────────────────────────────────┐
│             MCP Server (stdio)                │
│  ┌──────────────────┐  ┌─────────────────┐   │
│  │  Composite Tools  │  │  Git Executor   │   │
│  │  (6 tools)        │→ │  (execFile)     │→ git CLI
│  └────────┬─────────┘  └─────────────────┘   │
│           ↓                    ↓              │
│  ┌──────────────────┐  ┌─────────────────┐   │
│  │  Analysis Layer   │  │    Parsers      │   │
│  │  (src/analysis/)  │→ │  (出力構造化)    │   │
│  └────────┬─────────┘  └─────────────────┘   │
│           ↓                                   │
│  ┌──────────────────┐  ┌─────────────────┐   │
│  │  Data Tools       │  │  Zod Schema     │   │
│  │  (27 tools)       │  │  (入力検証)      │   │
│  └──────────────────┘  └─────────────────┘   │
└───────────────────────────────────────────────┘
```

### テックスタック

| レイヤー | 技術 |
|---------|------|
| 言語 | TypeScript (strict, ESM) |
| MCP SDK | @modelcontextprotocol/sdk |
| スキーマ | zod |
| テスト | vitest |
| ビルド | tsc → build/ |
| CI/CD | GitHub Actions + release-please + npm OIDC |

## WHY — 核心の設計判断

1. **stdio専用**: stdin/stdoutはJSON-RPCに専有。診断出力はstderrのみ
2. **execFile + 配列引数**: シェルインジェクション防止のため `exec()` は使わない
3. **パス検証必須**: `validateGitRepo()` + `validateFilePath()` で全入力を検証
4. **出力truncation**: 全ツールに50,000文字制限（LLMコンテキスト保護）

## HOW — 開発ガイド

### コマンド

```bash
npm run build            # tsc + chmod
npm run test             # vitest run
npm run test:watch       # vitest --watch
npm run lint             # eslint src/
npm run typecheck        # tsc --noEmit
```

### コード規約

言語・実装ルールは `.claude/rules/` を参照。プロジェクト共通:

- ファイル名kebab-case
- `console.log` 禁止（stdioプロトコルを破壊する）。診断出力は `console.error` のみ
- `@ts-ignore` / `eslint-disable` / `as any` / 空catch 禁止
- git引数は配列で渡す（`execFile` でシェルインジェクション防止）

### ワークフロー

- コミットメッセージは日本語、Conventional Commits形式
- ブランチ: `{type}/{description}`（feat/, fix/, refactor/, docs/, test/, chore/, ci/）
- mainへの直接コミット禁止（PR経由のみ）
- リリースパイプラインの詳細: `.claude/rules/git-workflow.md`

### 修正の原則: 原因を直せ、症状を消すな

すべての修正に適用される最上位の規律:

1. **原因を特定してから手を動かす** — 「なぜそうなっているのか」を理解するまでコードを書かない
2. **修正を書く前にシミュレーションする** — 「この変更で目的の状態になるか」を論理的に検証する
3. **隠蔽と解決を区別する** — 問題を見えなくすることは解決ではない
4. **間違いをスケールさせない** — 1箇所のパッチを他に展開する前に正しさを確認する

詳細: `.claude/rules/implementation.md`

### ゴール駆動実装: プランではなく問題を解け

プランの変更ファイルリストは仮説であり、問題文が真のゴール。

1. **実装の各ステップでゴールに立ち返る** — 「この変更で問題は解決に近づいたか」を都度確認する
2. **完了判定はゴールで行う** — 「リストのファイルを全部変更したか」ではなく「問題が解決されたか」で判定する
3. **リストが不完全と判明したら問題文に戻る** — 問題文から正しいアクションを導出して補完する

### Claude Code使用時の規律

- **「できない」と言う前に試す**: 推測で判断せず、まず実行して結果を報告する
- **Plan Modeデフォルト**: 3ステップ以上のタスクはPlan Modeから開始する
- **計画で止まらない**: ステータス確認・計画策定後は、明示的に止められない限り即座に実装に進む
- **完了前検証**: `npm run build && npm run test` が通ることを確認してから完了を宣言する
- **コミット前検証**: コミット作成前に `typecheck && lint` を実行。unused import・型エラーに注意
- **状態を推測しない**: CI secrets・トークン・設定状態を仮定せず、実際に確認してから判断する
- **複雑な変更はスパイクで検証**: 10+ファイルや未知APIを使う場合、最小PoCテストで方針を検証してから本実装
- **大規模調査はサブエージェントに委任**: Exploreサブエージェントには具体的な質問を1つ渡す（タイムアウト防止）
- **インフラ変更は慎重に**: CI/CD・リポジトリ設定の変更前に `.claude/rules/git-workflow.md` を読み、公式ドキュメントをリサーチする。場当たり的な回避策は提案しない
- **1タスク1ウィンドウ**: 大きなタスクは分割する
- **コンテキスト管理**: 会話が長くなったら `/compact` で圧縮
- **セッション間継続性**: `reference/ROADMAP.md` でファイルベース進捗管理
- **セッション開始時**: `/progress` で前回の状態を把握してから作業開始
- **セッション終了時**: `/handoff` で進捗を記録（コミット・push含む）

## 参照

- コード規約・禁止事項: `AGENTS.md`
- 実装規律: `.claude/rules/implementation.md`
- テストルール: `.claude/rules/testing.md`
- 検証チェックリスト規律: `.claude/rules/validation.md`
- Gitワークフロー・リリースパイプライン: `.claude/rules/git-workflow.md`
- ADR（設計判断記録）: `docs/adr/`
- ロードマップ: `reference/ROADMAP.md`
- セッション引き継ぎ: `reference/HANDOFF.md`
- Tessera導入評価: `docs/recommended-practices.md`
- 現在のステータス: **v0.34.0 開発中**（45ツール: データ取得34 + 組み合わせ分析9 + ワークフロー統合2, Prompts 13, Resources 2, Tool Annotations・MCP Logging・Streamable HTTP・Completions対応、server.registerTool()移行済み、TypeScript 5.9、TransportHandle導入）
