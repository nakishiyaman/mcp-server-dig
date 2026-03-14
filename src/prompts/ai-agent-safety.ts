import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildAiAgentSafetyPrompt(args: {
  repo_path: string;
  target_files: string;
}): GetPromptResult {
  const { repo_path, target_files } = args;
  const fileList = target_files
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  const fileListStr = fileList.map((f) => `- ${f}`).join("\n");

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のファイルを変更する前に、リスク評価を実施してください。

対象リポジトリ: ${repo_path}
対象ファイル:
${fileListStr}

## 評価手順

1. **git_file_risk_profile** で各ファイルのリスクプロファイルを確認する
   - リポジトリ: ${repo_path}
   - 各ファイルについて実行
   - 変更頻度、コードチャーン、知識集中度、結合度、鮮度を確認

2. **git_impact_analysis** で変更の影響範囲を分析する
   - リポジトリ: ${repo_path}
   - 各ファイルのco-change関係と結合度を確認
   - blast radiusが高い場合は注意

3. **git_related_changes** で関連ファイルを特定する
   - 各ファイルと一緒に変更されることが多いファイルを確認
   - 変更漏れの可能性があるファイルをリストアップ

4. **git_conflict_history** でマージコンフリクトリスクを確認する
   - 対象ファイルが頻繁にマージコンフリクトを起こしていないか確認

## 出力

各ファイルについて以下を報告してください:
- **リスクレベル**: HIGH / MEDIUM / LOW
- **注意点**: 変更時に注意すべきこと
- **関連ファイル**: 一緒に変更が必要な可能性のあるファイル
- **推奨事項**: 安全に変更するためのアドバイス`,
        },
      },
    ],
  };
}

export function registerAiAgentSafety(server: McpServer): void {
  server.registerPrompt(
    "ai-agent-safety",
    {
      title: "AIエージェント安全チェック",
      description:
        "ファイル変更前のリスク評価 — リスクプロファイル、影響範囲、関連ファイル、コンフリクト履歴を事前チェック",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        target_files: z
          .string()
          .describe("変更対象のファイルパス（カンマ区切り、例: src/index.ts,src/utils.ts）"),
      },
    },
    (args) => buildAiAgentSafetyPrompt(args),
  );
}
