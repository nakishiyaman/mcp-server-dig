import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { analyzeHotspotsAndChurn } from "./combined-log-analysis.js";
import { analyzeContributors } from "./contributors.js";
import { analyzeTrend } from "./trend-analysis.js";

const execFileAsync = promisify(execFile);

async function git(
  cwd: string,
  args: string[],
  env?: Record<string, string>,
): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    env: { ...process.env, ...env },
  });
  return stdout;
}

describe("until パラメータによる区間フィルタリング", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "mcp-dig-until-"));

    await git(repoDir, ["init"]);
    await git(repoDir, ["config", "user.email", "test@example.com"]);
    await git(repoDir, ["config", "user.name", "Test User"]);

    const janDate = "2024-01-15T12:00:00";
    const febDate = "2024-02-15T12:00:00";
    const marDate = "2024-03-15T12:00:00";

    // 1月のコミット
    await writeFile(join(repoDir, "jan.txt"), "january content");
    await git(repoDir, ["add", "jan.txt"]);
    await git(repoDir, ["commit", "-m", "January commit", `--date=${janDate}`], {
      GIT_COMMITTER_DATE: janDate,
    });

    // 2月のコミット
    await writeFile(join(repoDir, "feb.txt"), "february content");
    await git(repoDir, ["add", "feb.txt"]);
    await git(repoDir, ["commit", "-m", "February commit", `--date=${febDate}`], {
      GIT_COMMITTER_DATE: febDate,
    });

    // 3月のコミット
    await writeFile(join(repoDir, "mar.txt"), "march content");
    await git(repoDir, ["add", "mar.txt"]);
    await git(repoDir, ["commit", "-m", "March commit", `--date=${marDate}`], {
      GIT_COMMITTER_DATE: marDate,
    });
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it("analyzeHotspotsAndChurn が until で区間を制限する", async () => {
    const result = await analyzeHotspotsAndChurn(repoDir, {
      since: "2024-02-01",
      until: "2024-02-28",
    });

    // 2月のコミットのみ → feb.txt の1ファイルだけ
    expect(result.hotspots).toHaveLength(1);
    expect(result.hotspots[0].filePath).toBe("feb.txt");
  });

  it("analyzeContributors が until で区間を制限する", async () => {
    const result = await analyzeContributors(repoDir, {
      since: "2024-02-01",
      until: "2024-02-28",
    });

    expect(result.totalCommits).toBe(1);
  });

  it("analyzeHotspotsAndChurn で until なしは since 以降すべて含む", async () => {
    const result = await analyzeHotspotsAndChurn(repoDir, {
      since: "2024-02-01",
    });

    // 2月+3月 → feb.txt, mar.txt の2ファイル
    expect(result.hotspots).toHaveLength(2);
  });

  it("analyzeTrend の各期間が区間値を返す", async () => {
    // 各月に1コミットずつなので、月単位で分割すると各期間の commit_count は同程度になるはず
    // （累積だと後の期間ほど大きくなる）
    const result = await analyzeTrend(repoDir, {
      metric: "commit_count",
      periodLength: "month",
      numPeriods: 3,
    });

    // 期間データが返ること
    expect(result.periods.length).toBe(3);

    // 各期間に until が設定されていること
    for (const period of result.periods) {
      expect(period.until).toBeDefined();
      expect(period.since).toBeDefined();
    }
  });
});
