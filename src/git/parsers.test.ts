import { describe, it, expect } from "vitest";
import {
  parseLogOutput,
  parseBlameOutput,
  parseShortlogOutput,
  parseNameOnlyLog,
  parseDiffStatOutput,
  parseFileFrequency,
  parseNumstatOutput,
  parseCombinedNumstat,
  parseStaleFiles,
  parseTagOutput,
  parseRenameOutput,
  parseLineLogOutput,
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

  it("不完全なblame出力でデフォルト値を使用する", () => {
    // Blame output with commit hash and content but missing author/email/date/summary
    const raw = [
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 1 1 1",
      "filename src/test.ts",
      "\tcontent line",
    ].join("\n");

    const result = parseBlameOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].author).toBe("");
    expect(result[0].email).toBe("");
    expect(result[0].date).toBe("");
    expect(result[0].summary).toBe("");
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

  it("空ハッシュのセクションをスキップする", () => {
    // COMMIT: followed by only whitespace creates a section with empty hash
    const raw = "COMMIT:  \nCOMMIT:abc1234\nsrc/valid.ts";

    const result = parseNameOnlyLog(raw);
    expect(result.size).toBe(1);
    expect(result.get("abc1234")).toEqual(["src/valid.ts"]);
  });

  it("trims whitespace from hashes and file paths", () => {
    const raw = "COMMIT:  abc1234  \n  src/index.ts  ";

    const result = parseNameOnlyLog(raw);
    expect(result.has("abc1234")).toBe(true);
    expect(result.get("abc1234")).toEqual(["src/index.ts"]);
  });
});

