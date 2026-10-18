import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/migrate.js";
import { seedDemoEvents } from "../../src/db/seed.js";
import {
  type TestDatabase,
  createEvent,
  startTestDatabase,
} from "./helpers.js";

let db: TestDatabase;
beforeAll(async () => {
  db = await startTestDatabase();
});
afterAll(async () => {
  await db.stop();
});

describe("migrations", () => {
  it("sont idempotentes : une seconde exécution ne réapplique rien", async () => {
    expect(await runMigrations(db.pool)).toEqual([]);
  });

  it("enregistrent chaque migration appliquée", async () => {
    const { rows } = await db.pool.query("SELECT name FROM schema_migrations");
    expect(rows).toEqual([{ name: "001_init.sql" }]);
  });
});

describe("contraintes du schéma (dernier rempart contre une erreur applicative)", () => {
  it("refuse un stock restant supérieur à la capacité", async () => {
    await expect(
      db.pool.query(
        "INSERT INTO events (name, starts_at, capacity, remaining) VALUES ('x', now(), 5, 6)",
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("refuse un stock négatif", async () => {
    const id = await createEvent(db.pool, 5);
    await expect(
      db.pool.query("UPDATE events SET remaining = -1 WHERE id = $1", [id]),
    ).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("refuse une réservation de 0 place", async () => {
    const id = await createEvent(db.pool, 5);
    await expect(
      db.pool.query(
        "INSERT INTO reservations (event_id, idempotency_key, customer_name, customer_email, seats) VALUES ($1, 'k-0000001', 'A', 'a@b.fr', 0)",
        [id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});

describe("seedDemoEvents", () => {
  it("crée les événements de démonstration une seule fois", async () => {
    await db.pool.query(
      "TRUNCATE email_outbox, reservations, events RESTART IDENTITY CASCADE",
    );
    expect(await seedDemoEvents(db.pool)).toBe(3);
    expect(await seedDemoEvents(db.pool)).toBe(0);
  });
});
