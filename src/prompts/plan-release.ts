import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildPlanReleasePrompt(args: {
  repo_path: string;
  base_ref: string;
  head_ref?: string;
  release_date?: string;
}): GetPromptResult {
  const { repo_path, base_ref, release_date } = args;
  const head_ref = args.head_ref ?? "HEAD";

  const headRefLine = args.head_ref
    ? `\n   - head_ref: ${args.head_ref}`
    : "";

  const releaseDateSection = release_date
    ? `\nリリース予定日: ${release_date}`
    : "";

  const releaseDateOutput = release_date
    ? `- **スケジュールリスク**: リリース予定日（${release_date}）に対する進捗と残リスク\n`
    : "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリでリリース計画レビューを実施してください。

対象リポジトリ: ${repo_path}
ベースRef: ${base_ref}
ヘッドRef: ${head_ref}${releaseDateSection}

## 手順

1. **git_release_comparison** でベースとヘッドのメトリクス比較
   - リポジトリ: ${repo_path}
   - base_ref: ${base_ref}${headRefLine}
   - head_ref: ${head_ref}
   - hotspots/churn/contributors/bus factorの変化を把握する

2. **git_revert_analysis** でリバートパターンを分析する
   - リポジトリ: ${repo_path}
   - since: ${base_ref}のタグ日付を基準に設定
   - リバートされた変更が品質リスクを示していないか確認する

3. **git_file_risk_profile** で上位変更ファイルのリスク評価
   - リポジトリ: ${repo_path}
   - Step 1で特定された変更頻度上位のファイルについてリスク評価を行う
   - 変更頻度・知識集中度・churnを確認

4. **git_coordination_bottleneck** で調整コストの高い場所を特定
   - リポジトリ: ${repo_path}
   - depth: 1
   - 多人数が頻繁に変更する領域を確認し、マージリスクを評価する

5. **git_trend_analysis** で健全性トレンドを分析する
   - リポジトリ: ${repo_path}
   - メトリクスの改善/悪化傾向を確認する

## 出力

以下の形式でリリース計画レビューレポートをまとめてください:
- **変更サマリー**: ${base_ref} → ${head_ref} の変更規模と主要な変更領域
- **品質リスク**: リバートパターン・高リスクファイルの一覧
- **調整リスク**: 調整コストの高いディレクトリと関連する開発者
- **健全性トレンド**: メトリクスの改善/悪化傾向
${releaseDateOutput}- **推奨アクション**: リリース前に対処すべき項目（HIGH / MEDIUM / LOW）`,
        },
      },
    ],
  };
}

export function registerPlanRelease(server: McpServer): void {
  server.registerPrompt(
    "plan-release",
    {
      title: "リリース計画レビュー",
      description:
        "リリース間のメトリクス比較・リバートパターン・ファイルリスク・調整コスト・健全性トレンドを分析し、リリース判断を支援する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        base_ref: z
          .string()
          .describe('比較のベースref（例: "v0.35.0", "main"）'),
        head_ref: z
          .string()
          .optional()
          .describe('比較のヘッドref（デフォルト: HEAD）'),
        release_date: z
          .string()
          .optional()
          .describe('リリース予定日（例: "2026-04-01"）'),
      },
    },
    (args) => buildPlanReleasePrompt(args),
  );
}
