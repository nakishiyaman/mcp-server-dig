import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildPostIncidentReviewPrompt(args: {
  repo_path: string;
  incident_date: string;
  suspected_files?: string;
}): GetPromptResult {
  const { repo_path, incident_date, suspected_files } = args;

  const fileList = suspected_files
    ? suspected_files
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f)
    : [];

  const fileSection = fileList.length > 0
    ? `\n疑わしいファイル:\n${fileList.map((f) => `- ${f}`).join("\n")}`
    : "";

  const fileFilter = fileList.length > 0
    ? `\n   - path_pattern: ${fileList[0].split("/").slice(0, -1).join("/") || fileList[0]}`
    : "";

  const fileRiskSteps = fileList.length > 0
    ? fileList
        .map(
          (f, i) =>
            `${i + 4}. **git_file_risk_profile** で疑わしいファイルのリスク評価
   - リポジトリ: ${repo_path}
   - file_path: ${f}
   - 変更頻度・知識集中度・churnを確認`,
        )
        .join("\n\n")
    : `4. **git_file_risk_profile** で影響範囲のファイルリスクを評価
   - リポジトリ: ${repo_path}
   - Step 2-3で特定されたファイルについてリスク評価を行う`;

  const nextStep = fileList.length > 0 ? fileList.length + 4 : 5;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下のリポジトリでポストインシデントレビューを実施してください。

対象リポジトリ: ${repo_path}
インシデント発生日: ${incident_date}${fileSection}

## 手順

1. **git_search_commits** でインシデント前後のコミットを調査する
   - リポジトリ: ${repo_path}
   - since: インシデント日の1週間前
   - キーワード: "fix", "revert", "hotfix", "rollback" 等で検索
   - インシデントに関連する可能性のあるコミットを特定する

2. **git_diff_context** でインシデント前後の変更差分を確認する
   - リポジトリ: ${repo_path}
   - インシデント前後の適切なrefを指定して差分を確認${fileFilter}
   - 何がいつ変わったかを時系列で把握する

3. **git_revert_analysis** でリバートパターンを分析する
   - リポジトリ: ${repo_path}
   - since: インシデント日の1ヶ月前
   - リバートされた変更がインシデントと関連していないか確認する

${fileRiskSteps}

${nextStep}. **git_impact_analysis** で変更の影響範囲を分析する
   - リポジトリ: ${repo_path}
   - インシデントに関連するファイルのblast radiusを確認
   - co-changeパターンから影響が波及した可能性のある領域を特定

## 出力

以下の形式でポストインシデントレビューレポートをまとめてください:
- **タイムライン**: インシデント前後の変更を時系列で整理
- **根本原因分析**: インシデントを引き起こした変更の特定
- **影響範囲**: 影響を受けたファイル・ディレクトリ
- **リバートパターン**: 過去のリバート傾向と今回のインシデントの関連
- **リスク評価**: 関連ファイルのリスクレベル（HIGH / MEDIUM / LOW）
- **再発防止策**: 推奨アクション（コードレビュー強化、テスト追加、モニタリング改善等）`,
        },
      },
    ],
  };
}

export function registerPostIncidentReview(server: McpServer): void {
  server.registerPrompt(
    "post-incident-review",
    {
      title: "ポストインシデントレビュー",
      description:
        "インシデント前後のコミット履歴・リバートパターン・変更リスクを分析し、根本原因と再発防止策を導出する",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        incident_date: z
          .string()
          .describe('インシデント発生日（例: "2024-03-15"）'),
        suspected_files: z
          .string()
          .optional()
          .describe(
            '疑わしいファイルのカンマ区切りリスト（例: "src/auth.ts,src/db.ts"）',
          ),
      },
    },
    (args) => buildPostIncidentReviewPrompt(args),
  );
}
