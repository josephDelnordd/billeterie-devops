import { defineConfig } from "vitest/config";

// Tests unitaires : aucune dépendance externe (ni base de données ni Docker).
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
