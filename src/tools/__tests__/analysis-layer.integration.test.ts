import { describe, it, expect } from "vitest";
import { analyzeHotspots } from "../../analysis/hotspots.js";
import { analyzeChurn } from "../../analysis/churn.js";
import { analyzeContributors } from "../../analysis/contributors.js";
import { analyzeCoChanges } from "../../analysis/co-changes.js";
import { analyzeFileStaleness } from "../../analysis/staleness.js";
import { getRepoDir } from "./helpers.js";

describe("analyzeHotspots", () => {
  it("ファイルの変更頻度を分析する", async () => {
    const hotspots = await analyzeHotspots(getRepoDir(), { topN: 10 });

    expect(hotspots.length).toBeGreaterThanOrEqual(1);
    const indexTs = hotspots.find((h) => h.filePath === "src/index.ts");
    expect(indexTs).toBeDefined();
    expect(indexTs!.changeCount).toBe(4);
  });
});

describe("analyzeChurn", () => {
  it("ファイルのコードチャーンを分析する", async () => {
    const churnFiles = await analyzeChurn(getRepoDir(), { topN: 10 });

    expect(churnFiles.length).toBeGreaterThanOrEqual(1);
    const indexTs = churnFiles.find((f) => f.filePath === "src/index.ts");
    expect(indexTs).toBeDefined();
    expect(indexTs!.totalChurn).toBeGreaterThan(0);
  });
});

describe("analyzeContributors", () => {
  it("コントリビューター分布を分析する", async () => {
    const { stats, totalCommits } = await analyzeContributors(getRepoDir());

    expect(totalCommits).toBe(5);
    expect(stats).toHaveLength(2);

    const alice = stats.find((s) => s.name === "Alice");
    expect(alice).toBeDefined();
    expect(alice!.lastActive).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe("analyzeCoChanges", () => {
  it("共変更ファイルを分析する", async () => {
    const { results, totalCommits } = await analyzeCoChanges(
      getRepoDir(),
      "src/index.ts",
      { minCoupling: 1 },
    );

    expect(totalCommits).toBe(4);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const utils = results.find((r) => r.filePath === "src/utils.ts");
    expect(utils).toBeDefined();
    expect(utils!.coChangeCount).toBe(2);
  });
});

describe("analyzeFileStaleness", () => {
  it("ファイルの最終更新日と経過日数を返す", async () => {
    const result = await analyzeFileStaleness(getRepoDir(), "src/index.ts");

    expect(result.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(result.daysSinceLastChange).toBeGreaterThanOrEqual(0);
  });
});
