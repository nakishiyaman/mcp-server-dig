import { describe, it, expect } from "vitest";
import { buildInvestigateCodePrompt } from "./investigate-code.js";
import { buildReviewPrPrompt } from "./review-pr.js";
import { buildAssessHealthPrompt } from "./assess-health.js";
import { buildTraceChangePrompt } from "./trace-change.js";

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
