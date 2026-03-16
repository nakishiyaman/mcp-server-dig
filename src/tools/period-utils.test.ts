import { describe, it, expect } from "vitest";
import { formatPeriodKey } from "./period-utils.js";

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
