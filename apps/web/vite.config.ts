import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// En développement, /api est relayé vers l'API : le navigateur ne parle qu'à une seule origine,
// ce qui évite toute configuration CORS. En production, le même rôle est tenu par nginx (voir nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
