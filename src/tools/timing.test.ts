import { describe, expect, it } from "vitest";
import { startTimer } from "./timing.js";

describe("startTimer", () => {
  it("経過時間をミリ秒で返す", async () => {
    const elapsed = startTimer();
    // 少し待つ
    await new Promise((r) => setTimeout(r, 50));
    const ms = elapsed();
    expect(ms).toBeGreaterThanOrEqual(40);
    expect(ms).toBeLessThan(500);
  });

  it("整数値を返す", () => {
    const elapsed = startTimer();
    const ms = elapsed();
    expect(Number.isInteger(ms)).toBe(true);
  });

  it("複数回呼び出し可能", async () => {
    const elapsed = startTimer();
    const first = elapsed();
    await new Promise((r) => setTimeout(r, 20));
    const second = elapsed();
    expect(second).toBeGreaterThan(first);
  });
});
