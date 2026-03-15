import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { analyzeKnowledgeMap } from "./knowledge-map.js";
import { simulateOffboarding } from "./offboarding-simulation.js";

const execFileAsync = promisify(execFile);

async function git(repoDir: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: repoDir });
  return stdout;
}

describe("simulateOffboarding", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "offboarding-test-"));

    await git(repoDir, "init");
    await git(repoDir, "config", "user.email", "alice@example.com");
    await git(repoDir, "config", "user.name", "Alice");

    // Alice creates files in src/ and docs/
    await execFileAsync("mkdir", ["-p", join(repoDir, "src")]);
    await execFileAsync("mkdir", ["-p", join(repoDir, "docs")]);

    for (let i = 0; i < 5; i++) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(join(repoDir, "src", "main.ts"), `// v${i}\n`);
      await writeFile(join(repoDir, "docs", "readme.md"), `# v${i}\n`);
      await git(repoDir, "add", "-A");
      await git(repoDir, "commit", "-m", `Alice commit ${i}`);
    }

    // Bob contributes to src/ only
    await git(repoDir, "config", "user.email", "bob@example.com");
    await git(repoDir, "config", "user.name", "Bob");

    for (let i = 0; i < 3; i++) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(join(repoDir, "src", "utils.ts"), `// bob v${i}\n`);
      await git(repoDir, "add", "-A");
      await git(repoDir, "commit", "-m", `Bob commit ${i}`);
    }

    // Charlie contributes to src/
    await git(repoDir, "config", "user.email", "charlie@example.com");
    await git(repoDir, "config", "user.name", "Charlie");

    for (let i = 0; i < 2; i++) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(join(repoDir, "src", "helper.ts"), `// charlie v${i}\n`);
      await git(repoDir, "add", "-A");
      await git(repoDir, "commit", "-m", `Charlie commit ${i}`);
    }
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it("Aliceを除外するとバス係数が下がるディレクトリが特定される", async () => {
    const knowledgeMap = await analyzeKnowledgeMap(repoDir, { depth: 1 });
    const result = simulateOffboarding(knowledgeMap, { author: "alice" });

    expect(result.targetAuthor).toBe("alice");
    expect(result.matchedEmails).toContain("alice@example.com");
    expect(result.impactedDirectories).toBeGreaterThan(0);

    // docs/ should be heavily impacted since only Alice contributes there
    const docs = result.directories.find((d) => d.directory === "docs");
    if (docs) {
      expect(docs.afterBusFactor).toBeLessThanOrEqual(docs.beforeBusFactor);
      expect(docs.ownershipPct).toBeGreaterThan(0);
    }
  });

  it("存在しない著者で影響なし", async () => {
    const knowledgeMap = await analyzeKnowledgeMap(repoDir, { depth: 1 });
    const result = simulateOffboarding(knowledgeMap, {
      author: "nonexistent-user-xyz",
    });

    expect(result.matchedEmails).toHaveLength(0);
    expect(result.impactedDirectories).toBe(0);
    expect(result.directories).toHaveLength(0);
    expect(result.overallRisk).toBe("LOW");
  });

  it("before/after構造が正しい", async () => {
    const knowledgeMap = await analyzeKnowledgeMap(repoDir, { depth: 1 });
    const result = simulateOffboarding(knowledgeMap, { author: "alice" });

    for (const dir of result.directories) {
      expect(dir.beforeBusFactor).toBeGreaterThanOrEqual(0);
      expect(dir.afterBusFactor).toBeGreaterThanOrEqual(0);
      expect(dir.afterBusFactor).toBeLessThanOrEqual(dir.beforeBusFactor);
      expect(dir.beforeContributors).toBeGreaterThan(0);
      expect(dir.afterContributors).toBeLessThan(dir.beforeContributors);
      expect(dir.ownershipPct).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(dir.riskLevel);
    }
  });
});
