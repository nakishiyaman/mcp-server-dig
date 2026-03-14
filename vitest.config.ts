import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["build/**", "node_modules/**"],
    globalSetup: ["./src/tools/__tests__/global-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/tools/__tests__/**",
        "src/git/types.ts",
      ],
      reporter: ["text", "text-summary", "lcov"],
      thresholds: {
        statements: 50,
        branches: 84,
        functions: 50,
        lines: 50,
      },
    },
  },
});
