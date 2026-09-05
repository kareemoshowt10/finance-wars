import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Integration suite: real Postgres, real Prisma, real route handlers.
 *
 * Kept separate from vitest.config.ts so `npm test` stays a fast, dependency-
 * free unit run.
 */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/globalSetup.ts"],
    setupFiles: ["tests/integration/nextContext.ts"],
    // Every file truncates the shared database in beforeEach, so files must
    // not overlap.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://debtsucker:debtsucker@localhost:5432/debtsucker_test",
      DIRECT_URL: process.env.TEST_DATABASE_URL || "postgresql://debtsucker:debtsucker@localhost:5432/debtsucker_test",
      JWT_SECRET: "integration-test-secret",
      NODE_ENV: "test",
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
