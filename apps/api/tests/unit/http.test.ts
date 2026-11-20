import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";

// Faux pool : ces tests vérifient la couche HTTP seule. La base réelle est testée en intégration.
function fakePool(query = vi.fn()): Pool {
  return { query } as unknown as Pool;
}

const config = loadConfig({
  DATABASE_URL: "postgres://inutile",
  LOG_LEVEL: "silent",
});
let app: FastifyInstance;

async function start(pool: Pool = fakePool()) {
  app = await buildApp(config, pool);
  return app;
}

afterEach(async () => {
  await app?.close();
});

describe("sondes de santé", () => {
  it("liveness répond sans toucher à la base", async () => {
    const query = vi.fn();
    await start(fakePool(query));
    const response = await app.inject("/health/live");
    expect(response.statusCode).toBe(200);
    expect(query).not.toHaveBeenCalled();
  });

  it("readiness répond 200 quand la base répond", async () => {
    await start(
      fakePool(vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] })),
    );
    expect((await app.inject("/health/ready")).statusCode).toBe(200);
  });

  it("readiness répond 503 quand la base est en panne, sans révéler la cause", async () => {
    await start(
      fakePool(
        vi.fn().mockRejectedValue(new Error("connexion refusée sur 10.0.0.5")),
      ),
    );
    const response = await app.inject("/health/ready");
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain("10.0.0.5");
  });
});

describe("métriques", () => {
  it("expose les métriques au format Prometheus", async () => {
    await start();
    const response = await app.inject("/metrics");
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toContain("reservations_total");
  });
});

describe("validation des requêtes", () => {
  const headers = { "idempotency-key": "cle-de-test-0001" };
  const payload = {
    customerName: "Ada",
    customerEmail: "ada@example.com",
    seats: 2,
  };

  it("refuse un identifiant d’événement non numérique avec un 400", async () => {
    await start();
    const response = await app.inject("/events/abc");
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });

  it("refuse une réservation sans clé d’idempotence", async () => {
    await start();
    const response = await app.inject({
      method: "POST",
      url: "/events/1/reservations",
      payload,
    });
    expect(response.statusCode).toBe(400);
  });

  it("refuse un corps invalide sans interroger la base", async () => {
    const query = vi.fn();
    await start(fakePool(query));
    const response = await app.inject({
      method: "POST",
      url: "/events/1/reservations",
      headers,
      payload: { ...payload, seats: 0 },
    });
    expect(response.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("refuse un JSON mal formé avec un 400 et non un 500", async () => {
    await start();
    const response = await app.inject({
      method: "POST",
      url: "/events/1/reservations",
      headers: { ...headers, "content-type": "application/json" },
      payload: "{ pas du json",
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("gestion des erreurs", () => {
  it("répond 404 JSON sur une route inconnue", async () => {
    await start();
    const response = await app.inject("/n-existe-pas");
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("NOT_FOUND");
  });

  it("masque le détail d’une erreur interne", async () => {
    await start(
      fakePool(
        vi
          .fn()
          .mockRejectedValue(
            new Error('password authentication failed for user "secret"'),
          ),
      ),
    );
    const response = await app.inject("/events");
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "INTERNAL_ERROR",
      message: "Erreur interne",
    });
  });
});

describe("limitation de débit", () => {
  it("répond 429 au-delà du maximum de réservations par fenêtre", async () => {
    const limited = loadConfig({
      DATABASE_URL: "postgres://inutile",
      LOG_LEVEL: "silent",
      RATE_LIMIT_MAX: "2",
    });
    app = await buildApp(limited, fakePool());
    const call = () =>
      app.inject({
        method: "POST",
        url: "/events/1/reservations",
        headers: { "idempotency-key": "cle-de-test-0001" },
        payload: { seats: 0 },
      });

    expect((await call()).statusCode).toBe(400);
    expect((await call()).statusCode).toBe(400);
    const blocked = await call();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().code).toBe("RATE_LIMITED");
  });
});