describe("parseBlameOutput — edge cases", () => {
  it("commitHashが空のブロックをスキップする", () => {
    // Malformed blame data where tab-line appears without a preceding commit header
    const raw = [
      "\torphan line without commit",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 1 1 1",
      "author Alice",
      "author-mail <alice@example.com>",
      "author-time 1700000000",
      "summary Valid commit",
      "filename file.ts",
      "\tvalid line",
    ].join("\n");

    const result = parseBlameOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].commitHash).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(result[0].lines).toEqual(["valid line"]);
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

  it("プラス/マイナス記号がない場合は全量をinsertionsとする", () => {
    // Some git versions output stat lines without +/- indicators
    const raw = [
      " src/new.ts | 5 ",
      " 1 file changed, 5 insertions(+)",
    ].join("\n");

    const result = parseDiffStatOutput(raw);
    expect(result.filesChanged).toBe(1);
    expect(result.files[0].insertions).toBe(5);
    expect(result.files[0].deletions).toBe(0);
  });

  it("バイナリファイルのBin行をスキップする", () => {
    const raw = [
      " src/index.ts  | 5 +++--",
      " image.png     | Bin 0 -> 1234 bytes",
      " src/utils.ts  | 3 +++",
      " 3 files changed, 8 insertions(+), 2 deletions(-)",
    ].join("\n");

    const result = parseDiffStatOutput(raw);
    expect(result.filesChanged).toBe(2);
    expect(result.files).toHaveLength(2);
    expect(result.files.map((f) => f.path)).toEqual([
      "src/index.ts",
      "src/utils.ts",
    ]);
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

describe("parseNumstatOutput", () => {
  it("ファイルごとのchurn統計をパースする", () => {
    const raw = [
      "COMMIT:abc1234",
      "10\t5\tsrc/index.ts",
      "3\t1\tsrc/utils.ts",
      "COMMIT:def5678",
      "8\t2\tsrc/index.ts",
    ].join("\n");

    const result = parseNumstatOutput(raw);
    expect(result).toHaveLength(2);

    const indexTs = result.find((f) => f.filePath === "src/index.ts");
    expect(indexTs).toBeDefined();
    expect(indexTs!.insertions).toBe(18);
    expect(indexTs!.deletions).toBe(7);
    expect(indexTs!.totalChurn).toBe(25);
    expect(indexTs!.commits).toBe(2);
  });

  it("バイナリファイルをchurn 0として扱う", () => {
    const raw = [
      "COMMIT:abc1234",
      "-\t-\timage.png",
      "5\t2\tsrc/index.ts",
    ].join("\n");

    const result = parseNumstatOutput(raw, 10);
    const binary = result.find((f) => f.filePath === "image.png");
    expect(binary).toBeDefined();
    expect(binary!.insertions).toBe(0);
    expect(binary!.deletions).toBe(0);
    expect(binary!.totalChurn).toBe(0);
  });

  it("topNでファイル数を制限する", () => {
    const raw = [
      "COMMIT:abc1234",
      "10\t0\ta.ts",
      "5\t0\tb.ts",
      "1\t0\tc.ts",
    ].join("\n");

    const result = parseNumstatOutput(raw, 2);
    expect(result).toHaveLength(2);
    expect(result[0].filePath).toBe("a.ts");
    expect(result[1].filePath).toBe("b.ts");
  });

  it("空入力で空配列を返す", () => {
    expect(parseNumstatOutput("")).toEqual([]);
  });
});

describe("parseStaleFiles", () => {
  it("閾値以上の古いファイルを検出する", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const raw = [
      "2026-01-01T00:00:00+00:00\tsrc/old.ts",
      "2026-05-30T00:00:00+00:00\tsrc/recent.ts",
    ].join("\n");

    const result = parseStaleFiles(raw, 30, now);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("src/old.ts");
    expect(result[0].daysSinceLastChange).toBeGreaterThan(100);
  });

  it("同一ファイルの複数エントリは最新日付を使う", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const raw = [
      "2025-01-01T00:00:00+00:00\tsrc/file.ts",
      "2026-05-31T00:00:00+00:00\tsrc/file.ts",
    ].join("\n");

    const result = parseStaleFiles(raw, 30, now);
    expect(result).toHaveLength(0);
  });

  it("古い順にソートする", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const raw = [
      "2026-03-01T00:00:00+00:00\tsrc/medium.ts",
      "2025-01-01T00:00:00+00:00\tsrc/oldest.ts",
      "2026-04-01T00:00:00+00:00\tsrc/newer.ts",
    ].join("\n");

    const result = parseStaleFiles(raw, 30, now);
    expect(result[0].filePath).toBe("src/oldest.ts");
  });

  it("空入力で空配列を返す", () => {
    expect(parseStaleFiles("", 30)).toEqual([]);
  });

  it("同一ファイルの古いエントリが新しいエントリを上書きしない", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const raw = [
      "2026-05-31T00:00:00+00:00\tsrc/file.ts",
      "2025-01-01T00:00:00+00:00\tsrc/file.ts",
    ].join("\n");

    // The newer date (2026-05-31) should be kept, not overwritten by older
    const result = parseStaleFiles(raw, 30, now);
    expect(result).toHaveLength(0); // Not stale because most recent is May 31
  });

  it("タブなし行とパス空行をスキップする", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const raw = [
      "no-tab-line",
      "2025-01-01T00:00:00+00:00\t",
      "2025-01-01T00:00:00+00:00\tsrc/valid.ts",
    ].join("\n");

    const result = parseStaleFiles(raw, 30, now);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("src/valid.ts");
  });
});

describe("parseTagOutput", () => {
  it("タグ情報をパースする", () => {
    const raw = [
      "v1.0.0|2026-01-01T00:00:00+09:00|Initial release",
      "v0.9.0|2025-12-01T00:00:00+09:00|Beta release",
    ].join("\n");

    const result = parseTagOutput(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "v1.0.0",
      date: "2026-01-01T00:00:00+09:00",
      subject: "Initial release",
    });
  });

  it("subjectにパイプ文字を含む場合も正しくパースする", () => {
    const raw = "v1.0.0|2026-01-01T00:00:00+09:00|fix: handle a|b case";

    const result = parseTagOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("fix: handle a|b case");
  });

  it("空入力で空配列を返す", () => {
    expect(parseTagOutput("")).toEqual([]);
  });

  it("不正な行をスキップする", () => {
    const raw = ["v1.0.0|2026-01-01T00:00:00+09:00|OK", "malformed"].join(
      "\n",
    );

    const result = parseTagOutput(raw);
    expect(result).toHaveLength(1);
  });
});

