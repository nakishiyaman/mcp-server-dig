import { describe, it, expect } from "vitest";
import { detectVelocityAnomalies, type VelocityBucket } from "./velocity-anomaly.js";

describe("detectVelocityAnomalies", () => {
  it("空配列で異常なし", () => {
    const result = detectVelocityAnomalies([]);
    expect(result.anomalies).toHaveLength(0);
    expect(result.totalBuckets).toBe(0);
    expect(result.mean).toBe(0);
    expect(result.stddev).toBe(0);
  });

  it("均一データで異常なし", () => {
    const buckets: VelocityBucket[] = [
      { period: "2024-01", count: 10 },
      { period: "2024-02", count: 10 },
      { period: "2024-03", count: 10 },
      { period: "2024-04", count: 10 },
    ];
    const result = detectVelocityAnomalies(buckets);
    expect(result.anomalies).toHaveLength(0);
    expect(result.stddev).toBe(0);
  });

  it("スパイク1件を検出する", () => {
    const buckets: VelocityBucket[] = [
      { period: "2024-01", count: 10 },
      { period: "2024-02", count: 10 },
      { period: "2024-03", count: 10 },
      { period: "2024-04", count: 10 },
      { period: "2024-05", count: 10 },
      { period: "2024-06", count: 10 },
      { period: "2024-07", count: 10 },
      { period: "2024-08", count: 10 },
      { period: "2024-09", count: 10 },
      { period: "2024-10", count: 10 },
      { period: "2024-11", count: 100 },
    ];
    const result = detectVelocityAnomalies(buckets);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
    const spike = result.anomalies.find((a) => a.direction === "spike");
    expect(spike).toBeDefined();
    expect(spike!.period).toBe("2024-11");
    expect(spike!.magnitude).toBeGreaterThan(2);
  });

  it("ドロップ1件を検出する", () => {
    const buckets: VelocityBucket[] = [
      { period: "2024-01", count: 50 },
      { period: "2024-02", count: 50 },
      { period: "2024-03", count: 50 },
      { period: "2024-04", count: 50 },
      { period: "2024-05", count: 50 },
      { period: "2024-06", count: 0 },
    ];
    const result = detectVelocityAnomalies(buckets);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
    const drop = result.anomalies.find((a) => a.direction === "drop");
    expect(drop).toBeDefined();
    expect(drop!.period).toBe("2024-06");
    expect(drop!.magnitude).toBeGreaterThan(2);
  });

  it("stddev=0で異常なし（ゼロ除算防止）", () => {
    const buckets: VelocityBucket[] = [
      { period: "2024-01", count: 5 },
      { period: "2024-02", count: 5 },
    ];
    const result = detectVelocityAnomalies(buckets);
    expect(result.anomalies).toHaveLength(0);
    expect(result.stddev).toBe(0);
    expect(result.mean).toBe(5);
  });

  it("threshold=1 vs threshold=2で検出数が変わる", () => {
    // Data with moderate variation
    const buckets: VelocityBucket[] = [
      { period: "2024-01", count: 10 },
      { period: "2024-02", count: 12 },
      { period: "2024-03", count: 8 },
      { period: "2024-04", count: 11 },
      { period: "2024-05", count: 25 },
    ];
    const resultT1 = detectVelocityAnomalies(buckets, 1);
    const resultT2 = detectVelocityAnomalies(buckets, 2);
    expect(resultT1.anomalies.length).toBeGreaterThanOrEqual(resultT2.anomalies.length);
    expect(resultT1.thresholdSigma).toBe(1);
    expect(resultT2.thresholdSigma).toBe(2);
  });
});
