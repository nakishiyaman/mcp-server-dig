---
description: リント・フォーマット一括実行
allowed-tools: Bash(npx *)
---

以下を順番に実行し、自動修正できない問題があれば報告する。

1. `npx prettier --write "src/**/*.ts"`
2. `npx eslint src/ --fix`
3. 自動修正できなかった問題を一覧で報告
