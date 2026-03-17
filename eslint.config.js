import eslint from "@eslint/js";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      sonarjs,
    },
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "sonarjs/cognitive-complexity": ["warn", 15],
      "complexity": ["warn", 10],
      "max-depth": ["warn", 4],
    },
  },
  {
    ignores: ["build/", "node_modules/"],
  },
);
