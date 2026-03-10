import { describe, it, expect } from "vitest";
import {
  parseLogOutput,
  parseBlameOutput,
  parseShortlogOutput,
  parseNameOnlyLog,
  parseDiffStatOutput,
  parseFileFrequency,
} from "./parsers.js";

describe("parseLogOutput", () => {
  it("parses standard log entries", () => {
    const raw = [
      "abc1234|Alice|alice@example.com|2026-01-15T10:00:00+09:00|feat: add login",
      "def5678|Bob|bob@example.com|2026-01-14T09:00:00+09:00|fix: typo in README",
    ].join("\n");

    const result = parseLogOutput(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      hash: "abc1234",
      author: "Alice",
      email: "alice@example.com",
      date: "2026-01-15T10:00:00+09:00",
      subject: "feat: add login",
    });
    expect(result[1]).toEqual({
      hash: "def5678",
      author: "Bob",
      email: "bob@example.com",
      date: "2026-01-14T09:00:00+09:00",
      subject: "fix: typo in README",
    });
  });

  it("handles subject containing pipe characters", () => {
    const raw =
      "abc1234|Alice|alice@example.com|2026-01-15T10:00:00+09:00|fix: handle a|b case";

    const result = parseLogOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("fix: handle a|b case");
  });

  it("returns empty array for empty input", () => {
    expect(parseLogOutput("")).toEqual([]);
    expect(parseLogOutput("  \n  \n  ")).toEqual([]);
  });

  it("skips malformed lines", () => {
    const raw = [
      "abc1234|Alice|alice@example.com|2026-01-15T10:00:00+09:00|ok",
      "malformed line without enough separators",
      "def5678|Bob|bob@example.com|2026-01-14T09:00:00+09:00|also ok",
    ].join("\n");

    const result = parseLogOutput(raw);
    expect(result).toHaveLength(2);
    expect(result[0].hash).toBe("abc1234");
    expect(result[1].hash).toBe("def5678");
  });
});

describe("parseBlameOutput", () => {
  const sampleBlame = [
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 1 1 3",
    "author Alice",
    "author-mail <alice@example.com>",
    "author-time 1700000000",
    "author-tz +0900",
    "committer Alice",
    "committer-mail <alice@example.com>",
    "committer-time 1700000000",
    "committer-tz +0900",
    "summary Initial commit",
    "filename src/index.ts",
    "\tconst x = 1;",
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 1 2",
    "author Alice",
    "author-mail <alice@example.com>",
    "author-time 1700000000",
    "author-tz +0900",
    "committer Alice",
    "committer-mail <alice@example.com>",
    "committer-time 1700000000",
    "committer-tz +0900",
    "summary Initial commit",
    "filename src/index.ts",
    "\tconst y = 2;",
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 1 3",
    "author Alice",
    "author-mail <alice@example.com>",
    "author-time 1700000000",
    "author-tz +0900",
    "committer Alice",
    "committer-mail <alice@example.com>",
    "committer-time 1700000000",
    "committer-tz +0900",
    "summary Initial commit",
    "filename src/index.ts",
    "\tconst z = 3;",
  ].join("\n");

  it("parses blame porcelain and merges contiguous blocks", () => {
    const result = parseBlameOutput(sampleBlame);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      commitHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      author: "Alice",
      email: "alice@example.com",
      summary: "Initial commit",
      startLine: 1,
      endLine: 3,
      lines: ["const x = 1;", "const y = 2;", "const z = 3;"],
    });
  });

  it("converts author-time to ISO date string", () => {
    const result = parseBlameOutput(sampleBlame);
    expect(result[0].date).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it("creates separate blocks for different commits", () => {
    const raw = [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 1 1 1",
      "author Alice",
      "author-mail <alice@example.com>",
      "author-time 1700000000",
      "summary First commit",
      "filename file.ts",
      "\tline one",
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb 2 2 1",
      "author Bob",
      "author-mail <bob@example.com>",
      "author-time 1700001000",
      "summary Second commit",
      "filename file.ts",
      "\tline two",
    ].join("\n");

    const result = parseBlameOutput(raw);
    expect(result).toHaveLength(2);
    expect(result[0].commitHash).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(result[0].author).toBe("Alice");
    expect(result[1].commitHash).toBe(
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    expect(result[1].author).toBe("Bob");
  });

  it("returns empty array for empty input", () => {
    expect(parseBlameOutput("")).toEqual([]);
  });
});

describe("parseShortlogOutput", () => {
  it("parses shortlog entries with correct percentages", () => {
    const raw = [
      "    10\tAlice <alice@example.com>",
      "     5\tBob <bob@example.com>",
      "     3\tCharlie <charlie@example.com>",
    ].join("\n");

    const result = parseShortlogOutput(raw, 18);
    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      name: "Alice",
      email: "alice@example.com",
      commitCount: 10,
      percentage: 56,
      lastActive: "",
    });
    expect(result[1]).toEqual({
      name: "Bob",
      email: "bob@example.com",
      commitCount: 5,
      percentage: 28,
      lastActive: "",
    });
    expect(result[2]).toEqual({
      name: "Charlie",
      email: "charlie@example.com",
      commitCount: 3,
      percentage: 17,
      lastActive: "",
    });
  });

  it("handles zero total commits", () => {
    const raw = "     1\tAlice <alice@example.com>";
    const result = parseShortlogOutput(raw, 0);
    expect(result[0].percentage).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(parseShortlogOutput("", 10)).toEqual([]);
    expect(parseShortlogOutput("  \n  ", 10)).toEqual([]);
  });

  it("skips malformed lines", () => {
    const raw = [
      "    10\tAlice <alice@example.com>",
      "not a valid line",
      "     5\tBob <bob@example.com>",
    ].join("\n");

    const result = parseShortlogOutput(raw, 15);
    expect(result).toHaveLength(2);
  });
});

