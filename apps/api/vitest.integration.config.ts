import { defineConfig } from "vitest/config";

// Tests d'intégration : un vrai PostgreSQL est démarré par Testcontainers (Docker requis).
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    // Le premier lancement télécharge l'image PostgreSQL.
    hookTimeout: 180_000,
    testTimeout: 60_000,
    // Un conteneur par fichier de test : on évite de lancer plusieurs conteneurs en parallèle.
    fileParallelism: false,
  },
});
