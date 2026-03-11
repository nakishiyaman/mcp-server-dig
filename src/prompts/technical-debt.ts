import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildTechnicalDebtPrompt(args: {
  repo_path: string;
}): GetPromptResult {
  const { repo_path } = args;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリの技術的負債を分析し、改善の優先順位を提案してください。

対象リポジトリ: ${repo_path}

## 分析手順

1. **git_hotspots** で変更が集中しているファイルを特定する
   - リポジトリ: ${repo_path}
   - 高頻度変更ファイルは不安定なコードの兆候

2. **git_code_churn** でコード変動量が大きいファイルを特定する
   - リポジトリ: ${repo_path}
   - 高churnファイルはリファクタリング候補

3. **git_stale_files** で長期間更新されていないファイルを特定する
   - リポジトリ: ${repo_path}
   - 放置ファイルは技術的負債の蓄積箇所

4. **git_knowledge_map** で知識集中度を分析する
   - リポジトリ: ${repo_path}
   - バス係数が低い領域はリスク

## 出力フォーマット

調査結果を以下の構成でまとめてください:
- **高リスクファイル**: ホットスポット × 高churn の交差点
- **知識集中リスク**: バス係数が低い領域と改善策
- **放置領域**: メンテナンスが必要なファイル一覧
- **改善優先順位**: 影響度とコストに基づくランキング
- **推奨アクション**: 各カテゴリごとの具体的な改善手順`,
        },
      },
    ],
  };
}

export function registerTechnicalDebt(server: McpServer): void {
  server.registerPrompt(
    "technical-debt",
    {
      title: "技術的負債分析",
      description:
        "ホットスポット・churn・放置ファイル・知識集中を総合し、技術的負債の優先順位を提案する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
      },
    },
    (args) => buildTechnicalDebtPrompt(args),
  );
}
