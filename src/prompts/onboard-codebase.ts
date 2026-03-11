import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildOnboardCodebasePrompt(args: {
  repo_path: string;
}): GetPromptResult {
  const { repo_path } = args;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリの全体像を把握し、新規参入者向けのオンボーディングガイドを作成してください。

対象リポジトリ: ${repo_path}

## 調査手順

1. **git_repo_health** でリポジトリ全体の健全性と基本統計を確認する
   - リポジトリ: ${repo_path}

2. **git_contributor_patterns** で主要な貢献者と担当領域を把握する
   - リポジトリ: ${repo_path}

3. **git_hotspots** で開発が活発な領域を特定する
   - リポジトリ: ${repo_path}

4. **git_tag_list** でリリース履歴とバージョニングを確認する
   - リポジトリ: ${repo_path}

5. **git_stale_files** で長期間更新されていないファイルを特定する
   - リポジトリ: ${repo_path}

## 出力フォーマット

調査結果を以下の構成でまとめてください:
- **プロジェクト概要**: 規模、主要言語、ディレクトリ構成
- **主要な貢献者**: 誰がどの領域を担当しているか
- **開発の活発な領域**: ホットスポットと最近の開発動向
- **リリース履歴**: バージョニング方針とリリース頻度
- **注意が必要な領域**: 放置ファイル、バス係数が低い領域
- **新規参入者へのアドバイス**: 最初に読むべきファイル、質問すべき人`,
        },
      },
    ],
  };
}

export function registerOnboardCodebase(server: McpServer): void {
  server.registerPrompt(
    "onboard-codebase",
    {
      title: "コードベース・オンボーディング",
      description:
        "新規参入者向けにリポジトリの全体像を調査し、オンボーディングガイドを作成する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
      },
    },
    (args) => buildOnboardCodebasePrompt(args),
  );
}
