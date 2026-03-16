# mcp-server-dig

[English](./README.md) | 日本語

AI によるコード考古学のための MCP サーバー — git blame、ファイル履歴、コントリビューターパターン、変更関連性分析を [Model Context Protocol](https://modelcontextprotocol.io/) を通じて提供します。

## ツール一覧

### ワークフロー統合

| ツール | 説明 |
|--------|------|
| `git_review_prep` | PRレビューブリーフィング（リスクフラグ・レビュアー推薦・変更漏れ検出） |
| `git_why` | コード考古学ナラティブ — blame・コミット・コントリビューター・共変更を統合してコードの経緯を説明 |

### 組み合わせ分析

| ツール | 説明 |
|--------|------|
| `git_file_risk_profile` | 単一ファイルの多次元リスク評価 |
| `git_repo_health` | リポジトリ全体の健全性サマリー |
| `git_code_ownership_changes` | 日付境界でのコード所有権比較 — 所有者交代・バス係数変化・知識移転パターンを検出 |
| `git_impact_analysis` | ファイル/ディレクトリの変更影響範囲分析 — 共変更ネットワーク・コントリビューター重複・ディレクトリ結合度を統合 |
| `git_knowledge_loss_risk` | コントリビューター別の知識喪失リスク評価 — 単一人物がコードの大部分を所有するディレクトリ（バス係数=1）を特定し、離脱時の回復コストを推定 |
| `git_trend_analysis` | 複数期間のメトリクス比較による時系列トレンド分析 — ホットスポット数・コードチャーン・コントリビューター数・コミット活動の改善/安定/悪化を追跡 |
| `git_refactor_candidates` | リポジトリ全体から5次元リスク評価（変更頻度・コードチャーン・知識集中・結合度・鮮度）でリファクタリング候補をランキング |
| `git_release_comparison` | 2つのgit ref（タグ・ブランチ・コミット）間でリポジトリメトリクスを比較 — ホットスポット・チャーン・コントリビューター数・バス係数の変化を表示 |
| `git_complexity_hotspots` | 6次元リスク評価（変更頻度・コードチャーン・知識集中・結合度・鮮度・コンフリクト頻度）で保守困難度ホットスポットをランキング |
| `git_contributor_growth` | コントリビューター増減・定着率の時系列分析 — 新規/離脱検出・バス係数トレンド・growing/stable/shrinking判定 |
| `git_offboarding_simulation` | 特定著者の離脱シミュレーション — 著者除外後のバス係数再計算・新規SPOF検出・ディレクトリ別before/after比較 |
| `git_coordination_bottleneck` | ディレクトリ別調整コスト分析 — 変更頻度×著者数×所有分散度の複合スコアでランキング・マージリスク評価 |
| `git_expertise_decay` | 専門知識の鮮度追跡 — 主要コード所有者が非活動化・フェード中のディレクトリを検出 |

### データ取得

### git_file_history

特定ファイルのコミット履歴を差分統計付きで取得します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| max_commits | number | いいえ | 返すコミットの最大数（デフォルト: 20） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |

### git_blame_context

同一コミットによる連続行をブロックにまとめるセマンティック blame。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| start_line | number | いいえ | 行範囲の開始行 |
| end_line | number | いいえ | 行範囲の終了行 |
| detect_moves | boolean | いいえ | `git blame -M` でコード移動を検出（デフォルト: false） |

### git_related_changes

指定ファイルと一緒に頻繁に変更されるファイルを検出します（共変更分析）。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 100） |
| min_coupling | number | いいえ | 含める最小共変更回数（デフォルト: 2） |

### git_contributor_patterns

コントリビューターパターンの分析 — 誰がどの領域に詳しいかを把握します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| path_pattern | string | いいえ | 分析範囲を絞るディレクトリまたはパス（例: `"src/api/"`） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"1 year ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 500） |

### git_search_commits

キーワードでコミットメッセージを検索します。機能の導入時期、バグ修正、チケット番号に関連するコミットの特定に便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| query | string | はい | コミットメッセージに対する検索文字列 |
| max_commits | number | いいえ | 返すコミットの最大数（デフォルト: 20） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| author | string | いいえ | 著者名またはメールでフィルタ |
| path_pattern | string | いいえ | このパスに影響するコミットに限定 |

### git_commit_show

特定コミットの詳細情報を表示します：完全なメッセージ、変更ファイル一覧、オプションで差分も表示。`git_search_commits` で見つけたコミットの深掘りに便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| commit | string | はい | コミットハッシュ（短縮・完全）、ブランチ名、またはタグ |
| show_diff | boolean | いいえ | 完全な差分を含める（デフォルト: false、統計のみ表示） |

### git_diff_context

2つのコミット、ブランチ、またはタグ間の差分を表示します。リリース間、ブランチ間、または履歴上の任意の2点間の変更内容の把握に便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| commit | string | はい | 対象コミット、ブランチ、またはタグ |
| compare_to | string | いいえ | 比較元（デフォルト: 親コミット） |
| file_path | string | いいえ | 差分を特定ファイルに限定 |
| stat_only | boolean | いいえ | ファイル変更統計のみ表示（デフォルト: false） |
| context_lines | number | いいえ | unified diff のコンテキスト行数（デフォルト: 3） |
| word_diff | boolean | いいえ | `git diff --word-diff=plain` で単語レベルの差分を表示（デフォルト: false） |

### git_hotspots

リポジトリ内で最も頻繁に変更されるファイルを特定します。変更頻度の高いファイルは、技術的負債、活発な開発、またはバグが多い領域を示すことが多いです。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定（例: `"src/"`） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |
| top_n | number | いいえ | 返すファイル数（デフォルト: 20） |

### git_pickaxe

特定の文字列や正規表現パターンを追加・削除したコミットを検索します（git の pickaxe 機能）。関数や変数がいつ導入・削除されたかの特定に不可欠です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| search_term | string | はい | コード変更内を検索する文字列または正規表現パターン |
| is_regex | boolean | いいえ | search_term を正規表現 `-G` として扱う（デフォルト: false、リテラル `-S`） |
| max_commits | number | いいえ | 返すコミットの最大数（デフォルト: 20） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| author | string | いいえ | 著者名またはメールでフィルタ |
| path_pattern | string | いいえ | このパスに影響するコミットに限定 |

### git_code_churn

ファイル単位のコードチャーン（追加行数 + 削除行数）を分析します。チャーンが多いファイルは不安定なコード、頻繁なリファクタリング、またはアーキテクチャの見直しが必要な領域を示す可能性があります。`git_hotspots` を補完し、変更頻度だけでなく変更量を計測します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定（例: `"src/"`） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |
| top_n | number | いいえ | 返すファイル数（デフォルト: 20） |

### git_stale_files

長期間更新されていないファイルを検出します。古いファイルはデッドコード、忘れられた設定、またはレビューや削除が必要な技術的負債を示す可能性があります。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| threshold_days | number | いいえ | 古いと判定する最低日数（デフォルト: 180） |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定（例: `"src/"`） |
| top_n | number | いいえ | 返すファイルの最大数（デフォルト: 30） |

### git_merge_base

2つのブランチまたは参照の共通祖先（マージベース）を見つけ、分岐以降の両側のコミットを表示します。ブランチの関係性の理解やマージ内容のレビューに便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| ref1 | string | はい | 1つ目のブランチまたは参照（例: `"main"`） |
| ref2 | string | はい | 2つ目のブランチまたは参照（例: `"feature-branch"`） |
| max_commits | number | いいえ | 各側で表示するコミットの最大数（デフォルト: 50） |

### git_tag_list

タグを作成日順で一覧表示し、関連メッセージも表示します。リリース履歴やバージョニングパターンの把握に便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| pattern | string | いいえ | タグをフィルタする glob パターン（例: `"v1.*"`） |
| max_tags | number | いいえ | 返すタグの最大数（デフォルト: 50） |
| sort | string | いいえ | ソート順: `"newest"` または `"oldest"`（デフォルト: `"newest"`） |

### git_knowledge_map

ディレクトリ別の知識所有者マップとバス係数を表示します。知識集中リスクの特定やチームのクロストレーニングが必要な領域の把握に役立ちます。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定（例: `"src/"`） |
| depth | number | いいえ | 集約するディレクトリの深さ（デフォルト: 2） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"1 year ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |

### git_dependency_map

共変更パターンに基づくディレクトリ間の暗黙的依存ネットワークを可視化します。頻繁に一緒に変更されるディレクトリは隠れた結合を持っている可能性があります。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| depth | number | いいえ | 集約するディレクトリの深さ（デフォルト: 2） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"1 year ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |
| min_coupling | number | いいえ | 含める最小共変更回数（デフォルト: 3） |

### git_bisect_guide

バグ導入コミット特定のための事前分析。範囲内のコミット数、推定bisectステップ数、ホットスポット、関連コミットを表示します。`git bisect` 自体は実行しません。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| good_ref | string | はい | バグが存在しない正常なリファレンス |
| bad_ref | string | いいえ | バグが存在するリファレンス（デフォルト: HEAD） |
| file_path | string | いいえ | 対象ファイルパス（任意） |

### git_rename_history

ファイルのリネーム履歴を追跡します。完全なリネームチェーンを再構築し、ファイルが時系列でどのように名前変更されたかを表示します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| max_entries | number | いいえ | スキャンするコミットの最大数（デフォルト: 50） |

### git_commit_graph

マージパターンとブランチ統合トポロジーを分析します。マージ比率、マージ頻度、マージソース、統合スタイルの分類を算出します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | 分析期間（デフォルト: "6 months ago"） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 1000） |

### git_branch_activity

ブランチの活性度を分析し、最近のコミット活動に基づいてactive/stale/abandonedに分類します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| include_remote | boolean | いいえ | リモートブランチを含む（デフォルト: false） |
| stale_days | number | いいえ | staleと判定する未コミット日数（デフォルト: 30） |
| abandoned_days | number | いいえ | abandonedと判定する未コミット日数（デフォルト: 90） |

### git_author_timeline

著者の活動期間とチーム構成の変化を分析します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"1 year ago"`） |
| path_pattern | string | いいえ | 分析対象パス（例: `"src/"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 1000） |

### git_commit_frequency

時間帯別のコミット頻度を分析します。コミットを日次/週次/月次のバケットにグループ化し、開発パターンを特定します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| granularity | string | いいえ | 時間粒度: `"daily"`, `"weekly"`（デフォルト）, `"monthly"` |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 1000） |
| path_pattern | string | いいえ | 分析対象パス（例: `"src/"`） |

### git_release_notes

2つのref間のコミットをConventional Commits形式で集約し、リリースノートを生成します。タイプ/スコープでグループ化し、Breaking Changeを検出、コントリビューター一覧を含みます。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| from_ref | string | はい | 開始ref（タグ、ブランチ、またはコミット） |
| to_ref | string | いいえ | 終了ref（デフォルト: HEAD） |
| group_by | string | いいえ | グループ化: `"type"`（デフォルト）, `"scope"`, `"none"` |
| include_breaking | boolean | いいえ | Breaking Changesセクションを含む（デフォルト: true） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 500） |

### git_contributor_network

コントリビューター間のコラボレーションネットワークを分析します。同じファイルを触る開発者の関係、チーム協力パターン、知識サイロを可視化します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 500） |
| path_pattern | string | いいえ | 分析対象パス（例: `"src/"`） |
| min_shared_files | number | いいえ | コラボレーションリンクを表示する最小共有ファイル数（デフォルト: 1） |

### git_conflict_history

マージコミットで頻繁に変更されるファイルを検出します。高頻度ファイルはコンフリクトが多い領域を示し、リファクタリングや構造改善の必要性を示唆します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_merges | number | いいえ | 分析するマージコミットの最大数（デフォルト: 200） |
| top_n | number | いいえ | 返すファイル数（デフォルト: 20） |
| path_pattern | string | いいえ | 分析対象パス（例: `"src/"`） |

### git_survival_analysis

コードチャーンの時系列トレンドを分析します。期間ごとの追加行数・削除行数・純変更・チャーンレートを表示します。リファクタリング期間やコードの不安定性の特定に便利です。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| granularity | string | いいえ | 時間粒度: `"daily"`, `"weekly"`（デフォルト）, `"monthly"` |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 1000） |
| path_pattern | string | いいえ | 分析対象パス（例: `"src/"`） |

### git_code_age

ファイル内のコード行をblameデータを使って年齢分布で分析します。行を年齢ブラケット（1ヶ月未満、1-3ヶ月、3-6ヶ月、6-12ヶ月、1年超）にグループ化し、ファイル内の各部分がどれだけ古いかを可視化します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |

### git_commit_message_quality

コミットメッセージの品質メトリクスを分析します。Conventional Commits準拠率、平均subject長、長いsubject違反（72文字超）、issue参照率、type分布を含みます。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 200） |
| path_pattern | string | いいえ | このパスに影響するコミットに限定 |
| author | string | いいえ | 著者名またはメールでフィルタ |

### git_reflog_analysis

git reflogエントリを分析し、HEADの移動履歴を可視化します。ブランチ切り替え、reset、rebase等のref更新を表示。失われたコミットの復元やローカルワークフローパターンの理解に役立ちます。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| ref | string | いいえ | reflogを表示するref（デフォルト: HEAD） |
| max_entries | number | いいえ | 最大エントリ数（デフォルト: 50, 最大: 500） |
| action_filter | string | いいえ | アクションタイプでフィルタ（例: 'commit', 'checkout', 'reset', 'rebase'） |

### git_cherry_pick_detect

`git cherry`を使用してブランチ間のcherry-pick済みコミットを検出します。upstream に既に適用されたコミットと、未適用の固有コミットを表示。ブランチ間の重複作業の特定に役立ちます。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| upstream | string | はい | 比較対象のupstreamブランチ（例: 'main'） |
| head | string | いいえ | チェックするブランチ（デフォルト: 現在のHEAD） |

### git_line_history

`git log -L`を使用して特定の行範囲や関数の変遷を追跡します。blame（スナップショット）やfile_history（ファイル単位）では不可能な、行レベルの進化履歴を表示します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリルートからの相対パス |
| start_line | number | いいえ | 追跡する行範囲の開始行（end_lineも必要） |
| end_line | number | いいえ | 追跡する行範囲の終了行（start_lineも必要） |
| funcname | string | いいえ | 追跡する関数名（行範囲の代替手段） |
| max_commits | number | いいえ | 表示するコミットの最大数（デフォルト: 20） |

### git_commit_cluster

時間的近接性と共有ファイルで関連コミット群を検出します。logical changeset境界の可視化 — 一つのまとまった変更を構成するコミット群をグループ化します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | この日付以降のコミットのみ対象 |
| author | string | いいえ | 著者名またはメールでフィルタ |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 200） |
| time_window_minutes | number | いいえ | クラスタリングの時間窓（分、デフォルト: 120） |
| min_shared_files | number | いいえ | コミットをリンクする最小共有ファイル数（デフォルト: 1） |
| path_pattern | string | いいえ | ファイルパスパターンでフィルタ |

### git_merge_timeline

マージ頻度の時系列推移を可視化します。期間別のマージ回数・ブランチ数・トレンド方向を表示します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| granularity | string | いいえ | 期間の粒度: `"weekly"`, `"monthly"`, `"quarterly"`（デフォルト: `"monthly"`） |
| num_periods | number | いいえ | 分析する期間数（デフォルト: 6、最大: 24） |
| path_pattern | string | いいえ | 特定パスに限定 |
| since | string | いいえ | 開始日のオーバーライド |

### git_complexity_hotspots

6次元リスク評価（変更頻度・コードチャーン・知識集中・結合度・鮮度・コンフリクト頻度）で保守困難度ホットスポットをランキングします。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | 日付フィルタ |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 500） |
| top_n | number | いいえ | 返却するホットスポットの数（デフォルト: 10、最大: 100） |
| path_pattern | string | いいえ | ファイルパスパターンでフィルタ |

### git_contributor_growth

コントリビューターの増減・定着率を時系列で分析します。期間（月次/四半期）ごとに新規/離脱コントリビューターを検出し、定着率・バス係数トレンドを算出、全体的な軌道をgrowing/stable/shrinkingで判定します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| period | string | いいえ | 集計期間: `"monthly"`, `"quarterly"`（デフォルト: `"monthly"`） |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"1 year ago"`） |
| path_pattern | string | いいえ | パスパターンでフィルタ |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 10000） |

### git_code_ownership_changes

指定日付を境界に「前期」「後期」のコード所有権を比較し、所有者交代・バス係数変化・新規/離脱コントリビューター・知識移転パターンを検出します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| period_boundary | string | はい | 前後期の境界日付（例: `"2024-06-01"`, `"3 months ago"`） |
| depth | number | いいえ | 集約するディレクトリの深さ（1-5、デフォルト: 1） |
| path_pattern | string | いいえ | 分析を特定ディレクトリに限定 |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 500） |

### git_impact_analysis

ファイルまたはディレクトリへの変更がどこまで波及するかを分析します。共変更ネットワーク・コントリビューター重複・ディレクトリ結合度を統合してblast radiusを評価します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| target_path | string | はい | 影響分析対象のファイルまたはディレクトリパス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 500） |
| min_coupling | number | いいえ | 含める最小共変更回数（デフォルト: 2） |

### git_review_prep

2つのref間の差分を分析してPRレビューブリーフィングを生成します。diff統計、コミット履歴、ホットスポット/チャーン分析、コントリビューターパターン、共変更検出を組み合わせ、リスクフラグの提示、レビュアーの推薦、変更漏れ候補の警告を行います。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| base_ref | string | はい | 比較元のref（例: `"main"`） |
| head_ref | string | いいえ | 比較先のref（デフォルト: `"HEAD"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |

出力例：

```
PR Review Briefing: main...HEAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commits (2):
  abc1234 feat: add new feature
  def5678 fix: handle edge case

Changed files (3, +35 -10):
  src/foo.ts | +25 -5
  src/bar.ts | +10 -5

Risk flags:
  src/foo.ts — HOTSPOT (15 changes), HIGH CHURN (450 lines)

Suggested reviewers:
  Alice <alice@example.com> — 12 commits to src/foo.ts

Potentially missing files:
  src/foo.test.ts — co-changes with src/foo.ts 85% of the time
```

### git_why

blame、コミットコンテキスト、コントリビューターパターン、共変更分析を組み合わせてコードの経緯をナラティブで説明します。「なぜこのコードはこうなっているのか？」にファイルまたは行範囲単位で回答します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| start_line | number | いいえ | 行範囲の開始行 |
| end_line | number | いいえ | 行範囲の終了行 |
| max_commits | number | いいえ | 詳細表示するコミット数の上限（デフォルト: 10） |

出力例：

```
Why does this code exist? — src/foo.ts L10-25
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Blame summary (3 commits, 2 authors):

[L10-15] abc1234 | 2024-06-15 | Alice
  Commit: feat: add validation logic
  Files in commit: src/foo.ts, src/foo.test.ts

[L16-25] def5678 | 2024-08-20 | Bob
  Commit: fix: handle null input (Fixes #42)
  Files in commit: src/foo.ts, src/bar.ts

File context:
  Contributors: Alice (80%), Bob (20%)
  Co-changed with: src/foo.test.ts (85%), src/types.ts (60%)
```

### git_file_risk_profile

単一ファイルの包括的リスク評価。変更頻度、コードチャーン、知識集中度、暗黙の結合、鮮度を組み合わせた多次元プロファイルを返します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| file_path | string | はい | リポジトリ内のファイルの相対パス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |

出力例：

```
Risk profile for: src/core/engine.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Change frequency:  HIGH (47 changes, top 3%)
Code churn:        HIGH (1,230 lines churned)
Knowledge risk:    MEDIUM (2 contributors, top owns 78%)
Coupling:          HIGH (12 co-changed files)
Staleness:         LOW (last changed 3 days ago)

Overall: HIGH RISK
Concerns: frequently changing, high code churn, highly coupled
```

### git_repo_health

リポジトリ全体の健全性サマリー。ファイル数、コミットアクティビティ、ホットスポット、チャーン、コントリビューター分布、古いファイル数を一括で返します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | アクティビティ分析の日付フィルタ |
| max_commits | number | いいえ | 分析するコミット数（デフォルト: 500） |
| stale_threshold_days | number | いいえ | 古いと判定する日数（デフォルト: 180） |

### git_repo_statistics

リポジトリの物理的構造・規模を分析する。オブジェクト数、パック統計、総コミット数、ブランチ/タグ数、リポジトリ年齢、最大トラッキングファイルを表示。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| top_n_files | number | いいえ | 最大ファイルの表示数（デフォルト: 10、最大: 100） |

### git_commit_patterns

曜日・時間帯別のコミット分布をヒートマップ形式で分析。ピーク活動ウィンドウ、平日/週末比率、タイムゾーン分布を表示。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| author | string | いいえ | 著者名またはメールでフィルタ |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析する最大コミット数（デフォルト: 1000） |
| path_pattern | string | いいえ | パスパターンでフィルタ |

### git_revert_analysis

リポジトリのリバートパターンを分析します。`git revert` で作成されたコミットを検出し、オリジナルコミットと紐付け、time-to-revert統計を計算、頻繁にリバートされるファイル（リバートホットスポット）を特定します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| path_pattern | string | いいえ | パスパターンでフィルタ |
| top_n | number | いいえ | ホットスポットの返却件数（デフォルト: 10） |

### git_velocity_anomalies

平均±Nσ閾値を用いてコミット頻度の統計的異常（スパイク・ドロップ）を検出します。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| repo_path | string | はい | git リポジトリの絶対パス |
| granularity | string | いいえ | 時間粒度: `"daily"`, `"weekly"`（デフォルト）, `"monthly"` |
| since | string | いいえ | 日付フィルタ（例: `"2024-01-01"`, `"6 months ago"`） |
| max_commits | number | いいえ | 分析するコミットの最大数（デフォルト: 1000） |
| threshold_sigma | number | いいえ | 異常検出の標準偏差倍数（デフォルト: 2） |
| path_pattern | string | いいえ | 分析対象パス（例: `"src/"`） |

## プロンプト

MCP Prompts は複数のツールを連携させたガイド付きワークフローを提供します。

| プロンプト | 説明 | パラメータ |
|-----------|------|-----------|
| `investigate-code` | コード調査 — blame、pickaxe、ファイル履歴を使ってコードの経緯を解明 | `repo_path`, `file_path`, `line_range?` |
| `review-pr` | PRレビュー — リスク評価付きのレビューブリーフィングを生成 | `repo_path`, `base_ref`, `head_ref?` |
| `assess-health` | リポジトリ健全性評価 — リポジトリ全体の品質を評価 | `repo_path` |
| `trace-change` | 変更追跡 — 特定の文字列がいつ・なぜ追加/削除されたかを追跡 | `repo_path`, `search_term` |
| `onboard-codebase` | 新規参入者向けオンボーディング — リポジトリ構造、主要コントリビューター、活発な領域のガイドツアー | `repo_path` |
| `find-bug-origin` | バグ原因特定 — bisect事前分析を活用してバグ導入コミットを特定 | `repo_path`, `good_ref`, `bad_ref?`, `file_path?`, `symptom?` |
| `technical-debt` | 技術的負債分析 — ホットスポット・churn・放置ファイル・知識集中を総合評価 | `repo_path` |
| `onboard-area` | 領域別オンボーディング — 特定ディレクトリの知識所有者・貢献者・変更履歴の調査 | `repo_path`, `directory` |
| `ai-agent-safety` | AIエージェント向けファイル変更前のリスクチェック — file_risk_profile・impact_analysis・related_changes・conflict_historyを連鎖実行 | `repo_path`, `file_path` |
| `plan-refactoring` | リファクタリング計画 — 5次元リスクで候補をランキングし、上位ファイルのリスク詳細・コード経緯・影響範囲を調査 | `repo_path`, `path_pattern?`, `top_n?` |
| `assess-change-risk` | 変更リスク評価 — ファイルリスク・影響範囲・知識分布・コード経緯を変更前に評価 | `repo_path`, `file_path`, `change_description?` |
| `identify-tech-debt` | 技術的負債の多角的分析 — リファクタリング候補・複雑性ホットスポット・リスク詳細・コード年齢・知識喪失リスクを連鎖実行 | `repo_path`, `path_pattern?`, `top_n?` |
| `diagnose-performance` | パフォーマンス診断 — リポジトリ物理構造・変更集中領域・放置コード・トレンド分析・結合度を連鎖実行 | `repo_path`, `path_pattern?`, `top_n?` |
| `post-incident-review` | ポストインシデントレビュー — コミット検索・差分確認・リバート分析・ファイルリスク評価・影響分析を連鎖し、根本原因と再発防止策を導出 | `repo_path`, `incident_date`, `suspected_files?` |
| `plan-release` | リリース計画レビュー — リリース比較・リバート分析・ファイルリスク・調整コスト・健全性トレンドを連鎖し、リリース判断を支援 | `repo_path`, `base_ref`, `head_ref?`, `release_date?` |
| `find-experts` | 特定領域のエキスパートを発見するワークフロー — knowledge_map・author_timeline・blame・contributor_networkを連鎖実行 | `repo_path`, `path_pattern`, `since?` |

## リソース

| URI | 説明 |
|-----|------|
| `dig://tool-guide` | ツール使い分けガイド — よくある質問から適切なツールを案内 |
| `dig://repo-summary/{path}` | リポジトリ概要の動的生成 — ブランチ、ファイル数、コントリビューター、最近のコミット等 |

## セットアップ

### 前提条件

- Node.js >= 22
- Git

### インストール

```bash
npm install -g mcp-server-dig
```

ソースからビルドする場合：

```bash
git clone https://github.com/nakishiyaman/mcp-server-dig.git
cd mcp-server-dig
npm install
npm run build
```

### 設定

MCP クライアントの設定ファイル（例: Claude Desktop の `claude_desktop_config.json`）に追加してください：

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
    }
  }
}
```

ソースから実行する場合：

```json
{
  "mcpServers": {
    "dig": {
      "command": "node",
      "args": ["./build/index.js"]
    }
  }
}
```

### Zed

Zed の `settings.json` に追加してください：

```json
{
  "context_servers": {
    "dig": {
      "command": {
        "path": "mcp-server-dig",
        "args": []
      }
    }
  }
}
```

### Cursor

プロジェクトルートの `.cursor/mcp.json` に追加してください：

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
    }
  }
}
```

