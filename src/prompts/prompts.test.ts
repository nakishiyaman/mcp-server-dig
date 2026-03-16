import { describe, it, expect } from "vitest";
import { buildInvestigateCodePrompt } from "./investigate-code.js";
import { buildReviewPrPrompt } from "./review-pr.js";
import { buildAssessHealthPrompt } from "./assess-health.js";
import { buildTraceChangePrompt } from "./trace-change.js";
import { buildOnboardCodebasePrompt } from "./onboard-codebase.js";
import { buildFindBugOriginPrompt } from "./find-bug-origin.js";
import { buildTechnicalDebtPrompt } from "./technical-debt.js";
import { buildOnboardAreaPrompt } from "./onboard-area.js";
import { buildAiAgentSafetyPrompt } from "./ai-agent-safety.js";
import { buildPlanRefactoringPrompt } from "./plan-refactoring.js";
import { buildAssessChangeRiskPrompt } from "./assess-change-risk.js";
import { buildIdentifyTechDebtPrompt } from "./identify-tech-debt.js";
import { buildDiagnosePerformancePrompt } from "./diagnose-performance.js";
import { buildPostIncidentReviewPrompt } from "./post-incident-review.js";
import { buildPlanReleasePrompt } from "./plan-release.js";
import { buildFindExpertsPrompt } from "./find-experts.js";

describe("investigate-code prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildInvestigateCodePrompt({
      repo_path: "/path/to/repo",
      file_path: "src/index.ts",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("src/index.ts");
    expect(text).toContain("git_why");
    expect(text).toContain("git_pickaxe");
    expect(text).toContain("git_file_history");
  });

  it("line_rangeが指定された場合メッセージに含まれる", () => {
    const result = buildInvestigateCodePrompt({
      repo_path: "/path/to/repo",
      file_path: "src/index.ts",
      line_range: "10,20",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("lines 10,20");
    expect(text).toContain("行範囲: 10,20");
  });

  it("line_rangeが未指定の場合行範囲の記述がない", () => {
    const result = buildInvestigateCodePrompt({
      repo_path: "/path/to/repo",
      file_path: "src/index.ts",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).not.toContain("行範囲:");
  });
});

describe("review-pr prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildReviewPrPrompt({
      repo_path: "/path/to/repo",
      base_ref: "main",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("main");
    expect(text).toContain("git_review_prep");
    expect(text).toContain("git_file_risk_profile");
  });

  it("head_refが指定された場合メッセージに含まれる", () => {
    const result = buildReviewPrPrompt({
      repo_path: "/path/to/repo",
      base_ref: "main",
      head_ref: "feat/new-feature",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("feat/new-feature");
    expect(text).toContain("head_ref: feat/new-feature");
  });

  it("head_refが未指定の場合HEADが表示される", () => {
    const result = buildReviewPrPrompt({
      repo_path: "/path/to/repo",
      base_ref: "main",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("HEAD");
    expect(text).not.toContain("head_ref:");
  });
});

describe("assess-health prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildAssessHealthPrompt({
      repo_path: "/path/to/repo",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("git_repo_health");
    expect(text).toContain("git_hotspots");
    expect(text).toContain("git_stale_files");
  });
});

describe("trace-change prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildTraceChangePrompt({
      repo_path: "/path/to/repo",
      search_term: "calculateTotal",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("calculateTotal");
    expect(text).toContain("git_pickaxe");
    expect(text).toContain("git_commit_show");
  });

  it("search_termが手順説明に埋め込まれる", () => {
    const result = buildTraceChangePrompt({
      repo_path: "/path/to/repo",
      search_term: "handleError",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("「handleError」を追加/削除したコミットを検索");
    expect(text).toContain("「handleError」がいつ・誰によって");
  });
});

describe("onboard-codebase prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildOnboardCodebasePrompt({
      repo_path: "/path/to/repo",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("git_repo_health");
    expect(text).toContain("git_contributor_patterns");
    expect(text).toContain("git_hotspots");
    expect(text).toContain("git_tag_list");
    expect(text).toContain("git_stale_files");
  });
});

describe("find-bug-origin prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildFindBugOriginPrompt({
      repo_path: "/path/to/repo",
      good_ref: "v1.0.0",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("v1.0.0");
    expect(text).toContain("HEAD");
    expect(text).toContain("git_bisect_guide");
    expect(text).toContain("git_commit_show");
    expect(text).toContain("git_blame_context");
  });

  it("オプション引数が指定された場合メッセージに含まれる", () => {
    const result = buildFindBugOriginPrompt({
      repo_path: "/path/to/repo",
      good_ref: "v1.0.0",
      bad_ref: "v2.0.0",
      file_path: "src/main.ts",
      symptom: "NullPointerException",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("v2.0.0");
    expect(text).toContain("src/main.ts");
    expect(text).toContain("NullPointerException");
    expect(text).toContain("「NullPointerException」に関連する");
  });

  it("symptomが未指定の場合デフォルト表現が使われる", () => {
    const result = buildFindBugOriginPrompt({
      repo_path: "/path/to/repo",
      good_ref: "v1.0.0",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("症状に関連する");
    expect(text).not.toContain("バグの症状:");
  });
});

describe("technical-debt prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildTechnicalDebtPrompt({
      repo_path: "/path/to/repo",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("git_hotspots");
    expect(text).toContain("git_code_churn");
    expect(text).toContain("git_stale_files");
    expect(text).toContain("git_knowledge_map");
  });
});

