import { describe, it, expect } from "vitest";
import {
  parseTags,
  analyzeSemver,
  computeIntervals,
  detectTrend,
  extractPrefixes,
  type TagEntry,
} from "./git-tag-analysis.js";

describe("parseTags", () => {
  it("パイプ区切りの出力をパースする", () => {
    const output = "v1.0.0|2024-01-01T00:00:00+00:00|tag\nv1.1.0|2024-02-01T00:00:00+00:00|commit";
    const tags = parseTags(output);

    expect(tags).toHaveLength(2);
    expect(tags[0]).toEqual({ name: "v1.0.0", date: "2024-01-01T00:00:00+00:00", objectType: "tag" });
    expect(tags[1]).toEqual({ name: "v1.1.0", date: "2024-02-01T00:00:00+00:00", objectType: "commit" });
  });

  it("空の出力で空配列を返す", () => {
    expect(parseTags("")).toHaveLength(0);
    expect(parseTags("  ")).toHaveLength(0);
  });

  it("不完全な行をスキップする", () => {
    const output = "v1.0.0|2024-01-01T00:00:00+00:00|tag\nbadline\nv1.1.0|2024-02-01|commit";
    const tags = parseTags(output);
    expect(tags).toHaveLength(2);
  });
});

describe("analyzeSemver", () => {
  it("major/minor/patch bumpを正しく分類する", () => {
    const tags: TagEntry[] = [
      { name: "v0.1.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v0.2.0", date: "2024-02-01T00:00:00Z", objectType: "tag" },
      { name: "v0.2.1", date: "2024-03-01T00:00:00Z", objectType: "tag" },
      { name: "v1.0.0", date: "2024-04-01T00:00:00Z", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);

    expect(dist.patch).toBeGreaterThanOrEqual(1); // v0.1.0 (initial) + v0.2.1
    expect(dist.minor).toBe(1); // v0.2.0
    expect(dist.major).toBe(1); // v1.0.0
    expect(dist.nonSemver).toBe(0);
  });

  it("pre-releaseタグを分類する", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0-rc.1", date: "2024-02-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0-rc.2", date: "2024-02-15T00:00:00Z", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);

    expect(dist.preRelease).toBe(2);
  });

  it("non-semverタグをカウントする", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "release-2024", date: "2024-02-01T00:00:00Z", objectType: "tag" },
      { name: "beta", date: "2024-03-01T00:00:00Z", objectType: "tag" },
    ];
    const dist = analyzeSemver(tags);

    expect(dist.nonSemver).toBe(2);
  });

  it("空のタグリストで全てゼロを返す", () => {
    const dist = analyzeSemver([]);
    expect(dist.major).toBe(0);
    expect(dist.minor).toBe(0);
    expect(dist.patch).toBe(0);
    expect(dist.preRelease).toBe(0);
    expect(dist.nonSemver).toBe(0);
  });
});

describe("computeIntervals", () => {
  it("リリース間隔の統計を計算する", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0", date: "2024-01-11T00:00:00Z", objectType: "tag" },
      { name: "v1.2.0", date: "2024-01-31T00:00:00Z", objectType: "tag" },
    ];
    const intervals = computeIntervals(tags);

    expect(intervals).not.toBeNull();
    expect(intervals!.count).toBe(2);
    expect(intervals!.minDays).toBe(10);
    expect(intervals!.maxDays).toBe(20);
    expect(intervals!.medianDays).toBe(15);
    expect(intervals!.meanDays).toBe(15);
  });

  it("タグが1つ以下の場合nullを返す", () => {
    expect(computeIntervals([])).toBeNull();
    expect(computeIntervals([
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
    ])).toBeNull();
  });

  it("日付なしのタグをフィルタする", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0", date: "", objectType: "tag" },
    ];
    expect(computeIntervals(tags)).toBeNull();
  });
});

describe("detectTrend", () => {
  it("4未満のタグでnullを返す", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0", date: "2024-02-01T00:00:00Z", objectType: "tag" },
      { name: "v1.2.0", date: "2024-03-01T00:00:00Z", objectType: "tag" },
    ];
    expect(detectTrend(tags)).toBeNull();
  });

  it("等間隔でstableを返す", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0", date: "2024-02-01T00:00:00Z", objectType: "tag" },
      { name: "v1.2.0", date: "2024-03-01T00:00:00Z", objectType: "tag" },
      { name: "v1.3.0", date: "2024-04-01T00:00:00Z", objectType: "tag" },
      { name: "v1.4.0", date: "2024-05-01T00:00:00Z", objectType: "tag" },
    ];
    expect(detectTrend(tags)).toBe("stable");
  });

  it("間隔が縮小するとacceleratingを返す", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0", date: "2024-04-01T00:00:00Z", objectType: "tag" }, // 90 days
      { name: "v1.2.0", date: "2024-07-01T00:00:00Z", objectType: "tag" }, // 91 days
      { name: "v1.3.0", date: "2024-07-15T00:00:00Z", objectType: "tag" }, // 14 days
      { name: "v1.4.0", date: "2024-07-25T00:00:00Z", objectType: "tag" }, // 10 days
    ];
    expect(detectTrend(tags)).toBe("accelerating");
  });

  it("間隔が拡大するとdeceleratingを返す", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "2024-01-01T00:00:00Z", objectType: "tag" },
      { name: "v1.1.0", date: "2024-01-10T00:00:00Z", objectType: "tag" }, // 9 days
      { name: "v1.2.0", date: "2024-01-20T00:00:00Z", objectType: "tag" }, // 10 days
      { name: "v1.3.0", date: "2024-04-20T00:00:00Z", objectType: "tag" }, // 90 days
      { name: "v1.4.0", date: "2024-07-20T00:00:00Z", objectType: "tag" }, // 91 days
    ];
    expect(detectTrend(tags)).toBe("decelerating");
  });
});

describe("extractPrefixes", () => {
  it("タグ名のprefix分布を返す", () => {
    const tags: TagEntry[] = [
      { name: "v1.0.0", date: "", objectType: "tag" },
      { name: "v1.1.0", date: "", objectType: "tag" },
      { name: "release-1.0", date: "", objectType: "tag" },
    ];
    const prefixes = extractPrefixes(tags);

    expect(prefixes["v"]).toBe(2);
    expect(prefixes["release"]).toBe(1);
  });

  it("数字始まりのタグで(none)を返す", () => {
    const tags: TagEntry[] = [
      { name: "20240101", date: "", objectType: "tag" },
    ];
    const prefixes = extractPrefixes(tags);

    expect(prefixes["(none)"]).toBe(1);
  });

  it("空のリストで空オブジェクトを返す", () => {
    expect(extractPrefixes([])).toEqual({});
  });
});
