import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildOnboardAreaPrompt(args: {
  repo_path: string;
  directory: string;
}): GetPromptResult {
  const { repo_path, directory } = args;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリの特定ディレクトリについて、オンボーディングガイドを作成してください。

対象リポジトリ: ${repo_path}
対象ディレクトリ: ${directory}

## 調査手順

1. **git_knowledge_map** でディレクトリの知識所有者とバス係数を確認する
   - リポジトリ: ${repo_path}
   - パスパターン: ${directory}

2. **git_contributor_patterns** でこの領域の主要な貢献者を特定する
   - リポジトリ: ${repo_path}
   - パスパターン: ${directory}

3. **git_hotspots** でこの領域の変更が集中しているファイルを確認する
   - リポジトリ: ${repo_path}
   - パスパターン: ${directory}

4. 上位ホットスポットファイルについて **git_file_history** で変更履歴を確認する
   - リポジトリ: ${repo_path}

## 出力フォーマット

調査結果を以下の構成でまとめてください:
- **領域概要**: ファイル数、主要なファイル、役割
- **知識所有者**: 誰が主にこの領域を担当しているか
- **変更の活発さ**: 最近の開発状況とホットスポット
- **重要な変更履歴**: 主要ファイルのマイルストーンとなる変更
- **質問先**: この領域について質問すべき人（知識マップ準拠）
- **注意点**: バス係数が低い箇所、変更頻度が高い箇所`,
        },
      },
    ],
  };
}

export function registerOnboardArea(server: McpServer): void {
  server.registerPrompt(
    "onboard-area",
    {
      title: "領域別オンボーディング",
      description:
        "特定ディレクトリの知識所有者・貢献者・変更履歴を調査し、領域別のオンボーディングガイドを作成する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        directory: z.string().describe("調査対象ディレクトリのパス（例: src/tools/）"),
      },
    },
    (args) => buildOnboardAreaPrompt(args),
  );
}
