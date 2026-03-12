import { describe, it, expect } from "vitest";
import { _generateRepoSummaryForTest as generateRepoSummary } from "./repo-summary.js";
import { getRepoDir } from "../tools/__tests__/helpers.js";

describe("repo-summary", () => {
  it("リポジトリサマリーを生成する", async () => {
    const text = await generateRepoSummary(getRepoDir());

    expect(text).toContain("Repository Summary");
    expect(text).toContain("Current branch");
    expect(text).toContain("File Types");
    expect(text).toContain("Top Contributors");
    expect(text).toContain("Recent Commits");
    expect(text).toContain("Recent Tags");
  });
});
