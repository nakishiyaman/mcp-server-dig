import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnalysisCache, buildCacheKey } from "./cache.js";

describe("AnalysisCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("キャッシュにset/getできる", () => {
    const cache = new AnalysisCache();
    cache.set("key1", { data: "value" });
    expect(cache.get("key1")).toEqual({ data: "value" });
  });

  it("存在しないキーはundefinedを返す", () => {
    const cache = new AnalysisCache();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("TTL期限切れのエントリはundefinedを返す", () => {
    const cache = new AnalysisCache({ ttlMs: 1000 });
    cache.set("key1", "value");
    expect(cache.get("key1")).toBe("value");

    vi.advanceTimersByTime(1001);
    expect(cache.get("key1")).toBeUndefined();
  });

  it("TTL内のエントリはヒットする", () => {
    const cache = new AnalysisCache({ ttlMs: 5000 });
    cache.set("key1", "value");

    vi.advanceTimersByTime(4999);
    expect(cache.get("key1")).toBe("value");
  });

  it("最大エントリ数を超えるとLRU evictionが発動する", () => {
    const cache = new AnalysisCache({ maxEntries: 2 });
    cache.set("key1", "value1");
    vi.advanceTimersByTime(10);
    cache.set("key2", "value2");
    vi.advanceTimersByTime(10);

    // Access key1 to make it more recently used
    cache.get("key1");
    vi.advanceTimersByTime(10);

    // key2 should be evicted (LRU)
    cache.set("key3", "value3");
    expect(cache.get("key1")).toBe("value1");
    expect(cache.get("key2")).toBeUndefined();
    expect(cache.get("key3")).toBe("value3");
  });

  it("clearですべてのエントリが削除される", () => {
    const cache = new AnalysisCache();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.clear();
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });

  it("statsがhit/miss/size/evictionsを正しく返す", () => {
    const cache = new AnalysisCache({ maxEntries: 1 });
    cache.set("key1", "value1");
    cache.get("key1"); // hit
    cache.get("nonexistent"); // miss

    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);

    vi.advanceTimersByTime(10);
    cache.set("key2", "value2"); // evicts key1
    expect(cache.stats().evictions).toBe(1);
  });
});

describe("buildCacheKey", () => {
  it("同じ引数で同じキーを生成する", () => {
    const key1 = buildCacheKey("func", "/repo", { a: 1, b: "x" });
    const key2 = buildCacheKey("func", "/repo", { a: 1, b: "x" });
    expect(key1).toBe(key2);
  });

  it("オプションのキー順序に依存しない", () => {
    const key1 = buildCacheKey("func", "/repo", { a: 1, b: 2 });
    const key2 = buildCacheKey("func", "/repo", { b: 2, a: 1 });
    expect(key1).toBe(key2);
  });

  it("undefinedのオプションは無視される", () => {
    const key1 = buildCacheKey("func", "/repo", { a: 1 });
    const key2 = buildCacheKey("func", "/repo", { a: 1, b: undefined });
    expect(key1).toBe(key2);
  });

  it("異なる関数名で異なるキーを生成する", () => {
    const key1 = buildCacheKey("func1", "/repo", {});
    const key2 = buildCacheKey("func2", "/repo", {});
    expect(key1).not.toBe(key2);
  });

  it("異なるリポジトリで異なるキーを生成する", () => {
    const key1 = buildCacheKey("func", "/repo1", {});
    const key2 = buildCacheKey("func", "/repo2", {});
    expect(key1).not.toBe(key2);
  });
});
