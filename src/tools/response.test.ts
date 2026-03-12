import { describe, it, expect } from "vitest";
import { formatResponse, outputFormatSchema } from "./response.js";

describe("outputFormatSchema", () => {
  it("デフォルトはtextを返す", () => {
    expect(outputFormatSchema.parse(undefined)).toBe("text");
  });

  it("textを受け入れる", () => {
    expect(outputFormatSchema.parse("text")).toBe("text");
  });

  it("jsonを受け入れる", () => {
    expect(outputFormatSchema.parse("json")).toBe("json");
  });

  it("不正な値を拒否する", () => {
    expect(() => outputFormatSchema.parse("xml")).toThrow();
  });
});

describe("formatResponse", () => {
  const sampleData = { files: ["a.ts", "b.ts"], count: 2 };
  const textFormatter = () => "Files: a.ts, b.ts (2 total)";

  it("textモードでテキストフォーマッターの出力を返す", () => {
    const result = formatResponse(sampleData, textFormatter, "text");
    expect(result.content[0].text).toBe("Files: a.ts, b.ts (2 total)");
    expect(result.isError).toBeUndefined();
  });

  it("jsonモードで構造化データをJSON文字列で返す", () => {
    const result = formatResponse(sampleData, textFormatter, "json");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(sampleData);
    expect(result.isError).toBeUndefined();
  });

  it("jsonモードで50,000文字を超える場合truncateされる", () => {
    const largeData = { text: "x".repeat(60_000) };
    const result = formatResponse(largeData, () => "short", "json");
    expect(result.content[0].text).toContain("[Output truncated at 50000 characters]");
  });

  it("textモードで50,000文字を超える場合truncateされる", () => {
    const result = formatResponse({}, () => "y".repeat(60_000), "text");
    expect(result.content[0].text).toContain("[Output truncated at 50000 characters]");
  });
});
