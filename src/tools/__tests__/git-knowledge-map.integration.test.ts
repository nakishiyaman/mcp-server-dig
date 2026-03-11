import { describe, it, expect } from "vitest";
import { execGit } from "../../git/executor.js";
import { analyzeKnowledgeMap } from "../../analysis/knowledge-map.js";
import { getRepoDir } from "./helpers.js";

describe("git_knowledge_map (end-to-end)", () => {
  it("ディレクトリ別の知識所有者を取得する", async () => {
    const results = await analyzeKnowledgeMap(getRepoDir(), { depth: 1 });

    expect(results.length).toBeGreaterThanOrEqual(1);
    const srcDir = results.find((r) => r.directory === "src");
    expect(srcDir).toBeDefined();
    expect(srcDir!.totalCommits).toBeGreaterThan(0);
    expect(srcDir!.contributors.length).toBeGreaterThanOrEqual(1);
  });

  it("バス係数を計算する", async () => {
    const results = await analyzeKnowledgeMap(getRepoDir(), { depth: 1 });

    const srcDir = results.find((r) => r.directory === "src");
    expect(srcDir).toBeDefined();
    expect(srcDir!.busFactor).toBeGreaterThanOrEqual(1);
  });

  it("depth=2でより深い階層を分析する", async () => {
    const results = await analyzeKnowledgeMap(getRepoDir(), { depth: 2 });

    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("貢献者にAliceとBobが含まれる", async () => {
    const results = await analyzeKnowledgeMap(getRepoDir(), { depth: 1 });

    const srcDir = results.find((r) => r.directory === "src");
    expect(srcDir).toBeDefined();
    const emails = srcDir!.contributors.map((c) => c.email);
    expect(emails).toContain("alice@example.com");
    expect(emails).toContain("bob@example.com");
  });

  it("空リポジトリでは空配列を返す", async () => {
    const results = await analyzeKnowledgeMap(getRepoDir(), {
      since: "2099-01-01",
    });
    expect(results).toEqual([]);
  });

  it("git rev-parseでリポジトリ検証できる", async () => {
    const output = await execGit(["rev-parse", "--git-dir"], getRepoDir());
    expect(output.trim()).toBe(".git");
  });
});