### Windsurf

Windsurf の MCP 設定に追加してください：

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig"
    }
  }
}
```

## 設定

### タイムアウト

全51ツールが、大規模リポジトリ向けにオプションの `timeout_ms` パラメータ（デフォルト: 30000ms、最大: 300000ms）を受け付けます。

### 出力フォーマット

全51ツールがオプションの `output_format` パラメータを受け付けます:
- `"text"`（デフォルト）— 人間が読みやすいテキスト形式
- `"json"` — プログラムからの利用に適した構造化JSON形式

### Tool Annotations

全51ツールにMCP Tool Annotations（`readOnlyHint: true`, `openWorldHint: false`）を宣言。digの全ツールが読み取り専用のgit分析操作であることをクライアントに通知します。

### Streamable HTTP Transport

デフォルトはstdioトランスポート。Streamable HTTPを使用するには:

```bash
# CLIフラグ
mcp-server-dig --http

# 環境変数
DIG_TRANSPORT=http mcp-server-dig
```

HTTPモードでは `http://127.0.0.1:3000/mcp` でリッスンします。ポートは `DIG_PORT` で変更可能:

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig",
      "args": ["--http"],
      "env": {
        "DIG_PORT": "8080"
      }
    }
  }
}
```

### 自動補完

プロンプト引数とリソースURIパスがMCP補完プロトコルに対応。対話的なクライアントで補完候補を提示します。

### 構造化ログ

MCP Logging Protocolに対応。クライアント接続時はMCPプロトコル経由でログを送信し、未接続時はstderrにフォールバックします。

`DIG_LOG_LEVEL` 環境変数でログレベルを制御できます:

```json
{
  "mcpServers": {
    "dig": {
      "command": "mcp-server-dig",
      "env": {
        "DIG_LOG_LEVEL": "debug"
      }
    }
  }
}
```

利用可能なレベル: `debug`, `info`（デフォルト）, `warn`, `error`。

`DIG_LOG_LEVEL=debug` 設定時は、全gitコマンドの実行時間と分析キャッシュのhit/missイベントがログ出力されます。パフォーマンスのプロファイリングやボトルネック特定に活用できます。

## 開発

```bash
npm install
npm run build        # TypeScript コンパイル
npm run typecheck    # 型チェック（出力なし）
npm run lint         # ESLint
npm test             # テスト実行（vitest）
npm run test:watch   # ウォッチモード
```

## ライセンス

MIT
