import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { parseBlameOutput, parseDiffStatOutput } from "../../git/parsers.js";
import { analyzeHotspots } from "../../analysis/hotspots.js";
import { analyzeChurn } from "../../analysis/churn.js";
import { analyzeHotspotsAndChurn } from "../../analysis/combined-log-analysis.js";
import { analyzeContributors } from "../../analysis/contributors.js";
import { analyzeFileStaleness } from "../../analysis/staleness.js";
import { successResponse } from "../response.js";
import { getRepoDir } from "./helpers.js";

describe("エッジケース — blame", () => {
  it("空ファイルのblameは空ブロックを返す", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "--", "src/empty.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);
    expect(blocks).toHaveLength(0);
  });

  it("存在しないファイルへのblameはエラーを返す", async () => {
    await expect(
      execGit(["blame", "--porcelain", "--", "nonexistent.ts"], getRepoDir()),
    ).rejects.toThrow();
  });

  it("end_lineのみ指定でblameが動作する", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "-L", "1,2", "--", "src/index.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].startLine).toBe(1);
  });
});

describe("エッジケース — バイナリファイル", () => {
  it("バイナリファイルがnumstat系でchurn 0として処理される", async () => {
    const churnFiles = await analyzeChurn(getRepoDir(), { topN: 100 });
    const binary = churnFiles.find((f) => f.filePath === "assets/logo.png");
    expect(binary).toBeDefined();
    expect(binary!.totalChurn).toBe(0);
    expect(binary!.insertions).toBe(0);
    expect(binary!.deletions).toBe(0);
  });

  it("バイナリファイルがhotspots分析でカウントされる", async () => {
    const hotspots = await analyzeHotspots(getRepoDir(), { topN: 100 });
    const binary = hotspots.find((h) => h.filePath === "assets/logo.png");
    expect(binary).toBeDefined();
    expect(binary!.changeCount).toBeGreaterThanOrEqual(1);
  });

  it("バイナリファイルがcombined分析で正しく処理される", async () => {
    const result = await analyzeHotspotsAndChurn(getRepoDir(), {
      hotspotsTopN: 100,
      churnTopN: 100,
    });
    const binaryChurn = result.churn.find(
      (f) => f.filePath === "assets/logo.png",
    );
    expect(binaryChurn).toBeDefined();
    expect(binaryChurn!.totalChurn).toBe(0);
  });

  it("diff --statのBin行が正しくスキップされる", async () => {
    // Find the commit that added the binary file
    const log = await execGit(
      ["log", "--oneline", "--diff-filter=A", "--", "assets/logo.png"],
      getRepoDir(),
    );
    const hash = log.trim().split(" ")[0];
    expect(hash).toBeDefined();

    const statOutput = await execGit(
      ["diff", "--stat", `${hash}~1..${hash}`],
      getRepoDir(),
    );
    const parsed = parseDiffStatOutput(statOutput);
    // Binary file should not appear in parsed files
    const binaryFile = parsed.files.find((f) => f.path === "assets/logo.png");
    expect(binaryFile).toBeUndefined();
  });
});

describe("エッジケース — 非ASCIIファイル名", () => {
  it("日本語ファイル名がblameで正しく処理される", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "--", "src/日本語ファイル.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].lines[0]).toContain("こんにちは");
  });

  it("スペース含みファイル名がblameで正しく処理される", async () => {
    const output = await execGit(
      ["blame", "--porcelain", "--", "src/file with spaces.ts"],
      getRepoDir(),
    );
    const blocks = parseBlameOutput(output);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  it("非ASCIIファイルがhotspots分析に含まれる（git引用形式）", async () => {
    // Git quotes non-ASCII filenames by default (core.quotePath=true)
    // The hotspot result will contain the quoted path
    const hotspots = await analyzeHotspots(getRepoDir(), { topN: 100 });
    const jpFile = hotspots.find(
      (h) => h.filePath.includes("日本語") || h.filePath.includes("\\"),
    );
    expect(jpFile).toBeDefined();
  });

  it("非ASCIIファイルがcontributors分析で処理される", async () => {
    const result = await analyzeContributors(getRepoDir(), {
      pathPattern: "src/日本語ファイル.ts",
    });
    expect(result.stats.length).toBeGreaterThanOrEqual(1);
  });

  it("非ASCIIファイルのstaleness分析が動作する", async () => {
    const result = await analyzeFileStaleness(
      getRepoDir(),
      "src/日本語ファイル.ts",
    );
    expect(result.lastModified).not.toBe("unknown");
    expect(result.daysSinceLastChange).toBeGreaterThanOrEqual(0);
  });
});

describe("エッジケース — truncation", () => {
  it("50,000文字超の出力がtruncateされる", () => {
    const longText = "a".repeat(60_000);
    const response = successResponse(longText);
    expect(response.content[0].text.length).toBeLessThanOrEqual(
      50_000 + 100, // truncation message margin
    );
    expect(response.content[0].text).toContain("[Output truncated");
  });

  it("大量コミットのhotspots分析が成功する", async () => {
    const result = await analyzeHotspots(getRepoDir(), {
      maxCommits: 500,
      topN: 5,
    });
    expect(result.length).toBeGreaterThan(0);
    // src/index.ts should be the top hotspot (50+ bulk commits)
    expect(result[0].filePath).toBe("src/index.ts");
  });
});
