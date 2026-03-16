import { test } from "@fast-check/vitest";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";

import { AnalysisCache, buildCacheKey } from "./cache.js";

describe("AnalysisCache: TTLプロパティテスト", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.prop([fc.string(), fc.string()])(
    "set直後のgetが同じ値を返す（TTL内）",
    (key, value) => {
      const cache = new AnalysisCache({ ttlMs: 60_000 });
      cache.set(key, value);
      expect(cache.get(key)).toBe(value);
    },
  );

  test.prop([fc.string(), fc.string(), fc.integer({ min: 1, max: 100_000 })])(
    "TTL超過エントリがget()で返されない",
    (key, value, ttlMs) => {
      const cache = new AnalysisCache({ ttlMs });
      cache.set(key, value);
      vi.advanceTimersByTime(ttlMs + 1);
      expect(cache.get(key)).toBeUndefined();
    },
  );
});

describe("AnalysisCache: 容量・堅牢性プロパティテスト", () => {
  test.prop([
    fc.integer({ min: 1, max: 20 }),
    fc.array(
      fc.tuple(fc.string(), fc.string()),
      { minLength: 1, maxLength: 50 },
    ),
  ])("エントリ数がmaxEntriesを超えない", (maxEntries, entries) => {
    const cache = new AnalysisCache({ maxEntries });
    for (const [key, value] of entries) {
      cache.set(key, value);
    }
    expect(cache.stats().size).toBeLessThanOrEqual(maxEntries);
  });

  test.prop([
    fc.array(
      fc.tuple(
        fc.constantFrom("get", "set"),
        fc.string(),
        fc.string(),
      ),
      { minLength: 0, maxLength: 100 },
    ),
  ])("ランダムget/set操作列でクラッシュしない", (ops) => {
    const cache = new AnalysisCache();
    for (const [op, key, value] of ops) {
      if (op === "set") {
        cache.set(key, value);
      } else {
        cache.get(key);
      }
    }
    const stats = cache.stats();
    expect(stats.size).toBeGreaterThanOrEqual(0);
    expect(stats.hits).toBeGreaterThanOrEqual(0);
    expect(stats.misses).toBeGreaterThanOrEqual(0);
  });
});

describe("buildCacheKey: プロパティテスト", () => {
  test.prop([
    fc.string(),
    fc.string(),
    fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
  ])("同一引数で同一結果（決定性）", (funcName, repoPath, options) => {
    const key1 = buildCacheKey(funcName, repoPath, options);
    const key2 = buildCacheKey(funcName, repoPath, options);
    expect(key1).toBe(key2);
  });

  test.prop([
    fc.string(),
    fc.string(),
    fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
  ])("異なるfunctionNameで異なるキー", (funcName, repoPath, options) => {
    const key1 = buildCacheKey(funcName, repoPath, options);
    const key2 = buildCacheKey(funcName + "_different", repoPath, options);
    expect(key1).not.toBe(key2);
  });
});
