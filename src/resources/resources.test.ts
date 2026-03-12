import { describe, it, expect } from "vitest";
import { getToolGuideContent } from "./tool-guide.js";

describe("tool-guide resource", () => {
  const content = getToolGuideContent();

  it("全25ツール名が含まれる", () => {
    const toolNames = [
      "git_blame_context",
      "git_file_history",
      "git_commit_show",
      "git_diff_context",
      "git_pickaxe",
      "git_search_commits",
      "git_related_changes",
      "git_contributor_patterns",
      "git_code_churn",
      "git_hotspots",
      "git_stale_files",
      "git_merge_base",
      "git_tag_list",
      "git_knowledge_map",
      "git_dependency_map",
      "git_bisect_guide",
      "git_rename_history",
      "git_commit_graph",
      "git_branch_activity",
      "git_author_timeline",
      "git_commit_frequency",
      "git_file_risk_profile",
      "git_repo_health",
      "git_review_prep",
      "git_why",
    ];

    for (const name of toolNames) {
      expect(content).toContain(name);
    }
  });

  it("カテゴリ別一覧セクションが含まれる", () => {
    expect(content).toContain("データ取得ツール（22個）");
    expect(content).toContain("組み合わせ分析ツール（4個）");
    expect(content).toContain("ワークフロー統合ツール（2個）");
  });

  it("連携パターンセクションが含まれる", () => {
    expect(content).toContain("連携パターン");
    expect(content).toContain("コード考古学");
    expect(content).toContain("PRレビュー");
    expect(content).toContain("リポジトリ健全性評価");
    expect(content).toContain("変更追跡");
  });

  it("Markdown形式で返される", () => {
    expect(content).toMatch(/^# /m);
    expect(content).toContain("| ");
  });
});
