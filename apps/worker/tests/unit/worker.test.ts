import { describe, expect, it } from "vitest";
import { computeBackoffMs } from "../../src/backoff.js";
import { loadConfig } from "../../src/config.js";

describe("computeBackoffMs", () => {
  it("double le délai à chaque échec", () => {
    expect(computeBackoffMs(1, 1000, 1_000_000)).toBe(1000);
    expect(computeBackoffMs(2, 1000, 1_000_000)).toBe(2000);
    expect(computeBackoffMs(3, 1000, 1_000_000)).toBe(4000);
    expect(computeBackoffMs(4, 1000, 1_000_000)).toBe(8000);
  });

  it("plafonne le délai au maximum configuré", () => {
    expect(computeBackoffMs(10, 1000, 5000)).toBe(5000);
  });

  it("ne déborde pas vers Infinity pour un très grand nombre de tentatives", () => {
    expect(computeBackoffMs(10_000, 1000, 60_000)).toBe(60_000);
  });

  it("ne retarde pas quand il n’y a eu aucun échec", () => {
    expect(computeBackoffMs(0, 1000, 5000)).toBe(0);
  });
});

describe("loadConfig (worker)", () => {
  it("applique les valeurs par défaut adaptées à Mailpit en local", () => {
    const config = loadConfig({ DATABASE_URL: "postgres://x" });
    expect(config).toMatchObject({
      SMTP_HOST: "localhost",
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      MAX_ATTEMPTS: 5,
      BATCH_SIZE: 20,
    });
  });

  it("échoue quand DATABASE_URL est absente", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("refuse une taille de lot excessive", () => {
    expect(() =>
      loadConfig({ DATABASE_URL: "postgres://x", BATCH_SIZE: "100000" }),
    ).toThrow(/Configuration invalide/);
  });
});
