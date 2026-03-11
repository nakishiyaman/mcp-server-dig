import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildTraceChangePrompt(args: {
  repo_path: string;
  search_term: string;
}): GetPromptResult {
  const { repo_path, search_term } = args;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下の変更を追跡してください。

対象リポジトリ: ${repo_path}
検索キーワード: ${search_term}

## 追跡手順

1. **git_pickaxe** で「${search_term}」を追加/削除したコミットを検索する
   - リポジトリ: ${repo_path}
   - search_term: ${search_term}

2. 見つかったコミットについて **git_commit_show** で詳細を確認する
   - 各コミットのdiff、メッセージ、著者を確認

検索結果を時系列で整理し、「${search_term}」がいつ・誰によって・なぜ追加/変更/削除されたかを説明してください。`,
        },
      },
    ],
  };
}

export function registerTraceChange(server: McpServer): void {
  server.registerPrompt(
    "trace-change",
    {
      title: "変更追跡",
      description:
        "特定の文字列の追加・変更・削除履歴を追跡する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        search_term: z
          .string()
          .describe("追跡する文字列（関数名、変数名など）"),
      },
    },
    (args) => buildTraceChangePrompt(args),
  );
}
