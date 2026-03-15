import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildDiagnosePerformancePrompt(args: {
  repo_path: string;
  path_pattern?: string;
  top_n?: string;
}): GetPromptResult {
  const { repo_path, path_pattern, top_n } = args;
  const topN = top_n ?? "10";

  const pathFilter = path_pattern
    ? `\n   - path_pattern: ${path_pattern}`
    : "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリのパフォーマンス問題を診断してください。

対象リポジトリ: ${repo_path}

## 手順

1. **git_repo_statistics** でリポジトリの物理的サイズ・構造を把握する
   - リポジトリ: ${repo_path}
   - top_n_files: ${topN}
   - オブジェクト数、パックサイズ、最大ファイルを確認する

2. **git_hotspots** で変更が集中している領域を特定する
   - リポジトリ: ${repo_path}
   - top_n: ${topN}${pathFilter}
   - 変更頻度が高いファイルはパフォーマンスボトルネックの候補

3. **git_stale_files** で放置されているコードを特定する
   - リポジトリ: ${repo_path}${pathFilter}
   - 長期間更新されていないが依然として存在するファイルは、不要なコードの可能性

4. **git_trend_analysis** でメトリクスの悪化傾向を確認する
   - リポジトリ: ${repo_path}${pathFilter}
   - hotspots、churn、commit_countのトレンドを分析
   - 悪化傾向にあるメトリクスを特定する

5. **git_dependency_map** でディレクトリ間の結合度を確認する
   - リポジトリ: ${repo_path}
   - 結合度が高い箇所はビルド・テスト時間に影響する可能性がある

## 出力

以下の形式でパフォーマンス診断レポートをまとめてください:
- **リポジトリ概要**: 物理サイズ、オブジェクト数、最大ファイル
- **ホットスポット分析**: 変更集中領域とその影響
- **放置コード**: 不要な可能性があるファイル
- **トレンド分析**: 悪化傾向にあるメトリクス
- **結合度問題**: ディレクトリ間の高結合箇所
- **推奨アクション**: 優先順位付きの改善策`,
        },
      },
    ],
  };
}

export function registerDiagnosePerformance(server: McpServer): void {
  server.registerPrompt(
    "diagnose-performance",
    {
      title: "パフォーマンス診断",
      description:
        "リポジトリの物理構造・変更パターン・結合度を分析し、パフォーマンス問題を診断する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        path_pattern: z
          .string()
          .optional()
          .describe('対象パスのフィルタ（例: "src/" や "*.ts"）'),
        top_n: z
          .string()
          .optional()
          .describe("分析する候補の数（デフォルト: 10）"),
      },
    },
    (args) => buildDiagnosePerformancePrompt(args),
  );
}
