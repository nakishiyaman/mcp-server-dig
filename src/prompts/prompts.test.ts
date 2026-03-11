import { describe, it, expect } from "vitest";
import { buildInvestigateCodePrompt } from "./investigate-code.js";
import { buildReviewPrPrompt } from "./review-pr.js";
import { buildAssessHealthPrompt } from "./assess-health.js";
import { buildTraceChangePrompt } from "./trace-change.js";
import { buildOnboardCodebasePrompt } from "./onboard-codebase.js";
import { buildFindBugOriginPrompt } from "./find-bug-origin.js";

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
