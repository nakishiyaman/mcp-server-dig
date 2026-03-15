import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { analyzeKnowledgeMap } from "./knowledge-map.js";
import { analyzeHotspotsAndChurn } from "./combined-log-analysis.js";
import { computeCoordinationBottlenecks } from "./coordination-bottleneck.js";

const execFileAsync = promisify(execFile);

async function git(repoDir: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: repoDir });
  return stdout;
}

describe("computeCoordinationBottlenecks", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "coordination-test-"));

    await git(repoDir, "init");

    await execFileAsync("mkdir", ["-p", join(repoDir, "src")]);
    await execFileAsync("mkdir", ["-p", join(repoDir, "docs")]);

    // Alice commits to src/ and docs/
    await git(repoDir, "config", "user.email", "alice@example.com");
    await git(repoDir, "config", "user.name", "Alice");

    for (let i = 0; i < 5; i++) {
      await writeFile(join(repoDir, "src", "main.ts"), `// alice v${i}\n`);
      await writeFile(join(repoDir, "docs", "readme.md"), `# alice v${i}\n`);
      await git(repoDir, "add", "-A");
      await git(repoDir, "commit", "-m", `Alice commit ${i}`);
    }

    // Bob commits to src/ only — many changes
    await git(repoDir, "config", "user.email", "bob@example.com");
    await git(repoDir, "config", "user.name", "Bob");

    for (let i = 0; i < 4; i++) {
      await writeFile(join(repoDir, "src", "utils.ts"), `// bob v${i}\n`);
      await git(repoDir, "add", "-A");
      await git(repoDir, "commit", "-m", `Bob commit ${i}`);
    }

    // Charlie commits to src/
    await git(repoDir, "config", "user.email", "charlie@example.com");
    await git(repoDir, "config", "user.name", "Charlie");

    for (let i = 0; i < 3; i++) {
      await writeFile(join(repoDir, "src", "helper.ts"), `// charlie v${i}\n`);
      await git(repoDir, "add", "-A");
      await git(repoDir, "commit", "-m", `Charlie commit ${i}`);
    }
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it("ディレクトリ別の調整コストランキングを返す", async () => {
    const knowledgeMap = await analyzeKnowledgeMap(repoDir, { depth: 1 });
    const { hotspots } = await analyzeHotspotsAndChurn(repoDir, {});
    const results = computeCoordinationBottlenecks(knowledgeMap, hotspots, 1, 10);

    expect(results.length).toBeGreaterThan(0);

    // src/ should have higher coordination cost than docs/ (more authors)
    const src = results.find((r) => r.directory === "src");
    const docs = results.find((r) => r.directory === "docs");

    expect(src).toBeDefined();
    if (src && docs) {
      expect(src.coordinationScore).toBeGreaterThan(docs.coordinationScore);
      expect(src.uniqueAuthors).toBeGreaterThan(docs.uniqueAuthors);
    }
  });

  it("スコア降順でソートされている", async () => {
    const knowledgeMap = await analyzeKnowledgeMap(repoDir, { depth: 1 });
    const { hotspots } = await analyzeHotspotsAndChurn(repoDir, {});
    const results = computeCoordinationBottlenecks(knowledgeMap, hotspots, 1, 10);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].coordinationScore).toBeGreaterThanOrEqual(
        results[i].coordinationScore,
      );
    }
  });

  it("topNでランキングを制限する", async () => {
    const knowledgeMap = await analyzeKnowledgeMap(repoDir, { depth: 1 });
    const { hotspots } = await analyzeHotspotsAndChurn(repoDir, {});
    const results = computeCoordinationBottlenecks(knowledgeMap, hotspots, 1, 1);

    expect(results).toHaveLength(1);
  });

  it("各エントリの構造が正しい", async () => {
    const knowledgeMap = await analyzeKnowledgeMap(repoDir, { depth: 1 });
    const { hotspots } = await analyzeHotspotsAndChurn(repoDir, {});
    const results = computeCoordinationBottlenecks(knowledgeMap, hotspots, 1, 10);

    for (const entry of results) {
      expect(entry).toHaveProperty("directory");
      expect(entry).toHaveProperty("changeCount");
      expect(entry).toHaveProperty("uniqueAuthors");
      expect(entry).toHaveProperty("dominantAuthorPct");
      expect(entry).toHaveProperty("coordinationScore");
      expect(entry).toHaveProperty("riskLevel");
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(entry.riskLevel);
      expect(entry.changeCount).toBeGreaterThan(0);
      expect(entry.uniqueAuthors).toBeGreaterThan(0);
    }
  });
});
