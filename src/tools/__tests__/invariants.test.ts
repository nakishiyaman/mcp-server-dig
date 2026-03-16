import { test } from "@fast-check/vitest";
import fc from "fast-check";
import { describe, expect } from "vitest";

import {
  successResponse,
  errorResponse,
  formatResponse,
} from "../response.js";

const MAX_OUTPUT_LENGTH = 50_000;
const TRUNCATION_SUFFIX = `\n\n[Output truncated at ${MAX_OUTPUT_LENGTH} characters]`;

describe("successResponse: 不変条件", () => {
  test.prop([fc.string()])(
    "出力が常に50,000文字+truncation suffix以内",
    (text) => {
      const response = successResponse(text);
      const output = response.content[0].text;
      const maxLen = MAX_OUTPUT_LENGTH + TRUNCATION_SUFFIX.length;
      expect(output.length).toBeLessThanOrEqual(maxLen);
    },
  );

  test.prop([fc.string()])("MCP準拠構造を返す", (text) => {
    const response = successResponse(text);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    expect(typeof response.content[0].text).toBe("string");
    expect(response.isError).toBeUndefined();
  });
});

describe("errorResponse: 不変条件", () => {
  test.prop([fc.string()])("常にisError: trueを返す（文字列入力）", (msg) => {
    const response = errorResponse(msg);
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toMatch(/^Error: /);
  });

  test.prop([fc.string()])(
    "常にisError: trueを返す（Errorオブジェクト入力）",
    (msg) => {
      const response = errorResponse(new Error(msg));
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toMatch(/^Error: /);
    },
  );

  test.prop([
    fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
    ),
  ])("任意の入力でクラッシュしない", (input) => {
    const response = errorResponse(input);
    expect(response.isError).toBe(true);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
  });
});

describe("formatResponse: 不変条件", () => {
  test.prop([fc.string(), fc.constantFrom("text", "json")])(
    "text/json両モードでMCP準拠構造を返す",
    (data, format) => {
      const response = formatResponse(
        { value: data },
        () => `text: ${data}`,
        format,
      );
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe("text");
      expect(typeof response.content[0].text).toBe("string");
      expect(response.isError).toBeUndefined();
    },
  );
});
