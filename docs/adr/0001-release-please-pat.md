# ADR-0001: release-pleaseのFine-Grained PAT導入

- Status: Accepted
- Date: 2026-03-11

## Context

release-please-action@v4 がデフォルトの `GITHUB_TOKEN` でRelease PRを作成すると、GitHub Actionsの仕様によりそのPRに対してCIワークフローがトリガーされない（無限ループ防止のためのセキュリティ制約）。

ブランチ保護ルールでCI必須としているため、Release PRがマージできない状態が発生していた。

検討した選択肢:
1. **Fine-Grained PAT** — release-please公式READMEの推奨。リポジトリ限定スコープ。年1回更新
2. **GitHub App トークン** — セキュリティ最良だが、App作成・秘密鍵管理の運用コストが単独メンテナーには過剰
3. **`--admin` でバイパス** — ブランチ保護の意味がなくなる。緊急時のみ許容
4. **`pull_request_target` 別ワークフロー** — セキュリティリスクが高く非推奨

## Decision

Fine-Grained PAT (`RELEASE_PLEASE_TOKEN`) を使用する。

- スコープ: `nakishiyaman/mcp-server-dig` リポジトリのみ
- パーミッション: Contents (Read & write), Pull requests (Read & write)
- リポジトリ設定: Auto-merge有効化
- ワークフロー: release-pleaseジョブ内で `gh pr merge --auto --merge` を実行し、各Release PRに自動でauto-mergeを設定

将来マルチメンテナーになった場合は GitHub App トークン（選択肢2）に移行する。

## Consequences

- Release PRにCIが正常にトリガーされ、auto-mergeが機能する
- 年1回のPAT更新が必要（カレンダーリマインダー設定推奨）
- PATが個人アカウントに紐づく（アカウント削除でCI壊れる）
