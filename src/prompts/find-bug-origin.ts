import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildFindBugOriginPrompt(args: {
  repo_path: string;
  good_ref: string;
  bad_ref?: string;
  file_path?: string;
  symptom?: string;
}): GetPromptResult {
  const {
    repo_path,
    good_ref,
    bad_ref = "HEAD",
    file_path,
    symptom,
  } = args;

  const filePathSection = file_path
    ? `\n対象ファイル: ${file_path}`
    : "";
  const symptomSection = symptom
    ? `\nバグの症状: ${symptom}`
    : "";

  const filePathArg = file_path
    ? `\n   - file_path: ${file_path}`
    : "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のバグの導入コミットを特定してください。

対象リポジトリ: ${repo_path}
正常リファレンス（good）: ${good_ref}
不具合リファレンス（bad）: ${bad_ref}${filePathSection}${symptomSection}

## 調査手順

1. **git_bisect_guide** で範囲内のコミットを事前分析する
   - repo_path: ${repo_path}
   - good_ref: ${good_ref}
   - bad_ref: ${bad_ref}${filePathArg}

2. ホットスポットとコミット一覧から、バグ導入の可能性が高いコミットを絞り込む
   - 変更頻度の高いファイル、${symptom ? `「${symptom}」に関連する` : "症状に関連する"}変更に注目する

3. 疑わしいコミットについて **git_commit_show** で詳細を確認する
   - diff内容から、バグを導入した変更を特定する

4. 必要に応じて **git_blame_context** で現在のコードの来歴を確認する${file_path ? `\n   - file_path: ${file_path}` : ""}

## 報告形式

- バグ導入コミット（ハッシュ、著者、日時、メッセージ）
- バグを導入した具体的な変更内容
- 推奨される修正方針`,
        },
      },
    ],
  };
}

export function registerFindBugOrigin(server: McpServer): void {
  server.registerPrompt(
    "find-bug-origin",
    {
      title: "バグ原因特定",
      description:
        "git bisect事前分析を活用してバグ導入コミットを特定する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        good_ref: z
          .string()
          .describe(
            "バグが存在しない正常なリファレンス（コミットハッシュ、タグ、ブランチ）",
          ),
        bad_ref: z
          .string()
          .optional()
          .describe(
            "バグが存在するリファレンス（デフォルト: HEAD）",
          ),
        file_path: z
          .string()
          .optional()
          .describe("バグに関連するファイルパス（任意）"),
        symptom: z
          .string()
          .optional()
          .describe("バグの症状（任意 — 調査の精度が上がる）"),
      },
    },
    (args) => buildFindBugOriginPrompt(args),
  );
}
