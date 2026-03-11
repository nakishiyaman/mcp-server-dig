# ADR-0004: 分析関数レベルのキャッシュ設計

- Status: Accepted
- Date: 2026-03-11

## Context

複合ツール（`git_repo_health` → `git_file_risk_profile`）を連続で呼び出すと、同じ分析関数（`analyzeHotspotsAndChurn`, `analyzeContributors`）が重複実行される。大規模リポジトリではこれがレスポンス時間のボトルネックになる。

キャッシュ層の導入が必要だが、キャッシュの粒度には選択肢がある。

## Decision

**分析関数レベル**でキャッシュする。executor（`execGit`）レベルではキャッシュしない。

### キャッシュ対象
- `analyzeHotspotsAndChurn` — 複合ツール間で共有される頻出分析
- `analyzeContributors` — 同上

### パラメータ
- TTL: 60秒（gitの状態変化に対する安全マージン）
- 最大エントリ: 100（LRU eviction）
- キー: `${functionName}:${repoPath}:${JSON.stringify(sortedOptions)}`

### 不採用: executorレベルキャッシュ
- `execGit`の結果をキャッシュする案は粒度が細かすぎる
- 同じ分析でもオプションの違いで異なるgitコマンドが実行される
- キャッシュキーの設計が複雑（args配列の正規化が必要）
- 分析関数レベルの方が「同じ質問 → 同じ答え」のセマンティクスが明確

## Consequences

- セッション内での連続ツール呼び出しが高速化される
- TTLにより、git操作後の再クエリで古い結果が返るリスクは60秒以内に限定
- `context?` パラメータによりキャッシュなしでの使用も可能（テスト互換性）
- 将来的にキャッシュ対象関数を追加する場合は `cached-analysis.ts` にラッパーを追加する
