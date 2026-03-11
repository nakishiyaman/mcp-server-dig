import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildReviewPrPrompt(args: {
  repo_path: string;
  base_ref: string;
  head_ref?: string;
}): GetPromptResult {
  const { repo_path, base_ref, head_ref } = args;
  const headDisplay = head_ref ?? "HEAD";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のPRをレビューしてください。

対象リポジトリ: ${repo_path}
ベースブランチ: ${base_ref}
ヘッドブランチ: ${headDisplay}

## レビュー手順

1. **git_review_prep** で変更概要とリスク情報を取得する
   - リポジトリ: ${repo_path}
   - base_ref: ${base_ref}${head_ref ? `\n   - head_ref: ${head_ref}` : ""}

2. リスクが高いと判定されたファイルについて **git_file_risk_profile** で詳細を確認する
   - 各ファイルの変更頻度、著者数、churn等を確認

レビュー結果として、変更の概要、リスクの高いファイル、注意すべき点をまとめてください。`,
        },
      },
    ],
  };
}

export function registerReviewPr(server: McpServer): void {
  server.registerPrompt(
    "review-pr",
    {
      title: "PRレビュー",
      description:
        "PRの変更概要とリスク情報を取得し、レビューを支援する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        base_ref: z.string().describe("ベースブランチ（例: main）"),
        head_ref: z
          .string()
          .optional()
          .describe("ヘッドブランチ（省略時: HEAD）"),
      },
    },
    (args) => buildReviewPrPrompt(args),
  );
}
