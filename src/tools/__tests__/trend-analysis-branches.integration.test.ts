/**
 * Unit tests for git_trend_analysis presentation functions.
 * Covers all metric × direction combinations in formatMetricValue and interpretTrend.
 */
import { describe, it, expect } from "vitest";
import { formatMetricValue, interpretTrend } from "../git-trend-analysis.js";
import { classifyDirection } from "../../analysis/trend-analysis.js";

describe("formatMetricValue", () => {
  it("hotspots — N files changed", () => {
    expect(formatMetricValue("hotspots", 5)).toBe("5 files changed");
  });

  it("churn — N lines churned (with locale formatting)", () => {
    expect(formatMetricValue("churn", 1234)).toContain("lines churned");
  });

  it("contributors — N contributors", () => {
    expect(formatMetricValue("contributors", 3)).toBe("3 contributors");
  });

  it("commit_count — N commits", () => {
    expect(formatMetricValue("commit_count", 42)).toBe("42 commits");
  });

  it("unknown metric — fallback to string", () => {
    expect(formatMetricValue("unknown", 7)).toBe("7");
  });
});

describe("interpretTrend", () => {
  it("stable direction — metric名を含むstableメッセージ", () => {
    expect(interpretTrend("hotspots", "stable")).toContain("stable");
    expect(interpretTrend("hotspots", "stable")).toContain("hotspots");
  });

  it("hotspots worsening — more files changing", () => {
    expect(interpretTrend("hotspots", "worsening")).toContain(
      "More files are being changed",
    );
  });

  it("hotspots improving — fewer files changing", () => {
    expect(interpretTrend("hotspots", "improving")).toContain(
      "Fewer files are being changed",
    );
  });

  it("churn worsening — code churn increasing", () => {
    expect(interpretTrend("churn", "worsening")).toContain(
      "Code churn is increasing",
    );
  });

  it("churn improving — code churn decreasing", () => {
    expect(interpretTrend("churn", "improving")).toContain(
      "Code churn is decreasing",
    );
  });

  it("contributors worsening — contributor count declining", () => {
    expect(interpretTrend("contributors", "worsening")).toContain(
      "Contributor count is declining",
    );
  });

  it("contributors improving — more contributors active", () => {
    expect(interpretTrend("contributors", "improving")).toContain(
      "More contributors are active",
    );
  });

  it("commit_count improving — activity increasing", () => {
    expect(interpretTrend("commit_count", "improving")).toContain(
      "Commit activity is increasing",
    );
  });

  it("commit_count non-improving — activity decreasing", () => {
    expect(interpretTrend("commit_count", "worsening")).toContain(
      "Commit activity is decreasing",
    );
  });

  it("unknown metric — fallback format", () => {
    expect(interpretTrend("unknown", "worsening")).toBe("unknown: worsening");
  });
});

describe("classifyDirection", () => {
  it("hotspots: positive delta → worsening", () => {
    expect(classifyDirection("hotspots", 5, 10)).toBe("worsening");
  });

  it("hotspots: negative delta → improving", () => {
    expect(classifyDirection("hotspots", -5, 10)).toBe("improving");
  });

  it("churn: positive delta → worsening", () => {
    expect(classifyDirection("churn", 50, 100)).toBe("worsening");
  });

  it("churn: negative delta → improving", () => {
    expect(classifyDirection("churn", -50, 100)).toBe("improving");
  });

  it("contributors: positive delta → improving", () => {
    expect(classifyDirection("contributors", 3, 5)).toBe("improving");
  });

  it("contributors: negative delta → worsening", () => {
    expect(classifyDirection("contributors", -3, 5)).toBe("worsening");
  });

  it("commit_count: positive delta → improving", () => {
    expect(classifyDirection("commit_count", 10, 20)).toBe("improving");
  });

  it("commit_count: negative delta → stable", () => {
    expect(classifyDirection("commit_count", -10, 20)).toBe("stable");
  });

  it("小さなdelta（<10%）→ stable", () => {
    expect(classifyDirection("hotspots", 1, 100)).toBe("stable");
  });

  it("delta=0 → stable", () => {
    expect(classifyDirection("churn", 0, 0)).toBe("stable");
  });

  it("baseValue=0でdelta>0 → threshold=0でstable判定をスキップ", () => {
    expect(classifyDirection("hotspots", 5, 0)).toBe("worsening");
  });
});
