import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function buildPrepareKnowledgeTransferPrompt(args: {
  repo_path: string;
  departing_author: string;
  timeline?: string;
}): GetPromptResult {
  const { repo_path, departing_author, timeline } = args;

  const timelineSection = timeline
    ? `\n移行タイムライン: ${timeline}`
    : "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `以下の開発者の離脱に備えたナレッジトランスファー計画を作成してください。

対象リポジトリ: ${repo_path}
離脱予定者: ${departing_author}${timelineSection}

## 調査手順

1. **git_offboarding_simulation** で離脱の影響をシミュレーションする
   - repo_path: ${repo_path}
   - author: ${departing_author}
   - 離脱後のbus factor変化とSPOF（単一障害点）を特定

2. **git_knowledge_map** で知識分布を把握する
   - repo_path: ${repo_path}
   - ${departing_author} が主要所有者であるディレクトリを特定

3. **git_knowledge_loss_risk** で知識喪失リスクを評価する
   - repo_path: ${repo_path}
   - 回復コストの高い領域を優先順位付け

4. **git_author_timeline** で活動履歴を確認する
   - repo_path: ${repo_path}
   - ${departing_author} の活動範囲と専門領域を特定

5. **git_contributor_network** でコラボレーション関係を分析する
   - repo_path: ${repo_path}
   - ${departing_author} と最も協力関係の強い開発者（知識移転先候補）を特定

## 報告形式

- 影響サマリー（離脱による全体的な影響度: HIGH / MEDIUM / LOW）
- 知識移転が必要な領域一覧（優先度順）
  - ディレクトリ / 機能領域
  - 現在のbus factor（before → after）
  - 回復コスト（HIGH / MEDIUM / LOW）
  - 推奨移転先（コラボレーション履歴に基づく候補者）
- ナレッジトランスファー計画
  - フェーズ1（即座）: ドキュメント化が必要な暗黙知
  - フェーズ2（短期）: ペアプログラミング / コードウォークスルー対象
  - フェーズ3（中期）: 段階的な所有権移転
- リスク軽減策（移転完了前に離脱した場合の対策）`,
        },
      },
    ],
  };
}

export function registerPrepareKnowledgeTransfer(server: McpServer): void {
  server.registerPrompt(
    "prepare-knowledge-transfer",
    {
      title: "ナレッジトランスファー準備",
      description:
        "開発者離脱時のナレッジトランスファー計画を作成する（影響分析・知識マッピング・移転計画）",
      argsSchema: {
        repo_path: z.string().describe("Gitリポジトリの絶対パス"),
        departing_author: z
          .string()
          .describe("離脱予定者の名前またはメールアドレス"),
        timeline: z
          .string()
          .optional()
          .describe("移行タイムライン（任意 — 例: '2週間後に離脱予定'）"),
      },
    },
    (args) => buildPrepareKnowledgeTransferPrompt(args),
  );
}