describe("parseNameOnlyLog", () => {
  it("parses commit-file mapping", () => {
    const raw = [
      "COMMIT:abc1234",
      "src/index.ts",
      "src/utils.ts",
      "",
      "COMMIT:def5678",
      "README.md",
    ].join("\n");

    const result = parseNameOnlyLog(raw);
    expect(result.size).toBe(2);
    expect(result.get("abc1234")).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(result.get("def5678")).toEqual(["README.md"]);
  });

  it("handles commits with no files", () => {
    const raw = "COMMIT:abc1234\n\nCOMMIT:def5678\nsrc/index.ts";

    const result = parseNameOnlyLog(raw);
    expect(result.size).toBe(2);
    expect(result.get("abc1234")).toEqual([]);
    expect(result.get("def5678")).toEqual(["src/index.ts"]);
  });

  it("returns empty map for empty input", () => {
    expect(parseNameOnlyLog("").size).toBe(0);
    expect(parseNameOnlyLog("  \n  ").size).toBe(0);
  });

  it("trims whitespace from hashes and file paths", () => {
    const raw = "COMMIT:  abc1234  \n  src/index.ts  ";

    const result = parseNameOnlyLog(raw);
    expect(result.has("abc1234")).toBe(true);
    expect(result.get("abc1234")).toEqual(["src/index.ts"]);
  });
});

describe("parseDiffStatOutput", () => {
  it("parses diff stat with insertions and deletions", () => {
    const raw = [
      " src/index.ts  | 5 +++--",
      " src/utils.ts  | 10 ++++------",
      " README.md     | 3 +++",
      " 3 files changed, 10 insertions(+), 8 deletions(-)",
    ].join("\n");

    const result = parseDiffStatOutput(raw);
    expect(result.filesChanged).toBe(3);
    expect(result.insertions).toBe(10);
    expect(result.deletions).toBe(8);
    expect(result.files).toHaveLength(3);
    expect(result.files[0].path).toBe("src/index.ts");
    expect(result.files[2].path).toBe("README.md");
  });

  it("handles insertions only", () => {
    const raw = [
      " src/new.ts | 20 ++++++++++++++++++++",
      " 1 file changed, 20 insertions(+)",
    ].join("\n");

    const result = parseDiffStatOutput(raw);
    expect(result.filesChanged).toBe(1);
    expect(result.insertions).toBe(20);
    expect(result.deletions).toBe(0);
  });

  it("handles deletions only", () => {
    const raw = [
      " src/old.ts | 5 -----",
      " 1 file changed, 5 deletions(-)",
    ].join("\n");

    const result = parseDiffStatOutput(raw);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(5);
  });

  it("returns empty for empty input", () => {
    const result = parseDiffStatOutput("");
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });
});

describe("parseFileFrequency", () => {
  it("counts file occurrences and sorts by frequency", () => {
    const raw = [
      "src/index.ts",
      "src/utils.ts",
      "src/index.ts",
      "README.md",
      "src/index.ts",
      "src/utils.ts",
    ].join("\n");

    const result = parseFileFrequency(raw);
    expect(result[0].filePath).toBe("src/index.ts");
    expect(result[0].changeCount).toBe(3);
    expect(result[1].filePath).toBe("src/utils.ts");
    expect(result[1].changeCount).toBe(2);
    expect(result[2].filePath).toBe("README.md");
    expect(result[2].changeCount).toBe(1);
  });

  it("respects topN parameter", () => {
    const raw = ["a.ts", "b.ts", "c.ts", "a.ts", "b.ts", "a.ts"].join("\n");

    const result = parseFileFrequency(raw, 2);
    expect(result).toHaveLength(2);
    expect(result[0].filePath).toBe("a.ts");
    expect(result[1].filePath).toBe("b.ts");
  });

  it("calculates percentage correctly", () => {
    const raw = ["a.ts", "a.ts", "b.ts", "b.ts"].join("\n");
    const result = parseFileFrequency(raw);
    expect(result[0].percentage).toBe(50);
  });

  it("returns empty for empty input", () => {
    expect(parseFileFrequency("")).toEqual([]);
  });
});
