import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";
import {
  type TestDatabase,
  createEvent,
  resetData,
  startTestDatabase,
} from "./helpers.js";

let db: TestDatabase;
let app: FastifyInstance;

beforeAll(async () => {
  db = await startTestDatabase();
  // Limite relevée : ces tests envoient beaucoup de requêtes depuis la même IP.
  const config = loadConfig({
    DATABASE_URL: "postgres://inutile",
    LOG_LEVEL: "silent",
    RATE_LIMIT_MAX: "1000",
  });
  app = await buildApp(config, db.pool);
});
afterAll(async () => {
  await app.close();
  await db.stop();
});
beforeEach(async () => {
  await resetData(db.pool);
});

const payload = {
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  seats: 2,
};
const post = (eventId: number | string, key: string, body: unknown = payload) =>
  app.inject({
    method: "POST",
    url: `/events/${eventId}/reservations`,
    headers: { "idempotency-key": key },
    payload: body as object,
  });

describe("GET /events", () => {
  it("liste les événements à venir avec leurs places restantes et leur catégorie", async () => {
    await createEvent(db.pool, 50, "Concert", "musique");
    const response = await app.inject("/events");
    expect(response.statusCode).toBe(200);
    expect(response.json().events).toEqual([
      expect.objectContaining({
        name: "Concert",
        category: "musique",
        capacity: 50,
        remaining: 50,
      }),
    ]);
  });

  it("n’expose pas les événements passés", async () => {
    await db.pool.query(
      "INSERT INTO events (name, category, starts_at, capacity, remaining) VALUES ('Passé', 'sport', now() - interval '1 day', 5, 5)",
    );
    expect((await app.inject("/events")).json().events).toEqual([]);
  });

  it("filtre par catégorie avec ?category=", async () => {
    await createEvent(db.pool, 50, "Concert", "musique");
    await createEvent(db.pool, 30, "Match", "sport");
    const response = await app.inject("/events?category=sport");
    expect(response.statusCode).toBe(200);
    expect(response.json().events).toEqual([
      expect.objectContaining({ name: "Match", category: "sport" }),
    ]);
  });

  it("répond 400 pour une catégorie inconnue", async () => {
    const response = await app.inject("/events?category=cinema");
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /events/:id", () => {
  it("retourne le détail d’un événement", async () => {
    const id = await createEvent(db.pool, 5, "Théâtre");
    const response = await app.inject(`/events/${id}`);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id, name: "Théâtre" });
  });

  it("retourne les tarifs de l’événement (plusieurs prix par catégorie de billet)", async () => {
    const id = await createEvent(db.pool, 10, "Concert");
    await db.pool.query(
      "INSERT INTO event_prices (event_id, label, amount_cents, position) VALUES ($1, 'Plein tarif', 2200, 1), ($1, 'Réduit', 1500, 2)",
      [id],
    );
    const response = await app.inject(`/events/${id}`);
    expect(response.statusCode).toBe(200);
    expect(response.json().prices).toEqual([
      { label: "Plein tarif", amountCents: 2200 },
      { label: "Réduit", amountCents: 1500 },
    ]);
  });

  it("répond 404 pour un événement inexistant", async () => {
    expect((await app.inject("/events/123456")).statusCode).toBe(404);
  });
});

describe("POST /events/:id/reservations", () => {
  it("crée la réservation (201) et décrémente le stock visible", async () => {
    const id = await createEvent(db.pool, 10);
    const response = await post(id, "cle-http-0001");

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      eventId: id,
      seats: 2,
      status: "confirmed",
    });
    expect((await app.inject(`/events/${id}`)).json().remaining).toBe(8);
  });

  it("répond 200 (et non 201) pour un rejeu, avec la même réservation", async () => {
    const id = await createEvent(db.pool, 10);
    const first = await post(id, "cle-http-0002");
    const replay = await post(id, "cle-http-0002");

    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(first.json().id);
    expect((await app.inject(`/events/${id}`)).json().remaining).toBe(8);
  });

  it("répond 409 quand il ne reste pas assez de places", async () => {
    const id = await createEvent(db.pool, 1);
    const response = await post(id, "cle-http-0003");
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("INSUFFICIENT_SEATS");
  });

  it("répond 422 quand une clé est réutilisée pour une autre demande", async () => {
    const id = await createEvent(db.pool, 10);
    await post(id, "cle-http-0004");
    const response = await post(id, "cle-http-0004", { ...payload, seats: 5 });
    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("répond 404 pour un événement inexistant", async () => {
    expect((await post(987654, "cle-http-0005")).statusCode).toBe(404);
  });

  it("résiste à une tentative d’injection SQL dans le nom (requêtes paramétrées)", async () => {
    const id = await createEvent(db.pool, 10);
    const response = await post(id, "cle-http-0006", {
      ...payload,
      customerName: "x'); DROP TABLE events;--",
    });
    expect(response.statusCode).toBe(201);
    expect((await app.inject(`/events/${id}`)).statusCode).toBe(200);
  });

  it("sous charge concurrente HTTP : jamais plus de réservations que de places", async () => {
    const id = await createEvent(db.pool, 5);
    const responses = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        post(id, `cle-charge-${String(i).padStart(4, "0")}`, {
          ...payload,
          seats: 1,
        }),
      ),
    );
    const codes = responses.map((response) => response.statusCode);
    expect(codes.filter((code) => code === 201)).toHaveLength(5);
    expect(codes.filter((code) => code === 409)).toHaveLength(25);
    expect((await app.inject(`/events/${id}`)).json().remaining).toBe(0);
  });
});

describe("sondes et métriques avec une vraie base", () => {
  it("readiness répond 200", async () => {
    expect((await app.inject("/health/ready")).statusCode).toBe(200);
  });

  it("comptabilise les réservations dans les métriques", async () => {
    const id = await createEvent(db.pool, 10);
    await post(id, "cle-metrique-01");
    const metrics = (await app.inject("/metrics")).body;
    expect(metrics).toMatch(/reservations_total\{outcome="confirmed"\} [1-9]/);
  });
});

describe("POST /contact", () => {
  const contactPayload = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    subject: "Question sur une réservation",
    message: "Bonjour, est-il possible de changer de date ?",
  };

  it("enregistre le message dans la boîte d'envoi et répond 201", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contact",
      payload: contactPayload,
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ status: "queued" });

    const { rows } = await db.pool.query(
      "SELECT reservation_id, recipient, subject, body FROM email_outbox",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reservation_id: null,
      recipient: "bonjour@placelibre.example",
    });
    expect(rows[0]!.subject).toContain("[Contact]");
    expect(rows[0]!.subject).toContain("Question sur une réservation");
    expect(rows[0]!.body).toContain("ada@example.com");
    expect(rows[0]!.body).toContain("changer de date");
  });

  it("accepte un sujet facultatif", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contact",
      payload: { name: "Ada", email: "ada@example.com", message: "Une question de plus, longue de dix caractères." },
    });
    expect(response.statusCode).toBe(201);
    const { rows } = await db.pool.query("SELECT subject FROM email_outbox");
    expect(rows[0]!.subject).toContain("Message depuis le site");
  });

  it("rejette un message invalide avec 400 et le détail des champs", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contact",
      payload: { name: "", email: "pas-un-email", message: "court" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
    expect((await db.pool.query("SELECT count(*)::int AS n FROM email_outbox")).rows[0]!.n).toBe(0);
  });

  it("rejette un corps avec des clés inconnues (strict)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contact",
      payload: { ...contactPayload, hacker: "x" },
    });
    expect(response.statusCode).toBe(400);
  });
});
