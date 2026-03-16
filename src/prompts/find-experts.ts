import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildFindExpertsPrompt(args: {
  repo_path: string;
  area: string;
  context?: string;
}): GetPromptResult {
  const { repo_path, area, context } = args;

  const contextSection = context
    ? `\n調査の背景: ${context}`
    : "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下の領域のエキスパートを特定してください。

対象リポジトリ: ${repo_path}
調査対象: ${area}${contextSection}

## 調査手順

1. **git_knowledge_map** でディレクトリ別の知識所有者を把握する
   - repo_path: ${repo_path}
   - path_pattern: ${area}

2. **git_author_timeline** で候補者の活動期間と最終活動日を確認する
   - repo_path: ${repo_path}
   - path_pattern: ${area}

3. **git_blame_context** で現在のコードの著者を確認する
   - repo_path: ${repo_path}
   - 主要ファイルについて実行

4. **git_contributor_network** でコラボレーション関係を分析する
   - repo_path: ${repo_path}
   - path_pattern: ${area}

## 報告形式

- エキスパートランキング（所有権%、コミット数、最終活動日でソート）
- 各エキスパートの専門領域と活動状況（active / fading / inactive）
- 推奨連絡順序（活動状況と知識カバレッジを考慮）
- 知識リスク評価（bus factorが低い領域の警告）`,
        },
      },
    ],
  };
}

export function registerFindExperts(server: McpServer): void {
  server.registerPrompt(
    "find-experts",
    {
      title: "エキスパート発見",
      description:
        "特定領域の知識所有者を発見し、活動状況とコラボレーション関係を分析する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        area: z
          .string()
          .describe("調査対象のパスまたはトピック（例: 'src/tools/', '認証モジュール'）"),
        context: z
          .string()
          .optional()
          .describe("調査の背景情報（任意 — 結果の優先順位付けに活用される）"),
      },
    },
    (args) => buildFindExpertsPrompt(args),
  );
}