describe("ai-agent-safety prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildAiAgentSafetyPrompt({
      repo_path: "/path/to/repo",
      target_files: "src/index.ts,src/utils.ts",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("src/index.ts");
    expect(text).toContain("src/utils.ts");
    expect(text).toContain("git_file_risk_profile");
    expect(text).toContain("git_impact_analysis");
    expect(text).toContain("git_related_changes");
    expect(text).toContain("git_conflict_history");
  });

  it("ファイルリストがリスト形式で表示される", () => {
    const result = buildAiAgentSafetyPrompt({
      repo_path: "/path/to/repo",
      target_files: "src/a.ts,src/b.ts,src/c.ts",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("- src/a.ts");
    expect(text).toContain("- src/b.ts");
    expect(text).toContain("- src/c.ts");
  });

  it("単一ファイルでも正しく処理される", () => {
    const result = buildAiAgentSafetyPrompt({
      repo_path: "/path/to/repo",
      target_files: "src/index.ts",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("- src/index.ts");
    expect(text).toContain("リスク評価");
  });

  it("リスクレベルの出力形式が含まれる", () => {
    const result = buildAiAgentSafetyPrompt({
      repo_path: "/path/to/repo",
      target_files: "src/index.ts",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("HIGH / MEDIUM / LOW");
    expect(text).toContain("推奨事項");
  });
});

describe("onboard-area prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildOnboardAreaPrompt({
      repo_path: "/path/to/repo",
      directory: "src/tools/",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("src/tools/");
    expect(text).toContain("git_knowledge_map");
    expect(text).toContain("git_contributor_patterns");
    expect(text).toContain("git_hotspots");
    expect(text).toContain("git_file_history");
  });
});

describe("plan-refactoring prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildPlanRefactoringPrompt({
      repo_path: "/path/to/repo",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("git_refactor_candidates");
    expect(text).toContain("git_file_risk_profile");
    expect(text).toContain("git_why");
    expect(text).toContain("git_impact_analysis");
  });

  it("path_patternが指定された場合メッセージに含まれる", () => {
    const result = buildPlanRefactoringPrompt({
      repo_path: "/path/to/repo",
      path_pattern: "src/",
      top_n: "5",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("path_pattern: src/");
    expect(text).toContain("top_n: 5");
  });
});

