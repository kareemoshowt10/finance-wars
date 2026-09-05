import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The integration suite needs a live Postgres and its own bootstrap; it
    // runs from vitest.integration.config.ts via `npm run test:integration`.
    exclude: ["tests/integration/**"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
