import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  it("applique les valeurs par défaut quand seule DATABASE_URL est fournie", () => {
    const config = loadConfig({ DATABASE_URL: "postgres://x" });
    expect(config).toMatchObject({
      PORT: 3000,
      HOST: "0.0.0.0",
      LOG_LEVEL: "info",
      TRUST_PROXY: false,
      RATE_LIMIT_MAX: 10,
      RATE_LIMIT_WINDOW_MS: 60_000,
    });
  });

  it("convertit les chaînes de caractères en nombres et booléens", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://x",
      PORT: "8080",
      TRUST_PROXY: "true",
    });
    expect(config.PORT).toBe(8080);
    expect(config.TRUST_PROXY).toBe(true);
  });

  it("échoue avec un message clair quand DATABASE_URL est absente", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it.each([["0"], ["70000"], ["abc"]])("refuse le port invalide %s", (port) => {
    expect(() =>
      loadConfig({ DATABASE_URL: "postgres://x", PORT: port }),
    ).toThrow(/Configuration invalide/);
  });
});
