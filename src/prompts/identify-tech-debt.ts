import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildIdentifyTechDebtPrompt(args: {
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
          text: `以下のリポジトリの技術的負債を多角的に特定・分析してください。

対象リポジトリ: ${repo_path}

## 手順

1. **git_refactor_candidates** でリファクタリング候補を5次元で評価する
   - リポジトリ: ${repo_path}
   - top_n: ${topN}${pathFilter}

2. **git_complexity_hotspots** で6次元の複雑性ホットスポットを特定する
   - リポジトリ: ${repo_path}
   - top_n: ${topN}${pathFilter}
   - コンフリクト頻度を含む、より包括的な保守困難度を評価する

3. 上位候補に対して **git_file_risk_profile** でリスク詳細を確認する
   - 各ファイルの全リスク次元を比較し、どの次元が最も問題かを特定する

4. **git_code_age** でコードの古さと更新頻度を確認する
   - リポジトリ: ${repo_path}${pathFilter}
   - 長期間更新されていないが重要なコードを特定する

5. **git_knowledge_loss_risk** で知識集中リスクを確認する
   - リポジトリ: ${repo_path}${pathFilter}
   - バス因子が低い（特定の人しか触れない）コードを特定する

## 出力

以下の形式で技術的負債レポートをまとめてください:
- **負債カテゴリ別の分析**: 複雑性、知識集中、陳腐化、コンフリクト頻度
- **優先順位付きの対応リスト**: スコアとリスクレベルに基づく
- **各負債の影響度**: 放置した場合のリスク
- **推奨アクション**: カテゴリごとの具体的な改善策`,
        },
      },
    ],
  };
}

export function registerIdentifyTechDebt(server: McpServer): void {
  server.registerPrompt(
    "identify-tech-debt",
    {
      title: "技術的負債の特定",
      description:
        "リポジトリの技術的負債を複数のツールで多角的に分析し、優先順位付きのレポートを作成する",
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
    (args) => buildIdentifyTechDebtPrompt(args),
  );
}
