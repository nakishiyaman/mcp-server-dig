import { z } from "zod";

/**
 * Git ref (commit, branch, tag) のZodスキーマ。
 * ハイフン始まりを拒否することで引数インジェクションを防止する。
 */
export const gitRefSchema = z
  .string()
  .min(1, "Git ref must not be empty")
  .refine((s) => !s.startsWith("-"), {
    message:
      "Git ref must not start with '-' (potential argument injection)",
  });

/**
 * 危険な制御文字を除去する。\n, \t, \r は保持する。
 * \x00-\x08, \x0b, \x0c, \x0e-\x1f を除去。
 */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}

/**
 * 親プロセスから継承されるとgit動作を乗っ取られる危険な環境変数。
 */
export const DANGEROUS_GIT_ENV_VARS: readonly string[] = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_CONFIG",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "GIT_CONFIG_NOSYSTEM",
  "GIT_EXEC_PATH",
  "GIT_TEMPLATE_DIR",
  "GIT_SSH",
  "GIT_SSH_COMMAND",
  "GIT_PROXY_COMMAND",
  "GIT_ASKPASS",
  "GIT_CREDENTIAL_HELPER",
] as const;

/**
 * process.envからDANGEROUS_GIT_ENV_VARSを除去したコピーを返す。
 */
export function sanitizedEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of DANGEROUS_GIT_ENV_VARS) {
    delete env[key];
  }
  return env;
}
