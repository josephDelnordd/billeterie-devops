import { defineConfig } from "vitest/config";

// Tests d'intégration : un vrai PostgreSQL est démarré par Testcontainers (Docker requis).
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    hookTimeout: 180_000,
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
