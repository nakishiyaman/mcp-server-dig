import { describe, it, expect } from "vitest";
import { predictStability } from "./stability-prediction.js";

describe("predictStability", () => {
  it("全シグナルが良好な場合スコア100でLOWリスクを返す", () => {
    const result = predictStability({
      revertRatio: 0,
      churnTrendRatio: 0.5,
      codeAgeDays: 365,
      conflictRatio: 0,
    });
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe("LOW");
    expect(result.penalties.revert).toBe(0);
    expect(result.penalties.churnTrend).toBe(0);
    expect(result.penalties.codeAge).toBe(0);
    expect(result.penalties.conflict).toBe(0);
  });

  it("高revert率でスコアが下がる", () => {
    const result = predictStability({
      revertRatio: 0.05,
      churnTrendRatio: 1.0,
      codeAgeDays: 100,
      conflictRatio: 0,
    });
    expect(result.penalties.revert).toBe(30);
    expect(result.score).toBe(70);
    expect(result.riskLevel).toBe("LOW");
  });

  it("churnトレンド増加でスコアが下がる", () => {
    const result = predictStability({
      revertRatio: 0,
      churnTrendRatio: 2.0,
      codeAgeDays: 100,
      conflictRatio: 0,
    });
    expect(result.penalties.churnTrend).toBe(25);
    expect(result.score).toBe(75);
    expect(result.riskLevel).toBe("LOW");
  });

  it("若いコード年齢でペナルティがつく", () => {
    const recent = predictStability({
      revertRatio: 0,
      churnTrendRatio: 1.0,
      codeAgeDays: 3,
      conflictRatio: 0,
    });
    expect(recent.penalties.codeAge).toBe(20);

    const medium = predictStability({
      revertRatio: 0,
      churnTrendRatio: 1.0,
      codeAgeDays: 15,
      conflictRatio: 0,
    });
    expect(medium.penalties.codeAge).toBe(10);

    const older = predictStability({
      revertRatio: 0,
      churnTrendRatio: 1.0,
      codeAgeDays: 60,
      conflictRatio: 0,
    });
    expect(older.penalties.codeAge).toBe(5);
  });

  it("高コンフリクト率でスコアが下がる", () => {
    const result = predictStability({
      revertRatio: 0,
      churnTrendRatio: 1.0,
      codeAgeDays: 100,
      conflictRatio: 0.05,
    });
    expect(result.penalties.conflict).toBe(25);
    expect(result.score).toBe(75);
  });

  it("全シグナルが悪い場合スコアが0以上に制限される", () => {
    const result = predictStability({
      revertRatio: 0.1,
      churnTrendRatio: 3.0,
      codeAgeDays: 1,
      conflictRatio: 0.2,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.riskLevel).toBe("HIGH");
  });
});
