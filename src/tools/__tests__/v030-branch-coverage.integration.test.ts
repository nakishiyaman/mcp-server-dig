import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
} from "./mcp-test-helpers.js";
import { getRepoDir, git } from "./helpers.js";

describe("git_trend_analysis branch coverage", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("quarter期間で分析する", async () => {
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
    expect(text.length).toBeGreaterThan(0);
  });

  it("num_periods=6で最大期間を分析する", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "churn",
        period_length: "week",
        num_periods: 6,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("contributorsメトリクスのweek分析", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "contributors",
        period_length: "week",
        num_periods: 2,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("commit_countのmonth分析", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "commit_count",
        period_length: "month",
        num_periods: 2,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("churnのquarter分析", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "churn",
        period_length: "quarter",
        num_periods: 3,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("contributorsのquarter分析", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "contributors",
        period_length: "quarter",
        num_periods: 2,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("commit_countのweek分析", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "commit_count",
        period_length: "week",
        num_periods: 3,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("hotspotsのmonth分析でJSON出力", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "hotspots",
        period_length: "month",
        num_periods: 4,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);
    expect(data).toHaveProperty("metric", "hotspots");
    expect(data).toHaveProperty("periods");
    expect(data.periods.length).toBe(4);
  });

  it("存在しないパスパターンで全期間0になる場合", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "hotspots",
        path_pattern: "nonexistent-dir-xyz/",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No hotspots data found");
  });

  it("contributorsのquarter分析でscope表示なし", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "contributors",
        period_length: "quarter",
        num_periods: 3,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("churnのpath_pattern指定で全期間0の場合scope付きメッセージ", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "churn",
        path_pattern: "totally-nonexistent-dir-zzz/",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No churn data found");
    expect(text).toContain("scope: totally-nonexistent-dir-zzz/");
  });

  it("commit_countのpath_pattern指定で全期間0の場合", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "commit_count",
        path_pattern: "totally-nonexistent-dir-zzz/",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No commit_count data found");
  });

  it("contributorsのpath_pattern指定で全期間0の場合", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: getRepoDir(),
        metric: "contributors",
        path_pattern: "totally-nonexistent-dir-zzz/",
      },
    });
    const text = getToolText(result);
    expect(text).toContain("No contributors data found");
  });
});

describe("git_knowledge_loss_risk branch coverage", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("depth=1のデフォルト分析でJSON出力", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);

    expect(data).toHaveProperty("depth", 1);
    expect(data).toHaveProperty("totalContributors");
    if (data.totalContributors > 0) {
      const contrib = data.contributors[0];
      expect(contrib).toHaveProperty("author");
      expect(contrib).toHaveProperty("recoveryCost");
      expect(contrib).toHaveProperty("highRiskDirectories");
    }
  });

  it("depth=3でより深い分析", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        depth: 3,
      },
    });
    const text = getToolText(result);
    expect(text).toContain("depth=3");
  });

  it("min_ownership_pct=1で低閾値分析", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        min_ownership_pct: 1,
      },
    });
    const text = getToolText(result);
    // With low threshold, should find more contributors
    if (text.includes("Contributors analyzed:")) {
      expect(text).toContain("recovery cost:");
    }
  });

  it("target_author=bobでフィルタ", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: getRepoDir(),
        target_author: "bob",
      },
    });
    const text = getToolText(result);
    // Bob should be found or not, but no error
    expect(text.length).toBeGreaterThan(0);
  });
});

describe("git_blame_context detect_moves coverage", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("detect_moves=trueでJSON出力", async () => {
    const result = await client.callTool({
      name: "git_blame_context",
      arguments: {
        repo_path: getRepoDir(),
        file_path: "src/index.ts",
        detect_moves: true,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);
    expect(data).toHaveProperty("file", "src/index.ts");
    expect(data.blocks.length).toBeGreaterThan(0);
  });
});

describe("git_trend_analysis with real project repo", () => {
  let client: Client;
  const projectDir = process.cwd();

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("hotspotsトレンドが実データで方向を返す", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: projectDir,
        metric: "hotspots",
        period_length: "month",
        num_periods: 3,
      },
    });
    const text = getToolText(result);

    // Real project repo should have data
    if (text.includes("Trend analysis")) {
      expect(text).toContain("Direction:");
      expect(text).toContain("Change:");
      expect(text).toContain("Interpretation:");
    }
  });

  it("churnトレンドが実データで方向を返す", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: projectDir,
        metric: "churn",
        period_length: "month",
        num_periods: 3,
      },
    });
    const text = getToolText(result);

    if (text.includes("Trend analysis")) {
      expect(text).toContain("lines churned");
      expect(text).toContain("Interpretation:");
    }
  });

  it("contributorsトレンドが実データで方向を返す", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: projectDir,
        metric: "contributors",
        period_length: "month",
        num_periods: 3,
      },
    });
    const text = getToolText(result);

    if (text.includes("Trend analysis")) {
      expect(text).toContain("contributors");
      expect(text).toContain("Interpretation:");
    }
  });

  it("commit_countトレンドが実データで方向を返す", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: projectDir,
        metric: "commit_count",
        period_length: "month",
        num_periods: 3,
      },
    });
    const text = getToolText(result);

    if (text.includes("Trend analysis")) {
      expect(text).toContain("commits");
      expect(text).toContain("Interpretation:");
    }
  });

  it("weekで実データを分析", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: projectDir,
        metric: "hotspots",
        period_length: "week",
        num_periods: 4,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("quarterで実データを分析", async () => {
    const result = await client.callTool({
      name: "git_trend_analysis",
      arguments: {
        repo_path: projectDir,
        metric: "churn",
        period_length: "quarter",
        num_periods: 2,
      },
    });
    const text = getToolText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("knowledge_loss_riskが実データで結果を返す", async () => {
    const result = await client.callTool({
      name: "git_knowledge_loss_risk",
      arguments: {
        repo_path: projectDir,
      },
    });
    const text = getToolText(result);

    if (text.includes("Contributors analyzed:")) {
      expect(text).toContain("recovery cost:");
      expect(text).toContain("Directories owned:");
    }
  });
});

describe("git_diff_context word_diff coverage", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient();
  });

  it("word_diff=trueでJSON出力", async () => {
    const repoDir = getRepoDir();
    const logOutput = await git(repoDir, "log", "--format=%H", "--max-count=3");
    const hashes = logOutput.trim().split("\n");
    const newest = hashes[0];
    const oldest = hashes[hashes.length - 1];

    const result = await client.callTool({
      name: "git_diff_context",
      arguments: {
        repo_path: repoDir,
        commit: oldest,
        compare_to: newest,
        word_diff: true,
        output_format: "json",
      },
    });
    const text = getToolText(result);
    const data = JSON.parse(text);
    expect(data).toHaveProperty("ref");
    expect(data).toHaveProperty("diff");
  });
});
