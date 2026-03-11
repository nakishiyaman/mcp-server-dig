import { describe, it, expect } from "vitest";
import { computeBusFactor, getDirectoryAtDepth } from "./knowledge-map.js";

describe("getDirectoryAtDepth", () => {
  it("depth=1でトップレベルディレクトリを返す", () => {
    expect(getDirectoryAtDepth("src/tools/foo.ts", 1)).toBe("src");
  });

  it("depth=2で2階層目まで返す", () => {
    expect(getDirectoryAtDepth("src/tools/foo.ts", 2)).toBe("src/tools");
  });

  it("ファイルがdepthより浅い場合は親ディレクトリを返す", () => {
    expect(getDirectoryAtDepth("README.md", 1)).toBe(".");
  });

  it("1階層のファイルでdepth=1の場合はルートを返す", () => {
    expect(getDirectoryAtDepth("file.txt", 1)).toBe(".");
  });

  it("depth=1でネストされたパスのトップを返す", () => {
    expect(getDirectoryAtDepth("a/b/c/d.ts", 1)).toBe("a");
  });
});

describe("computeBusFactor", () => {
  it("1人が全コミットの場合はバス係数1", () => {
    expect(computeBusFactor([10], 10)).toBe(1);
  });

  it("2人が均等の場合はバス係数1", () => {
    // 50-50 split: first person has 50%, which is not > 50%, so need 2
    expect(computeBusFactor([5, 5], 10)).toBe(2);
  });

  it("1人が過半数の場合はバス係数1", () => {
    expect(computeBusFactor([6, 4], 10)).toBe(1);
  });

  it("3人で均等の場合はバス係数2", () => {
    // 34, 33, 33: first = 34%, second cumulative = 67% > 50%
    expect(computeBusFactor([34, 33, 33], 100)).toBe(2);
  });

  it("空の場合はバス係数0", () => {
    expect(computeBusFactor([], 0)).toBe(0);
  });
});
