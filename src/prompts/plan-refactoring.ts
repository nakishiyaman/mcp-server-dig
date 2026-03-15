import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildPlanRefactoringPrompt(args: {
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
          text: `以下のリポジトリのリファクタリング計画を作成してください。

対象リポジトリ: ${repo_path}

## 手順

1. **git_refactor_candidates** でリファクタリング候補をランキングする
   - リポジトリ: ${repo_path}
   - top_n: ${topN}${pathFilter}

2. 上位3件に対して **git_file_risk_profile** でリスク詳細を確認する
   - 各ファイルの5次元リスクを確認し、どの次元が問題かを特定する

3. 最もリスクの高いファイルに対して **git_why** で経緯を調査する
   - なぜ現在の状態になっているかを理解する
   - リファクタリングで壊れる可能性のあるロジックを特定する

4. 上位候補に対して **git_impact_analysis** で影響範囲を確認する
   - リファクタリング時に一緒に変更が必要なファイルを特定する
   - 影響範囲が大きいものは段階的リファクタリングを検討する

## 出力

以下の形式でリファクタリング計画をまとめてください:
- 優先順位付きのリファクタリング対象リスト
- 各ファイルのリスク要因と推奨アクション
- 影響範囲と依存関係
- 推奨する実施順序（依存関係を考慮）`,
        },
      },
    ],
  };
}

export function registerPlanRefactoring(server: McpServer): void {
  server.registerPrompt(
    "plan-refactoring",
    {
      title: "リファクタリング計画",
      description:
        "リポジトリ全体のリファクタリング候補を分析し、優先順位付きの計画を作成する",
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
    (args) => buildPlanRefactoringPrompt(args),
  );
}
