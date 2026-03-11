# Architecture Decision Records (ADR)

設計判断の記録。各ADRは不変（Immutable）。古い判断はSupersededで新しいADRに置き換える。

## ステータス

- **Accepted**: 現在有効な判断
- **Superseded**: 新しいADRで置き換え済み（旧ADRはそのまま残す）
- **Deprecated**: 非推奨（理由を記載）

## テンプレート

```markdown
# ADR-NNNN: タイトル

- Status: Accepted
- Date: YYYY-MM-DD

## Context
なぜこの判断が必要になったか。

## Decision
何を決めたか。

## Consequences
この判断によるトレードオフ。
```

## 一覧

| ADR | タイトル | ステータス |
|-----|---------|-----------|
| [0001](0001-release-please-pat.md) | release-pleaseのFine-Grained PAT導入 | Accepted |
| [0002](0002-execfile-over-exec.md) | exec()ではなくexecFile()でgit実行 | Accepted |
| [0003](0003-stdio-only-transport.md) | stdioトランスポート専用 | Accepted |
