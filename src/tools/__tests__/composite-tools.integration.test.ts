import { describe, it, expect } from "vitest";
import { analyzeHotspots } from "../../analysis/hotspots.js";
import { analyzeChurn } from "../../analysis/churn.js";
import { analyzeContributors } from "../../analysis/contributors.js";
import { analyzeCoChanges } from "../../analysis/co-changes.js";
import { analyzeFileStaleness } from "../../analysis/staleness.js";
import { getRepoDir } from "./helpers.js";

describe("git_file_risk_profile (end-to-end)", () => {
  it("ファイルのリスクプロファイルを生成する", async () => {
    const repoDir = getRepoDir();
    const hotspots = await analyzeHotspots(repoDir, { topN: 100 });
    const churnFiles = await analyzeChurn(repoDir, { topN: 100 });
    const contributorData = await analyzeContributors(repoDir, {
      pathPattern: "src/index.ts",
    });
    const coChangeData = await analyzeCoChanges(repoDir, "src/index.ts", {
      minCoupling: 1,
    });
    const stalenessData = await analyzeFileStaleness(repoDir, "src/index.ts");

    // All analyses should return data
    expect(hotspots.length).toBeGreaterThan(0);
    expect(churnFiles.length).toBeGreaterThan(0);
    expect(contributorData.stats.length).toBeGreaterThan(0);
    expect(coChangeData.results.length).toBeGreaterThan(0);
    expect(stalenessData.daysSinceLastChange).toBeGreaterThanOrEqual(0);

    // The target file should appear in hotspots and churn
    const fileHotspot = hotspots.find((h) => h.filePath === "src/index.ts");
    expect(fileHotspot).toBeDefined();
    const fileChurn = churnFiles.find((f) => f.filePath === "src/index.ts");
    expect(fileChurn).toBeDefined();
  });
});

describe("git_repo_health (end-to-end)", () => {
  it("リポジトリの健全性サマリーを生成する", async () => {
    const repoDir = getRepoDir();
    // Run the same analyses the tool would run
    const [hotspots, churnFiles, contributorData] = await Promise.all([
      analyzeHotspots(repoDir, { topN: 10 }),
      analyzeChurn(repoDir, { topN: 10 }),
      analyzeContributors(repoDir),
    ]);

    // Should have data from the test repo
    expect(hotspots.length).toBeGreaterThan(0);
    expect(churnFiles.length).toBeGreaterThan(0);
    expect(contributorData.stats.length).toBe(2);
    expect(contributorData.totalCommits).toBe(5);
  });
});
