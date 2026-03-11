import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildAssessHealthPrompt(args: {
  repo_path: string;
}): GetPromptResult {
  const { repo_path } = args;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリの健全性を評価してください。

対象リポジトリ: ${repo_path}

## 評価手順

1. **git_repo_health** でリポジトリ全体の健全性スコアを確認する
   - リポジトリ: ${repo_path}

2. **git_hotspots** で変更が集中しているファイルを特定する
   - リポジトリ: ${repo_path}

3. **git_stale_files** で長期間更新されていないファイルを特定する
   - リポジトリ: ${repo_path}

各ステップの結果を総合して、リポジトリの健全性レポートを作成してください。
ホットスポットの改善提案や、メンテナンスが必要なファイルの一覧も含めてください。`,
        },
      },
    ],
  };
}

export function registerAssessHealth(server: McpServer): void {
  server.registerPrompt(
    "assess-health",
    {
      title: "リポジトリ健全性評価",
      description:
        "リポジトリの健全性を評価し、ホットスポットや放置ファイルを特定する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
      },
    },
    (args) => buildAssessHealthPrompt(args),
  );
}
