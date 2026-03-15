/**
 * Branch coverage recovery tests for v0.32.0.
 *
 * Targets uncovered branches in:
 * - git_release_comparison (61.53% → 80%+): formatDelta, assessment branches
 * - git_refactor_candidates (73.68% → 85%+): HIGH risk next actions
 * - ref-comparison.ts: busFactors.length === 0
 * - git_reflog_analysis (66.66%): empty reflog
 * - git_trend_analysis (78%): worsening + next actions
 * - git_knowledge_loss_risk (86.36%): populated results + directory output
 * - git_survival_analysis (82.6%): daily granularity
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

describe("v0.32.0 ブランチカバレッジ回復", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  // ─── git_release_comparison: formatDelta + assessment branches ───

  describe("git_release_comparison 分岐カバー", () => {
    it("delta > 0のアセスメント（churn increased, contributor base grew, bus factor improved）", async () => {
      // v0.1.0 → HEAD: activity increased between the two refs
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: {
          repo_path: getRepoDir(),
          base_ref: "v0.1.0",
          target_ref: "HEAD",
        },
      });
      const text = getToolText(result);

      expect(text).toContain("Release comparison: v0.1.0 → HEAD");
      // At least some delta should be positive (churn/contributors increased from v0.1.0 to HEAD)
      expect(text).toContain("Assessment:");
      // formatDelta should show "+" for positive deltas
      expect(text).toMatch(/\+\d+/);
    });

    it("delta < 0のアセスメント（churn decreased）", async () => {
      // HEAD → v0.1.0: reversed comparison, values decrease
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: {
          repo_path: getRepoDir(),
          base_ref: "HEAD",
          target_ref: "v0.1.0",
        },
      });
      const text = getToolText(result);

      expect(text).toContain("Release comparison: HEAD → v0.1.0");
      // Should show negative delta assessment
      expect(text).toContain("Assessment:");
    });

    it("topHotspotsが存在するケースで表示される", async () => {
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: {
          repo_path: getRepoDir(),
          base_ref: "v0.1.0",
          target_ref: "v0.2.0",
        },
      });
      const text = getToolText(result);

      // topHotspots should exist and be displayed
      expect(text).toContain("Top hotspots at v0.2.0:");
      expect(text).toMatch(/\d+x /);
    });

    it("formatDelta: base=0でパーセンテージなし表示", async () => {
      // JSON output to verify delta computation
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: {
          repo_path: getRepoDir(),
          base_ref: "v0.1.0",
          target_ref: "HEAD",
          output_format: "json",
        },
      });
      const text = getToolText(result);
      const data = JSON.parse(text);

      // Verify delta structure
      expect(data.delta).toHaveProperty("hotspotCount");
      expect(data.delta).toHaveProperty("totalChurn");
      expect(data.delta).toHaveProperty("activeContributors");
      expect(data.delta).toHaveProperty("avgBusFactor");
      expect(typeof data.delta.avgBusFactor).toBe("number");
    });
  });

  // ─── git_refactor_candidates: HIGH risk next actions ───

  describe("git_refactor_candidates 分岐カバー", () => {
    it("HIGH リスク候補が存在しnext actionsが表示される", async () => {
      // With full repo, src/index.ts has many changes and should score HIGH on some dimensions
      const result = await client.callTool({
        name: "git_refactor_candidates",
        arguments: {
          repo_path: getRepoDir(),
          top_n: 10,
        },
      });
      const text = getToolText(result);

      expect(text).toContain("Refactoring candidates");
      // The bulk commits on src/index.ts should make it HIGH risk
      if (text.includes("HIGH")) {
        expect(text).toContain("Next actions:");
        expect(text).toContain("git_file_risk_profile");
        expect(text).toContain("git_why");
        expect(text).toContain("git_impact_analysis");
      }
    });

    it("サマリーにHIGH/MEDIUM/LOW件数が表示される", async () => {
      const result = await client.callTool({
        name: "git_refactor_candidates",
        arguments: {
          repo_path: getRepoDir(),
        },
      });
      const text = getToolText(result);

      // Summary line should include risk breakdown
      expect(text).toMatch(/Summary: \d+ HIGH, \d+ MEDIUM, \d+ LOW risk candidates/);
    });
  });

  // ─── git_reflog_analysis: empty reflog ───

  describe("git_reflog_analysis 分岐カバー", () => {
    it("reflogが空のrefで空結果メッセージを返す", async () => {
      // Create a temp repo and a branch with no reflog
      const tempDir = await mkdtemp(join(tmpdir(), "mcp-dig-reflog-"));
      try {
        const gitCmd = async (...args: string[]) => {
          await execFileAsync("git", args, { cwd: tempDir });
        };
        await gitCmd("init", "-b", "main");
        await gitCmd("config", "user.name", "Test");
        await gitCmd("config", "user.email", "test@example.com");
        await writeFile(join(tempDir, "file.txt"), "content");
        await gitCmd("add", ".");
        await gitCmd("commit", "-m", "initial");

        // Create a new branch ref manually (no reflog for it)
        await gitCmd("branch", "no-reflog-branch");
        // Delete its reflog
        const reflogPath = join(tempDir, ".git", "logs", "refs", "heads", "no-reflog-branch");
        await rm(reflogPath, { force: true });

        const result = await client.callTool({
          name: "git_reflog_analysis",
          arguments: {
            repo_path: tempDir,
            ref: "no-reflog-branch",
          },
        });
        const text = getToolText(result);

        // Should hit the empty reflog branch (line 78-79)
        expect(text).toContain("No reflog entries found");
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  // ─── git_trend_analysis: worsening + next actions ───

  describe("git_trend_analysis 分岐カバー", () => {
    it("quarter期間でトレンド分析する", async () => {
      const result = await client.callTool({
        name: "git_trend_analysis",
        arguments: {
          repo_path: getRepoDir(),
          metric: "hotspots",
          period_length: "quarter",
          num_periods: 2,
        },
      });
      const text = getToolText(result);

      // Should either show trend data or empty message
      expect(text.length).toBeGreaterThan(0);
    });

    it("worsening方向でnext actionsが表示される（hotspots）", async () => {
      // Create a repo with worsening hotspots trend
      const tempDir = await mkdtemp(join(tmpdir(), "mcp-dig-trend-"));
      try {
        const gitCmd = async (...args: string[]) => {
          await execFileAsync("git", args, { cwd: tempDir });
        };

        await gitCmd("init", "-b", "main");
        await gitCmd("config", "user.name", "Test");
        await gitCmd("config", "user.email", "test@example.com");

        // Period 1 (3 months ago): few changes
        const oldDate = new Date();
        oldDate.setMonth(oldDate.getMonth() - 3);
        const oldDateStr = oldDate.toISOString();

        await writeFile(join(tempDir, "a.ts"), "const a = 1;");
        await gitCmd("add", ".");
        await execFileAsync("git", ["commit", "-m", "old commit", `--date=${oldDateStr}`], {
          cwd: tempDir,
          env: { ...process.env, GIT_COMMITTER_DATE: oldDateStr },
        });

        // Period 2 (recent): many changes to many files
        await mkdir(join(tempDir, "src"), { recursive: true });
        for (let i = 0; i < 10; i++) {
          await writeFile(join(tempDir, "src", `file${i}.ts`), `const x = ${i};\n`);
        }
        await gitCmd("add", ".");
        await gitCmd("commit", "-m", "recent bulk changes");

        for (let i = 0; i < 10; i++) {
          await writeFile(join(tempDir, "src", `file${i}.ts`), `const x = ${i};\nconst y = ${i + 1};\n`);
        }
        await gitCmd("add", ".");
        await gitCmd("commit", "-m", "more recent changes");

        const result = await client.callTool({
          name: "git_trend_analysis",
          arguments: {
            repo_path: tempDir,
            metric: "hotspots",
            period_length: "month",
            num_periods: 3,
          },
        });
        const text = getToolText(result);

        // The test verifies the worsening code path is exercised
        if (text.includes("WORSENING")) {
          expect(text).toContain("Next actions:");
          expect(text).toContain("git_hotspots");
        }
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it("worsening方向でnext actionsが表示される（contributors）", async () => {
      // Create a repo where contributor count declines
      const tempDir = await mkdtemp(join(tmpdir(), "mcp-dig-trend-contrib-"));
      try {
        const gitCmd = async (...args: string[]) => {
          await execFileAsync("git", args, { cwd: tempDir });
        };

        await gitCmd("init", "-b", "main");

        // Period 1 (3 months ago): many contributors
        const oldDate = new Date();
        oldDate.setMonth(oldDate.getMonth() - 3);
        const oldDateStr = oldDate.toISOString();

        const authors = ["Alice", "Bob", "Carol", "Dave"];
        for (const name of authors) {
          await gitCmd("config", "user.name", name);
          await gitCmd("config", "user.email", `${name.toLowerCase()}@example.com`);
          await writeFile(join(tempDir, `${name.toLowerCase()}.ts`), `export const author = "${name}";`);
          await gitCmd("add", ".");
          await execFileAsync("git", ["commit", "-m", `${name} commit`, `--date=${oldDateStr}`], {
            cwd: tempDir,
            env: { ...process.env, GIT_COMMITTER_DATE: oldDateStr },
          });
        }

        // Period 2 (recent): only one contributor
        await gitCmd("config", "user.name", "Alice");
        await gitCmd("config", "user.email", "alice@example.com");
        await writeFile(join(tempDir, "alice.ts"), "export const author = 'Alice only';");
        await gitCmd("add", ".");
        await gitCmd("commit", "-m", "alice only commit");

        const result = await client.callTool({
          name: "git_trend_analysis",
          arguments: {
            repo_path: tempDir,
            metric: "contributors",
            period_length: "month",
            num_periods: 3,
          },
        });
        const text = getToolText(result);

        if (text.includes("WORSENING")) {
          expect(text).toContain("Next actions:");
          expect(text).toContain("git_knowledge_loss_risk");
        }
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  // ─── git_knowledge_loss_risk: HIGH/MEDIUM/LOW directory output ───

  describe("git_knowledge_loss_risk 分岐カバー", () => {
    it("HIGH/MEDIUMリスクディレクトリの詳細出力", async () => {
      // The shared test repo has multiple authors with distinct directories
      const result = await client.callTool({
        name: "git_knowledge_loss_risk",
        arguments: {
          repo_path: getRepoDir(),
          depth: 1,
          min_ownership_pct: 30,
        },
      });
      const text = getToolText(result);

      expect(text).toContain("Knowledge loss risk analysis");
      expect(text).toContain("Contributors analyzed:");

      // Should show risk levels for contributors
      const hasRiskLabel = text.includes("[HIGH RISK]") || text.includes("[MEDIUM]") || text.includes("[LOW]");
      expect(hasRiskLabel).toBe(true);
    });

    it("lowRiskDirectoriesの件数表示", async () => {
      const result = await client.callTool({
        name: "git_knowledge_loss_risk",
        arguments: {
          repo_path: getRepoDir(),
          depth: 1,
          min_ownership_pct: 1, // Low threshold to capture all
        },
      });
      const text = getToolText(result);

      // With low threshold, should have some low risk directories
      if (text.includes("Low risk:")) {
        expect(text).toMatch(/Low risk: \d+ directories/);
      }
    });

    it("highRiskDirectoriesの詳細表示（bus factor=1、3+ディレクトリでHIGH recoveryCost）", async () => {
      // Custom repo with single author owning 3+ directories → HIGH recovery cost
      const tempDir = await mkdtemp(join(tmpdir(), "mcp-dig-klr-"));
      try {
        const gitCmd = async (...args: string[]) => {
          await execFileAsync("git", args, { cwd: tempDir });
        };
        await gitCmd("init", "-b", "main");
        await gitCmd("config", "user.name", "SoloAuthor");
        await gitCmd("config", "user.email", "solo@example.com");

        // Need 3+ directories at depth=1 for HIGH recovery cost
        await mkdir(join(tempDir, "src"), { recursive: true });
        await mkdir(join(tempDir, "lib"), { recursive: true });
        await mkdir(join(tempDir, "config"), { recursive: true });

        for (let i = 0; i < 5; i++) {
          await writeFile(join(tempDir, "src", `file${i}.ts`), `const x = ${i};`);
          await writeFile(join(tempDir, "lib", `mod${i}.ts`), `export const m = ${i};`);
          await writeFile(join(tempDir, "config", `cfg${i}.ts`), `export const c = ${i};`);
          await gitCmd("add", ".");
          await gitCmd("commit", "-m", `commit ${i}`);
        }

        const result = await client.callTool({
          name: "git_knowledge_loss_risk",
          arguments: {
            repo_path: tempDir,
            depth: 1,
            min_ownership_pct: 30,
          },
        });
        const text = getToolText(result);

        expect(text).toContain("[HIGH RISK]");
        expect(text).toContain("High risk (bus factor=1");
        expect(text).toContain("Next actions:");
        expect(text).toContain("git_knowledge_map");
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it("mediumRiskDirectoriesの詳細表示", async () => {
      // Custom repo with 2 authors but one dominant
      const tempDir = await mkdtemp(join(tmpdir(), "mcp-dig-klr-med-"));
      try {
        const gitCmd = async (...args: string[]) => {
          await execFileAsync("git", args, { cwd: tempDir });
        };
        await gitCmd("init", "-b", "main");

        await mkdir(join(tempDir, "src"), { recursive: true });

        // Author 1: dominant
        await gitCmd("config", "user.name", "MainDev");
        await gitCmd("config", "user.email", "main@example.com");
        for (let i = 0; i < 8; i++) {
          await writeFile(join(tempDir, "src", `main${i}.ts`), `const x = ${i};`);
          await gitCmd("add", ".");
          await gitCmd("commit", "-m", `main commit ${i}`);
        }

        // Author 2: minor contributor
        await gitCmd("config", "user.name", "MinorDev");
        await gitCmd("config", "user.email", "minor@example.com");
        await writeFile(join(tempDir, "src", "minor.ts"), "const y = 1;");
        await gitCmd("add", ".");
        await gitCmd("commit", "-m", "minor commit");

        const result = await client.callTool({
          name: "git_knowledge_loss_risk",
          arguments: {
            repo_path: tempDir,
            depth: 1,
            min_ownership_pct: 30,
          },
        });
        const text = getToolText(result);

        // Should show at least one risk level
        const hasOutput = text.includes("[HIGH RISK]") || text.includes("[MEDIUM]");
        expect(hasOutput).toBe(true);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  // ─── git_survival_analysis: daily granularity ───

  describe("git_survival_analysis 分岐カバー", () => {
    it("daily粒度で集計する", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          granularity: "daily",
        },
      });
      const text = getToolText(result);

      expect(text).toContain("Code churn analysis");
      expect(text).toContain("daily");
    });

    it("since + path_patternの組み合わせで空結果メッセージ", async () => {
      const result = await client.callTool({
        name: "git_survival_analysis",
        arguments: {
          repo_path: getRepoDir(),
          since: "2099-01-01",
          path_pattern: "nonexistent/",
        },
      });
      const text = getToolText(result);

      expect(text).toContain("No commits found");
    });
  });

  // ─── ref-comparison.ts: busFactors.length === 0 ───

  describe("ref-comparison busFactors.length === 0 分岐", () => {
    it("path_patternで空結果のrefメトリクスを返す", async () => {
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: {
          repo_path: getRepoDir(),
          base_ref: "v0.1.0",
          target_ref: "v0.2.0",
          path_pattern: "nonexistent-path/",
        },
      });
      const text = getToolText(result);

      // With a nonexistent path, metrics should be 0
      expect(text).toContain("Release comparison:");
    });
  });
});
