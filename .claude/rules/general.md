# 全般ルール

## コミットメッセージ

- コミットメッセージは日本語で書く
- Conventional Commits形式: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `ci:`
- 例: `feat: git_pickaxeツール実装`, `fix: porcelainパーサーの行番号ずれ修正`

## Gitワークフロー

- mainへの直接コミット禁止（PR経由のみ）
- セッション終了時に未コミット変更を残さない
- 詳細は `git-workflow.md` を参照

## コード品質

- `console.log` 禁止（stdioプロトコルを破壊する）。診断出力は `console.error` のみ
- フルテストスイートよりも単体テスト実行を優先する
- 出力テキストはLLMが理解しやすい構造化テキスト（生JSONではなく整形済み文字列）

## 隠蔽禁止

以下のパターンは問題の隠蔽であり、使用前に正当性を確認すること。詳細は `implementation.md` を参照。

| 言語/領域 | パターン | 隠蔽の意味 |
|----------|---------|-----------|
| TS/JS | `@ts-ignore` / `@ts-expect-error` | 型エラーを黙らせる |
| TS/JS | `eslint-disable` | lint警告を黙らせる |
| TS/JS | `as any` | 型システムを無効化する |
| TS/JS | 空のcatchブロック | エラーを握り潰す |
| TS/JS | `console.log` | stdioプロトコルを汚染する（かつデバッグコードの残存） |
| git | `exec()` でgitコマンド実行 | シェルインジェクションの脆弱性 |
| CI/CD | `--admin` でブランチ保護バイパス | 品質ゲートの無効化 |
| CI/CD | `--no-verify` でフック回避 | コミット前検証の無効化 |
| 設定 | tsconfig.json等を変更してlint違反を回避 | ルールの骨抜き |
| テスト | アサーションの緩和（`toEqual` → `toBeDefined`） | テストの検出力を下げる |
