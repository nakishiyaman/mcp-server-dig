import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  gitRefSchema,
  stripControlChars,
  DANGEROUS_GIT_ENV_VARS,
  sanitizedEnv,
} from "./validators.js";

describe("gitRefSchema", () => {
  it("有効なコミットハッシュを受け入れる", () => {
    expect(gitRefSchema.parse("abc123")).toBe("abc123");
  });

  it("有効なブランチ名を受け入れる", () => {
    expect(gitRefSchema.parse("main")).toBe("main");
    expect(gitRefSchema.parse("feature/foo")).toBe("feature/foo");
    expect(gitRefSchema.parse("v1.0.0")).toBe("v1.0.0");
  });

  it("HEADを受け入れる", () => {
    expect(gitRefSchema.parse("HEAD")).toBe("HEAD");
    expect(gitRefSchema.parse("HEAD~3")).toBe("HEAD~3");
    expect(gitRefSchema.parse("HEAD^2")).toBe("HEAD^2");
  });

  it("ハイフン始まりの引数を拒否する", () => {
    expect(() => gitRefSchema.parse("--upload-pack=evil")).toThrow();
    expect(() => gitRefSchema.parse("-c")).toThrow();
    expect(() => gitRefSchema.parse("--exec=malicious")).toThrow();
  });

  it("空文字列を拒否する", () => {
    expect(() => gitRefSchema.parse("")).toThrow();
  });

  it("スキーマをzodオブジェクトで使用できる", () => {
    const schema = z.object({ ref: gitRefSchema });
    expect(schema.parse({ ref: "main" })).toEqual({ ref: "main" });
    expect(() => schema.parse({ ref: "--evil" })).toThrow();
  });
});

describe("stripControlChars", () => {
  it("通常のテキストはそのまま返す", () => {
    expect(stripControlChars("hello world")).toBe("hello world");
  });

  it("改行・タブ・CRは保持する", () => {
    expect(stripControlChars("line1\nline2\ttab\rreturn")).toBe(
      "line1\nline2\ttab\rreturn",
    );
  });

  it("NULバイトを除去する", () => {
    expect(stripControlChars("hello\x00world")).toBe("helloworld");
  });

  it("ANSIエスケープシーケンスの制御文字を除去する", () => {
    expect(stripControlChars("before\x1b[31mred\x1b[0mafter")).toBe(
      "before[31mred[0mafter",
    );
  });

  it("その他の制御文字を除去する", () => {
    expect(stripControlChars("a\x01b\x02c\x07d\x08e\x0bf\x0cg\x0eh")).toBe(
      "abcdefgh",
    );
  });

  it("空文字列を処理できる", () => {
    expect(stripControlChars("")).toBe("");
  });
});

describe("DANGEROUS_GIT_ENV_VARS", () => {
  it("GIT_DIRを含む", () => {
    expect(DANGEROUS_GIT_ENV_VARS).toContain("GIT_DIR");
  });

  it("GIT_WORK_TREEを含む", () => {
    expect(DANGEROUS_GIT_ENV_VARS).toContain("GIT_WORK_TREE");
  });

  it("GIT_CONFIG系を含む", () => {
    expect(
      DANGEROUS_GIT_ENV_VARS.some((v) => v.startsWith("GIT_CONFIG")),
    ).toBe(true);
  });
});

describe("sanitizedEnv", () => {
  it("危険なGIT_*変数を除去する", () => {
    const original = { ...process.env };
    try {
      process.env["GIT_DIR"] = "/evil";
      process.env["GIT_WORK_TREE"] = "/evil";
      process.env["HOME"] = "/home/user";

      const env = sanitizedEnv();
      expect(env["GIT_DIR"]).toBeUndefined();
      expect(env["GIT_WORK_TREE"]).toBeUndefined();
      expect(env["HOME"]).toBe("/home/user");
    } finally {
      // Restore
      for (const key of Object.keys(process.env)) {
        if (!(key in original)) {
          delete process.env[key];
        }
      }
      for (const [key, value] of Object.entries(original)) {
        process.env[key] = value;
      }
    }
  });

  it("安全な環境変数はそのまま残す", () => {
    const env = sanitizedEnv();
    expect(env["PATH"]).toBeDefined();
  });
});
