import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildAssessChangeRiskPrompt(args: {
  repo_path: string;
  file_path: string;
  change_description?: string;
}): GetPromptResult {
  const { repo_path, file_path, change_description } = args;

  const changeContext = change_description
    ? `\n変更内容: ${change_description}`
    : "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のファイルへの変更リスクを事前評価してください。

対象リポジトリ: ${repo_path}
対象ファイル: ${file_path}${changeContext}

## 評価手順

1. **git_file_risk_profile** で対象ファイルの現在のリスク状態を把握する
   - リポジトリ: ${repo_path}
   - ファイル: ${file_path}
   - 5次元リスク（変更頻度・チャーン・知識集中・結合度・鮮度）を確認

2. **git_impact_analysis** で変更の影響範囲を分析する
   - ファイル: ${file_path}
   - co-change先、コントリビューター重複、ディレクトリ結合度を確認

3. **git_knowledge_map** で対象ファイルが属するディレクトリの知識分布を確認する
   - 変更時にレビューを依頼すべき人を特定する

4. **git_why** で対象ファイルの経緯を調査する
   - 既存のロジックがなぜそうなっているかを理解する
   - 変更で壊れる可能性のある暗黙の依存関係を特定する

## 出力

以下の形式でリスク評価をまとめてください:
- 総合リスクレベル: HIGH / MEDIUM / LOW
- リスク要因の詳細（どの次元が高リスクか）
- 影響を受ける可能性のあるファイル一覧
- 推奨レビュワー（知識所有者）
- 推奨事項（テスト追加、段階的変更、レビュー強化など）`,
        },
      },
    ],
  };
}

export function registerAssessChangeRisk(server: McpServer): void {
  server.registerPrompt(
    "assess-change-risk",
    {
      title: "変更リスク評価",
      description:
        "特定のファイルへの変更前にリスクを評価し、影響範囲と推奨事項を提示する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        file_path: z
          .string()
          .describe("変更予定のファイルの相対パス"),
        change_description: z
          .string()
          .optional()
          .describe("変更内容の簡単な説明"),
      },
    },
    (args) => buildAssessChangeRiskPrompt(args),
  );
}
