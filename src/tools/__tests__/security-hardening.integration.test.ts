import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createTestMcpClient,
  closeMcpClient,
  getToolText,
  isToolError,
} from "./mcp-test-helpers.js";
import { getRepoDir } from "./helpers.js";

let client: Client;

beforeAll(async () => {
  client = await createTestMcpClient();
});

afterAll(async () => {
  await closeMcpClient();
});

describe("引数インジェクション防止", () => {
  const repoDir = getRepoDir();
  const maliciousRefs = [
    "--upload-pack=evil",
    "--exec=malicious",
    "-c core.sshCommand=evil",
    "--config=evil",
  ];

  describe("git_commit_show", () => {
    it.each(maliciousRefs)("commit=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_commit_show",
        arguments: { repo_path: repoDir, commit: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_diff_context", () => {
    it.each(maliciousRefs)("commit=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_diff_context",
        arguments: { repo_path: repoDir, commit: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });

    it.each(maliciousRefs)("compare_to=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_diff_context",
        arguments: { repo_path: repoDir, commit: "HEAD", compare_to: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_merge_base", () => {
    it.each(maliciousRefs)("ref1=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_merge_base",
        arguments: { repo_path: repoDir, ref1: ref, ref2: "main" },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });

    it.each(maliciousRefs)("ref2=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_merge_base",
        arguments: { repo_path: repoDir, ref1: "main", ref2: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_release_notes", () => {
    it.each(maliciousRefs)("from_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_release_notes",
        arguments: { repo_path: repoDir, from_ref: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });

    it.each(maliciousRefs)("to_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_release_notes",
        arguments: { repo_path: repoDir, from_ref: "HEAD~1", to_ref: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_release_comparison", () => {
    it.each(maliciousRefs)("base_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: { repo_path: repoDir, base_ref: ref, target_ref: "HEAD" },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });

    it.each(maliciousRefs)("target_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_release_comparison",
        arguments: { repo_path: repoDir, base_ref: "HEAD~1", target_ref: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_review_prep", () => {
    it.each(maliciousRefs)("base_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_review_prep",
        arguments: { repo_path: repoDir, base_ref: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });

    it.each(maliciousRefs)("head_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_review_prep",
        arguments: { repo_path: repoDir, base_ref: "main", head_ref: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_bisect_guide", () => {
    it.each(maliciousRefs)("good_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_bisect_guide",
        arguments: { repo_path: repoDir, good_ref: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });

    it.each(maliciousRefs)("bad_ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_bisect_guide",
        arguments: { repo_path: repoDir, good_ref: "HEAD~5", bad_ref: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_cherry_pick_detect", () => {
    it.each(maliciousRefs)("upstream=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_cherry_pick_detect",
        arguments: { repo_path: repoDir, upstream: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });

    it.each(maliciousRefs)("head=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_cherry_pick_detect",
        arguments: { repo_path: repoDir, upstream: "main", head: ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });

  describe("git_reflog_analysis", () => {
    it.each(maliciousRefs)("ref=%s を拒否する", async (ref) => {
      const result = await client.callTool({
        name: "git_reflog_analysis",
        arguments: { repo_path: repoDir, ref },
      });
      expect(isToolError(result)).toBe(true);
      expect(getToolText(result)).toContain("must not start with '-'");
    });
  });
});