describe("parseRenameOutput", () => {
  it("リネームエントリをパースする", () => {
    const raw = [
      "abc1234|Alice|alice@example.com|2026-01-15T10:00:00+09:00|refactor: rename utils",
      "R100\tsrc/old-utils.ts\tsrc/utils.ts",
    ].join("\n");

    const result = parseRenameOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      hash: "abc1234",
      author: "Alice",
      email: "alice@example.com",
      date: "2026-01-15T10:00:00+09:00",
      subject: "refactor: rename utils",
      oldPath: "src/old-utils.ts",
      newPath: "src/utils.ts",
    });
  });

  it("複数のリネームをパースする", () => {
    const raw = [
      "abc1234|Alice|alice@example.com|2026-01-15T10:00:00+09:00|refactor: move to src",
      "R100\tutils.ts\tsrc/utils.ts",
      "def5678|Bob|bob@example.com|2026-01-10T09:00:00+09:00|refactor: rename helper",
      "R095\thelper.ts\tutils.ts",
    ].join("\n");

    const result = parseRenameOutput(raw);
    expect(result).toHaveLength(2);
    expect(result[0].oldPath).toBe("utils.ts");
    expect(result[0].newPath).toBe("src/utils.ts");
    expect(result[1].oldPath).toBe("helper.ts");
    expect(result[1].newPath).toBe("utils.ts");
  });

  it("コミットヘッダーなしのリネーム行をスキップする", () => {
    const raw = "R100\torphan-old.ts\torphan-new.ts";
    const result = parseRenameOutput(raw);
    expect(result).toHaveLength(0);
  });

  it("空入力で空配列を返す", () => {
    expect(parseRenameOutput("")).toEqual([]);
  });

  it("リネームでない行をスキップする", () => {
    const raw = [
      "abc1234|Alice|alice@example.com|2026-01-15T10:00:00+09:00|feat: add file",
      "A\tsrc/new-file.ts",
    ].join("\n");

    const result = parseRenameOutput(raw);
    expect(result).toHaveLength(0);
  });

  it("不完全なヘッダーでデフォルト値を使用する", () => {
    // Header with hash but empty author/email/date/subject
    const raw = [
      "abc1234||||",
      "R100\told.ts\tnew.ts",
    ].join("\n");

    const result = parseRenameOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe("abc1234");
    expect(result[0].author).toBe("");
    expect(result[0].email).toBe("");
    expect(result[0].date).toBe("");
    expect(result[0].subject).toBe("");
  });
});

