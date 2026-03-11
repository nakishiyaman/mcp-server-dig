import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildInvestigateCodePrompt(args: {
  repo_path: string;
  file_path: string;
  line_range?: string;
}): GetPromptResult {
  const { repo_path, file_path, line_range } = args;
  const target = line_range
    ? `${file_path} (lines ${line_range})`
    : file_path;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のコードを調査してください。

対象リポジトリ: ${repo_path}
対象ファイル: ${target}

## 調査手順

1. **git_why** で対象行の来歴を把握する
   - リポジトリ: ${repo_path}
   - ファイル: ${file_path}${line_range ? `\n   - 行範囲: ${line_range}` : ""}

2. **git_pickaxe** で関連する文字列の変更履歴を追跡する
   - 重要な識別子（関数名、変数名など）を検索キーワードにする

3. **git_file_history** でファイル全体の変遷を確認する
   - リポジトリ: ${repo_path}
   - ファイル: ${file_path}

各ステップの結果を総合して、このコードがなぜ現在の形になっているのかを説明してください。`,
        },
      },
    ],
  };
}

export function registerInvestigateCode(server: McpServer): void {
  server.registerPrompt(
    "investigate-code",
    {
      title: "コード調査",
      description:
        "指定ファイル・行範囲のコードがなぜ現在の形になっているかを調査する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        file_path: z
          .string()
          .describe("リポジトリ内のファイルの相対パス"),
        line_range: z
          .string()
          .optional()
          .describe("調査対象の行範囲（例: 10,20）"),
      },
    },
    (args) => buildInvestigateCodePrompt(args),
  );
}
