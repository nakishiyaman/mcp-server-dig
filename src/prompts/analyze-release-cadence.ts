import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildAnalyzeReleaseCadencePrompt(args: {
  repo_path: string;
  since?: string;
}): GetPromptResult {
  const { repo_path, since } = args;

  const sinceParam = since ? `\n   - since: ${since}` : "";
  const sinceFilter = since ? ` (since ${since})` : "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリでリリースケイデンス分析を実施してください。

対象リポジトリ: ${repo_path}${sinceFilter}

## 手順

1. **git_tag_analysis** でタグベースのリリースパターンを分析
   - リポジトリ: ${repo_path}
   - semverパターン分布・タグ種別・リリース間隔統計・頻度トレンドを取得

2. **git_commit_frequency** でコミット頻度のトレンドを分析
   - リポジトリ: ${repo_path}
   - granularity: monthly${sinceParam}
   - リリース間のコミット活動パターンを把握

3. **git_trend_analysis** でメトリクスのトレンドを確認
   - リポジトリ: ${repo_path}
   - hotspots/churn/contributorsの変化傾向を分析

## 出力

以下の形式でリリースケイデンス分析レポートをまとめてください:
- **リリースサマリー**: 総タグ数・semverバージョン分布・annotated/lightweight比率
- **リリース間隔**: 平均・中央値・最短・最長の日数、頻度トレンド（accelerating/stable/decelerating）
- **コミット活動パターン**: 月次コミット頻度の推移、リリースサイクルとの相関
- **健全性トレンド**: メトリクスの改善/悪化傾向
- **推奨事項**: リリースプロセス改善の提案（HIGH / MEDIUM / LOW）`,
        },
      },
    ],
  };
}

export function registerAnalyzeReleaseCadence(server: McpServer): void {
  server.registerPrompt(
    "analyze-release-cadence",
    {
      title: "リリースケイデンス分析",
      description:
        "タグベースのリリースパターン・コミット頻度・メトリクストレンドを分析し、リリースケイデンスの健全性を評価する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        since: z
          .string()
          .optional()
          .describe('分析開始日（例: "2024-01-01", "1 year ago"）'),
      },
    },
    (args) => buildAnalyzeReleaseCadencePrompt(args),
  );
}