describe("parseCombinedNumstat", () => {
  const sampleNumstat = [
    "COMMIT:abc123",
    "5\t3\tsrc/foo.ts",
    "10\t2\tsrc/bar.ts",
    "",
    "COMMIT:def456",
    "3\t1\tsrc/foo.ts",
    "20\t0\tsrc/baz.ts",
    "",
    "COMMIT:ghi789",
    "1\t1\tsrc/foo.ts",
  ].join("\n");

  it("hotspotsとchurnを同時に算出する", () => {
    const result = parseCombinedNumstat(sampleNumstat);

    // foo.ts: 3 commits, bar.ts: 1, baz.ts: 1 → total changes = 5
    expect(result.hotspots[0].filePath).toBe("src/foo.ts");
    expect(result.hotspots[0].changeCount).toBe(3);
    expect(result.hotspots).toHaveLength(3);

    // foo: (5+3)+(3+1)+(1+1)=14 churn, baz: 20 churn, bar: 12 churn
    expect(result.churn[0].filePath).toBe("src/baz.ts");
    expect(result.churn[0].totalChurn).toBe(20);
    expect(result.churn[1].filePath).toBe("src/foo.ts");
    expect(result.churn[1].totalChurn).toBe(14);
    expect(result.churn[2].filePath).toBe("src/bar.ts");
    expect(result.churn[2].totalChurn).toBe(12);
  });

  it("topNで結果を制限する", () => {
    const result = parseCombinedNumstat(sampleNumstat, {
      hotspotsTopN: 1,
      churnTopN: 2,
    });

    expect(result.hotspots).toHaveLength(1);
    expect(result.churn).toHaveLength(2);
  });

  it("parseNumstatOutputと同じchurn結果を返す", () => {
    const combined = parseCombinedNumstat(sampleNumstat, { churnTopN: 20 });
    const legacy = parseNumstatOutput(sampleNumstat, 20);

    expect(combined.churn).toEqual(legacy);
  });

  it("空入力で空結果を返す", () => {
    const result = parseCombinedNumstat("");
    expect(result.hotspots).toEqual([]);
    expect(result.churn).toEqual([]);
  });

  it("バイナリファイル（- - path）を処理する", () => {
    const raw = ["COMMIT:aaa111", "-\t-\timage.png", "5\t0\tsrc/a.ts"].join(
      "\n",
    );
    const result = parseCombinedNumstat(raw);

    expect(result.hotspots).toHaveLength(2);
    const png = result.churn.find((c) => c.filePath === "image.png");
    expect(png?.totalChurn).toBe(0);
  });
});

describe("parseLineLogOutput", () => {
  it("git log -Lの出力をパースする", () => {
    const raw = [
      "commit abc1234def5678abc1234def5678abc1234de567",
      "Author: Alice <alice@example.com>",
      "Date:   2026-01-15 10:00:00 +0900",
      "",
      "    feat: add login function",
      "",
      "diff --git a/src/auth.ts b/src/auth.ts",
      "--- a/src/auth.ts",
      "+++ b/src/auth.ts",
      "@@ -1,3 +1,5 @@",
      " const x = 1;",
      "+function login() {}",
      "+function logout() {}",
    ].join("\n");

    const result = parseLineLogOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe("abc1234def5678abc1234def5678abc1234de567");
    expect(result[0].author).toBe("Alice");
    expect(result[0].email).toBe("alice@example.com");
    expect(result[0].date).toBe("2026-01-15 10:00:00 +0900");
    expect(result[0].subject).toBe("feat: add login function");
    expect(result[0].diff).toContain("diff --git");
    expect(result[0].diff).toContain("+function login() {}");
  });

  it("複数コミットをパースする", () => {
    const raw = [
      "commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "Author: Alice <alice@example.com>",
      "Date:   2026-01-15 10:00:00 +0900",
      "",
      "    feat: first change",
      "",
      "diff --git a/src/file.ts b/src/file.ts",
      "@@ -1,2 +1,3 @@",
      " line1",
      "+line2",
      "",
      "commit bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "Author: Bob <bob@example.com>",
      "Date:   2026-01-14 09:00:00 +0900",
      "",
      "    fix: second change",
      "",
      "diff --git a/src/file.ts b/src/file.ts",
      "@@ -1,3 +1,2 @@",
      " line1",
      "-line2",
    ].join("\n");

    const result = parseLineLogOutput(raw);
    expect(result).toHaveLength(2);
    expect(result[0].hash).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(result[0].author).toBe("Alice");
    expect(result[1].hash).toBe("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(result[1].author).toBe("Bob");
  });

  it("空入力で空配列を返す", () => {
    expect(parseLineLogOutput("")).toEqual([]);
    expect(parseLineLogOutput("  \n  ")).toEqual([]);
  });

  it("diffがないコミットでは空文字列のdiffを返す", () => {
    const raw = [
      "commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "Author: Alice <alice@example.com>",
      "Date:   2026-01-15 10:00:00 +0900",
      "",
      "    feat: initial commit",
    ].join("\n");

    const result = parseLineLogOutput(raw);
    expect(result).toHaveLength(1);
    expect(result[0].diff).toBe("");
  });
});
