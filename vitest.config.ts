import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["build/**", "node_modules/**"],
    globalSetup: ["./src/tools/__tests__/global-setup.ts"],
  },
});
