import { test } from "@fast-check/vitest";
import fc from "fast-check";
import { describe, expect } from "vitest";
import { gitRefSchema, stripControlChars } from "./validators.js";

describe("gitRefSchema プロパティテスト", () => {
  test.prop([fc.string({ minLength: 1 }).filter((s) => !s.startsWith("-"))])(
    "ハイフン始まりでない非空文字列は受け入れる",
    (input) => {
      expect(gitRefSchema.parse(input)).toBe(input);
    },
  );

  test.prop([
    fc.string({ minLength: 1 }).map((s) => (s.startsWith("-") ? s : `-${s}`)),
  ])("ハイフン始まりの文字列は常に拒否する", (input) => {
    expect(() => gitRefSchema.parse(input)).toThrow();
  });
});

describe("stripControlChars プロパティテスト", () => {
  test.prop([fc.string()])("任意入力でクラッシュしない", (input) => {
    const result = stripControlChars(input);
    expect(typeof result).toBe("string");
  });

  test.prop([fc.string()])(
    "出力に危険な制御文字を含まない",
    (input) => {
      const result = stripControlChars(input);
      // \x00-\x08, \x0b, \x0c, \x0e-\x1f should be stripped
      // eslint-disable-next-line no-control-regex
      expect(result).not.toMatch(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
    },
  );

  test.prop([fc.string()])(
    "改行・タブ・CRは保持される",
    (input) => {
      const result = stripControlChars(input);
      const newlineCount = (input.match(/\n/g) ?? []).length;
      const tabCount = (input.match(/\t/g) ?? []).length;
      const crCount = (input.match(/\r/g) ?? []).length;
      expect((result.match(/\n/g) ?? []).length).toBe(newlineCount);
      expect((result.match(/\t/g) ?? []).length).toBe(tabCount);
      expect((result.match(/\r/g) ?? []).length).toBe(crCount);
    },
  );

  test.prop([fc.string()])(
    "出力長は入力長以下",
    (input) => {
      expect(stripControlChars(input).length).toBeLessThanOrEqual(input.length);
    },
  );
});
