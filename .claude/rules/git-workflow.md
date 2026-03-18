# Gitワークフロー

## ブランチ戦略

### mainは保護対象

- mainへの直接コミット禁止。必ずPR経由でマージする
- ローカルのmainは常にリモートと同期しておく

### ブランチ命名

`{type}/{kebab-case-description}` 形式:

| type | 用途 |
|------|------|
| `feat/` | 新機能 |
| `fix/` | バグ修正 |
| `refactor/` | リファクタリング |
| `docs/` | ドキュメント |
| `test/` | テスト追加・修正 |
| `chore/` | 依存関係更新・設定変更等 |
| `ci/` | CI/CD変更 |

例: `feat/v0.6.0-new-tools`, `fix/release-please-token`, `ci/add-security-audit`

## セッション規律

### 開始時

1. `git status` で状態確認
2. mainブランチにいる場合 → 作業用ブランチを作成して分岐
3. 既存ブランチにいる場合 → `git pull` で最新化

### 終了時

1. 全変更をコミット（未コミット変更を残さない）
2. `git push -u origin <branch>` でリモートにpush
3. `/handoff` で引き継ぎ記録を作成

## PRフロー

1. `gh pr create` でPR作成
2. CI全パス（Node 22/24マトリクス）を確認
3. マージ
4. ローカルでmainに切り替え → `git pull`

## リリースパイプライン

### アーキテクチャ

```
mainへのpush
  → CI (ci.yml): lint → typecheck → test → build (Node 22/24)
  → Release Please (release-please.yml):
      1. release-pleaseジョブ:
         a. Release PR自動作成/更新 (token: RELEASE_PLEASE_TOKEN)
         b. PRにauto-mergeを自動有効化 (outputs.prからPR番号取得 → gh pr merge --auto --merge)
      2. publishジョブ: release_created == true の場合のみ
         - npm publish --access public (OIDC Trusted Publishing)
         - MCP Registry公開 (mcp-publisher, continue-on-error)

Release PR
  → CIがトリガーされる（PATで作成されたPRのため）
  → CI全パス → auto-mergeが発動 → 自動マージ（ワークフローが自動設定）
  → マージによりrelease-pleaseがGitHub Release + tag作成
  → publishジョブがnpmに公開
```

### 重要な制約

| 制約 | 原因 | 対策 |
|------|------|------|
| `GITHUB_TOKEN` で作成されたPRはCIをトリガーしない | GitHub仕様（無限ループ防止） | Fine-Grained PAT (`RELEASE_PLEASE_TOKEN`) を使用 |
| release-please re-runでは `release_created` が false | release-pleaseの既知動作 | `workflow_dispatch` で手動publish可能 |
| npm publish には provenance が必要 | Trusted Publishing (OIDC) | `id-token: write` パーミッション設定済み |

### ブランチ保護設定（main）

| 設定 | 値 | 理由 |
|------|-----|------|
| Require PR before merging | ON | main直push防止 |
| Required approvals | 0（無効） | 個人プロジェクトのため不要 |
| Require status checks | ON (strict) | CI必須 |
| Required checks | `ci (22)`, `ci (24)` | CIマトリクスと一致させること |
| Include administrators | ON | 管理者もCI通過必須 |
| Allow force pushes | OFF | 履歴改変防止 |

**注意**: CIマトリクスを変更した場合、必須チェックも同時に更新すること（v0.14.0でNode 18廃止時に`ci (18)`が残りマージブロックが発生した前例あり）

### Secrets・設定

| 名前 | 種類 | 用途 | 更新頻度 |
|------|------|------|---------|
| `RELEASE_PLEASE_TOKEN` | Fine-Grained PAT | release-pleaseのPR作成（CIトリガーのため） | 年1回 |
| OIDC (id-token) | 自動 | npm Trusted Publishing | 不要 |
| Auto-merge | リポジトリ設定 + ワークフロー | Release PRの自動マージ（release-please.ymlが各PRに自動設定） | 不要 |

### CI/CD変更時のルール

**CI/CDやワークフローの変更を提案する前に、必ず以下を実行する:**

1. **現行パイプラインの全体像を把握する** — このファイルと `.github/workflows/` を読む
2. **変更の影響範囲を特定する** — 他のジョブ・Secrets・リポジトリ設定への波及を確認する
3. **GitHub/npm/release-pleaseの制約をリサーチする** — 推測で提案しない。公式ドキュメントを確認する
4. **恒久的な解決策を提示する** — 場当たり的な回避策（`--admin`, 手動操作）は緊急時のみ許容
5. **変更後にこのファイルを更新する** — パイプラインの変更はここに反映する
