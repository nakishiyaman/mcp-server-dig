import { test } from "@fast-check/vitest";
import fc from "fast-check";
import { describe, expect } from "vitest";

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
  parseRenameOutput,
  parseTagOutput,
  parseLineLogOutput,
} from "./parsers.js";
import {
  CommitInfoSchema,
  BlameBlockSchema,
  ContributorStatsSchema,
  DiffStatSchema,
  FileHotspotSchema,
  FileChurnSchema,
  StaleFileSchema,
  RenameEntrySchema,
  TagInfoSchema,
  LineHistoryEntrySchema,
} from "./output-schemas.js";

describe("パーサープロパティテスト: 任意入力でクラッシュしない", () => {
  test.prop([fc.string()])("parseLogOutput", (input) => {
    const result = parseLogOutput(input);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => CommitInfoSchema.parse(item));
  });

  test.prop([fc.string()])("parseBlameOutput", (input) => {
    const result = parseBlameOutput(input);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => BlameBlockSchema.parse(item));
  });

  test.prop([fc.string(), fc.nat()])(
    "parseShortlogOutput",
    (input, totalCommits) => {
      const result = parseShortlogOutput(input, totalCommits);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((item) => ContributorStatsSchema.parse(item));
    },
  );

  test.prop([fc.string()])("parseNameOnlyLog", (input) => {
    const result = parseNameOnlyLog(input);
    expect(result).toBeInstanceOf(Map);
  });

  test.prop([fc.string()])("parseDiffStatOutput", (input) => {
    const result = parseDiffStatOutput(input);
    DiffStatSchema.parse(result);
  });

  test.prop([fc.string(), fc.integer({ min: 1, max: 1000 })])(
    "parseFileFrequency",
    (input, topN) => {
      const result = parseFileFrequency(input, topN);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((item) => FileHotspotSchema.parse(item));
    },
  );

  test.prop([fc.string(), fc.integer({ min: 1, max: 1000 })])(
    "parseNumstatOutput",
    (input, topN) => {
      const result = parseNumstatOutput(input, topN);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((item) => FileChurnSchema.parse(item));
    },
  );

  test.prop([fc.string()])("parseCombinedNumstat", (input) => {
    const result = parseCombinedNumstat(input);
    expect(Array.isArray(result.hotspots)).toBe(true);
    expect(Array.isArray(result.churn)).toBe(true);
    result.hotspots.forEach((item) => FileHotspotSchema.parse(item));
    result.churn.forEach((item) => FileChurnSchema.parse(item));
  });

  test.prop([fc.string(), fc.integer({ min: 1, max: 1000 }), fc.date()])(
    "parseStaleFiles",
    (input, thresholdDays, now) => {
      const result = parseStaleFiles(input, thresholdDays, now);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((item) => StaleFileSchema.parse(item));
    },
  );

  test.prop([fc.string()])("parseRenameOutput", (input) => {
    const result = parseRenameOutput(input);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => RenameEntrySchema.parse(item));
  });

  test.prop([fc.string()])("parseTagOutput", (input) => {
    const result = parseTagOutput(input);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => TagInfoSchema.parse(item));
  });

  test.prop([fc.string()])("parseLineLogOutput", (input) => {
    const result = parseLineLogOutput(input);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => LineHistoryEntrySchema.parse(item));
  });
});

describe("パーサープロパティテスト: 不変条件", () => {
  test.prop([fc.string()])("parseLogOutput: 出力が常にArray", (input) => {
    const result = parseLogOutput(input);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => CommitInfoSchema.parse(item));
  });

  test.prop([fc.string()])(
    "parseBlameOutput: 各エントリにcommitHashが存在",
    (input) => {
      const blocks = parseBlameOutput(input);
      blocks.forEach((block) => BlameBlockSchema.parse(block));
    },
  );

  test.prop([fc.string()])(
    "parseDiffStatOutput: insertions/deletions >= 0",
    (input) => {
      const result = parseDiffStatOutput(input);
      DiffStatSchema.parse(result);
    },
  );

  test.prop([fc.string()])(
    "parseCombinedNumstat: hotspots/churnが常にArray",
    (input) => {
      const result = parseCombinedNumstat(input);
      result.hotspots.forEach((item) => FileHotspotSchema.parse(item));
      result.churn.forEach((item) => FileChurnSchema.parse(item));
    },
  );

  test.prop([fc.string(), fc.integer({ min: 1, max: 1000 }), fc.date()])(
    "parseStaleFiles: daysSinceLastChange >= 0",
    (input, thresholdDays, now) => {
      const results = parseStaleFiles(input, thresholdDays, now);
      results.forEach((file) => StaleFileSchema.parse(file));
    },
  );
});
