import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["contracts/test/**/*.test.ts"], testTimeout: 60_000, pool: "forks" },
});