describe("assess-change-risk prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildAssessChangeRiskPrompt({
      repo_path: "/path/to/repo",
      file_path: "src/index.ts",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("src/index.ts");
    expect(text).toContain("git_file_risk_profile");
    expect(text).toContain("git_impact_analysis");
    expect(text).toContain("git_knowledge_map");
    expect(text).toContain("git_why");
  });

  it("change_descriptionが指定された場合メッセージに含まれる", () => {
    const result = buildAssessChangeRiskPrompt({
      repo_path: "/path/to/repo",
      file_path: "src/index.ts",
      change_description: "認証ロジックのリファクタリング",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("認証ロジックのリファクタリング");
  });

  it("change_descriptionが未指定の場合変更内容の記述がない", () => {
    const result = buildAssessChangeRiskPrompt({
      repo_path: "/path/to/repo",
      file_path: "src/index.ts",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).not.toContain("変更内容:");
  });
});

describe("identify-tech-debt prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildIdentifyTechDebtPrompt({
      repo_path: "/path/to/repo",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("git_refactor_candidates");
    expect(text).toContain("git_complexity_hotspots");
    expect(text).toContain("git_file_risk_profile");
    expect(text).toContain("git_code_age");
    expect(text).toContain("git_knowledge_loss_risk");
  });

  it("path_patternが指定された場合メッセージに含まれる", () => {
    const result = buildIdentifyTechDebtPrompt({
      repo_path: "/path/to/repo",
      path_pattern: "src/",
      top_n: "5",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("path_pattern: src/");
    expect(text).toContain("top_n: 5");
  });

  it("path_patternが未指定の場合path_filterの記述がない", () => {
    const result = buildIdentifyTechDebtPrompt({
      repo_path: "/path/to/repo",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).not.toContain("path_pattern:");
  });

  it("デフォルトのtop_nが10である", () => {
    const result = buildIdentifyTechDebtPrompt({
      repo_path: "/path/to/repo",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("top_n: 10");
  });
});

describe("diagnose-performance prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildDiagnosePerformancePrompt({
      repo_path: "/path/to/repo",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("git_repo_statistics");
    expect(text).toContain("git_hotspots");
    expect(text).toContain("git_stale_files");
    expect(text).toContain("git_trend_analysis");
    expect(text).toContain("git_dependency_map");
  });

  it("path_patternが指定された場合メッセージに含まれる", () => {
    const result = buildDiagnosePerformancePrompt({
      repo_path: "/path/to/repo",
      path_pattern: "src/",
      top_n: "5",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("path_pattern: src/");
    expect(text).toContain("top_n_files: 5");
  });

  it("path_patternが未指定の場合path_filterの記述がない", () => {
    const result = buildDiagnosePerformancePrompt({
      repo_path: "/path/to/repo",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).not.toContain("path_pattern:");
  });

  it("デフォルトのtop_nが10である", () => {
    const result = buildDiagnosePerformancePrompt({
      repo_path: "/path/to/repo",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("top_n_files: 10");
  });
});

describe("post-incident-review prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildPostIncidentReviewPrompt({
      repo_path: "/path/to/repo",
      incident_date: "2024-03-15",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("2024-03-15");
    expect(text).toContain("git_search_commits");
    expect(text).toContain("git_diff_context");
    expect(text).toContain("git_revert_analysis");
    expect(text).toContain("git_impact_analysis");
  });

  it("suspected_filesが指定された場合ファイルリストが表示される", () => {
    const result = buildPostIncidentReviewPrompt({
      repo_path: "/path/to/repo",
      incident_date: "2024-03-15",
      suspected_files: "src/auth.ts,src/db.ts",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("- src/auth.ts");
    expect(text).toContain("- src/db.ts");
    expect(text).toContain("git_file_risk_profile");
  });

  it("suspected_filesが未指定の場合疑わしいファイルの記述がない", () => {
    const result = buildPostIncidentReviewPrompt({
      repo_path: "/path/to/repo",
      incident_date: "2024-03-15",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).not.toContain("疑わしいファイル:");
  });

  it("レポート形式の出力指示が含まれる", () => {
    const result = buildPostIncidentReviewPrompt({
      repo_path: "/path/to/repo",
      incident_date: "2024-03-15",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("根本原因分析");
    expect(text).toContain("再発防止策");
    expect(text).toContain("HIGH / MEDIUM / LOW");
  });
});

describe("plan-release prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildPlanReleasePrompt({
      repo_path: "/path/to/repo",
      base_ref: "v0.35.0",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("v0.35.0");
    expect(text).toContain("git_release_comparison");
    expect(text).toContain("git_revert_analysis");
    expect(text).toContain("git_file_risk_profile");
    expect(text).toContain("git_coordination_bottleneck");
    expect(text).toContain("git_trend_analysis");
  });

  it("head_ref指定時にメッセージに含まれる", () => {
    const result = buildPlanReleasePrompt({
      repo_path: "/path/to/repo",
      base_ref: "v0.35.0",
      head_ref: "feat/new-feature",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("feat/new-feature");
    expect(text).toContain("head_ref: feat/new-feature");
  });

  it("head_ref未指定でHEADがデフォルトとして使われる", () => {
    const result = buildPlanReleasePrompt({
      repo_path: "/path/to/repo",
      base_ref: "v0.35.0",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("HEAD");
    // head_ref: HEAD は手順内に出現するが、ユーザー指定の head_ref 行は出ない
    expect(text).not.toContain("head_ref: feat/");
  });

  it("release_date指定時にメッセージに含まれる", () => {
    const result = buildPlanReleasePrompt({
      repo_path: "/path/to/repo",
      base_ref: "v0.35.0",
      release_date: "2026-04-01",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("2026-04-01");
    expect(text).toContain("リリース予定日");
    expect(text).toContain("スケジュールリスク");
  });
});

describe("find-experts prompt", () => {
  it("必須引数がメッセージに埋め込まれる", () => {
    const result = buildFindExpertsPrompt({
      repo_path: "/path/to/repo",
      area: "src/tools/",
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("/path/to/repo");
    expect(text).toContain("src/tools/");
    expect(text).toContain("git_knowledge_map");
    expect(text).toContain("git_author_timeline");
    expect(text).toContain("git_blame_context");
    expect(text).toContain("git_contributor_network");
  });

  it("contextが指定された場合メッセージに含まれる", () => {
    const result = buildFindExpertsPrompt({
      repo_path: "/path/to/repo",
      area: "src/auth/",
      context: "セキュリティレビューの担当者を探している",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("セキュリティレビューの担当者を探している");
    expect(text).toContain("調査の背景:");
  });

  it("contextが未指定の場合背景情報の記述がない", () => {
    const result = buildFindExpertsPrompt({
      repo_path: "/path/to/repo",
      area: "src/tools/",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).not.toContain("調査の背景:");
  });

  it("報告形式にエキスパートランキングと推奨連絡順序が含まれる", () => {
    const result = buildFindExpertsPrompt({
      repo_path: "/path/to/repo",
      area: "src/",
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("エキスパートランキング");
    expect(text).toContain("推奨連絡順序");
    expect(text).toContain("知識リスク評価");
  });
});
