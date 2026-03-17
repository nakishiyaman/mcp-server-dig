import { describe, it, expect } from "vitest";
import { formatPeriodKey, generatePeriodRange } from "./period-utils.js";

describe("formatPeriodKey", () => {
  it("dailyで日付キーを返す", () => {
    expect(formatPeriodKey("2024-03-15T10:00:00+09:00", "daily")).toBe("2024-03-15");
  });

  it("monthlyで年月キーを返す", () => {
    expect(formatPeriodKey("2024-03-15T10:00:00+09:00", "monthly")).toBe("2024-03");
  });

  it("weeklyでISO週の月曜日を返す", () => {
    // 2024-03-15 is a Friday → Monday is 2024-03-11
    expect(formatPeriodKey("2024-03-15T10:00:00+09:00", "weekly")).toBe("2024-03-11");
  });

  it("weeklyで日曜日の場合前の月曜日を返す", () => {
    // 2024-03-17 is a Sunday → Monday is 2024-03-11
    expect(formatPeriodKey("2024-03-17T10:00:00+09:00", "weekly")).toBe("2024-03-11");
  });

  it("weeklyで月曜日の場合その日を返す", () => {
    // 2024-03-11 is a Monday
    expect(formatPeriodKey("2024-03-11T10:00:00+09:00", "weekly")).toBe("2024-03-11");
  });

  it("未知のgranularityでdailyフォールバックする", () => {
    expect(formatPeriodKey("2024-03-15T10:00:00+09:00", "yearly")).toBe("2024-03-15");
  });

  it("ISO 8601日付文字列を正しく処理する", () => {
    expect(formatPeriodKey("2024-01-01T00:00:00Z", "daily")).toBe("2024-01-01");
  });

  it("月のゼロパディングが正しい", () => {
    expect(formatPeriodKey("2024-01-05T10:00:00Z", "monthly")).toBe("2024-01");
  });
});

describe("generatePeriodRange", () => {
  it("monthlyで月次期間範囲を生成する", () => {
    const range = generatePeriodRange("2024-01-15T00:00:00Z", "2024-04-10T00:00:00Z", "monthly");
    expect(range).toEqual(["2024-01", "2024-02", "2024-03", "2024-04"]);
  });

  it("weeklyで週次期間範囲を生成する", () => {
    const range = generatePeriodRange("2024-03-11T00:00:00Z", "2024-03-25T00:00:00Z", "weekly");
    expect(range).toEqual(["2024-03-11", "2024-03-18", "2024-03-25"]);
  });

  it("dailyで日次期間範囲を生成する", () => {
    const range = generatePeriodRange("2024-03-01T00:00:00Z", "2024-03-03T00:00:00Z", "daily");
    expect(range).toEqual(["2024-03-01", "2024-03-02", "2024-03-03"]);
  });

  it("start > end で空配列を返す", () => {
    const range = generatePeriodRange("2024-06-01T00:00:00Z", "2024-01-01T00:00:00Z", "monthly");
    expect(range).toEqual([]);
  });

  it("同一月でmonthlyの場合1要素を返す", () => {
    const range = generatePeriodRange("2024-03-01T00:00:00Z", "2024-03-31T00:00:00Z", "monthly");
    expect(range).toEqual(["2024-03"]);
  });

  it("年跨ぎのmonthly範囲を正しく生成する", () => {
    const range = generatePeriodRange("2023-11-01T00:00:00Z", "2024-02-01T00:00:00Z", "monthly");
    expect(range).toEqual(["2023-11", "2023-12", "2024-01", "2024-02"]);
  });
});
