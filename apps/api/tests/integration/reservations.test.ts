import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  IdempotencyKeyReuseError,
  InsufficientSeatsError,
  NotFoundError,
} from "../../src/domain/errors.js";
import {
  type ReservationInput,
  reserve,
} from "../../src/services/reservations.js";
import {
  type TestDatabase,
  createEvent,
  remainingSeats,
  resetData,
  startTestDatabase,
} from "./helpers.js";

let db: TestDatabase;
beforeAll(async () => {
  db = await startTestDatabase();
});
afterAll(async () => {
  await db.stop();
});
beforeEach(async () => {
  await resetData(db.pool);
});

function input(
  eventId: number,
  overrides: Partial<ReservationInput> = {},
): ReservationInput {
  return {
    eventId,
    idempotencyKey: `cle-${Math.random().toString(36).slice(2)}-test`,
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    seats: 1,
    ...overrides,
  };
}

async function count(table: "reservations" | "email_outbox"): Promise<number> {
  const { rows } = await db.pool.query<{ n: number }>(
    `SELECT count(*) AS n FROM ${table}`,
  );
  return rows[0]!.n;
}

describe("reserve", () => {
  it("confirme la réservation, décrémente le stock et met un e-mail en file", async () => {
    const eventId = await createEvent(db.pool, 10);

    const { reservation, replayed } = await reserve(
      db.pool,
      input(eventId, { seats: 3 }),
    );

    expect(replayed).toBe(false);
    expect(reservation).toMatchObject({
      eventId,
      seats: 3,
      status: "confirmed",
    });
    expect(await remainingSeats(db.pool, eventId)).toBe(7);

    const { rows } = await db.pool.query("SELECT * FROM email_outbox");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reservation_id: reservation.id,
      recipient: "ada@example.com",
      status: "pending",
    });
    expect(rows[0].subject).toContain(`n°${reservation.id}`);
  });

  it("refuse quand il manque des places, sans rien modifier", async () => {
    const eventId = await createEvent(db.pool, 2);

    await expect(
      reserve(db.pool, input(eventId, { seats: 3 })),
    ).rejects.toBeInstanceOf(InsufficientSeatsError);

    expect(await remainingSeats(db.pool, eventId)).toBe(2);
    expect(await count("reservations")).toBe(0);
    expect(await count("email_outbox")).toBe(0);
  });

  it("permet de réserver exactement les dernières places", async () => {
    const eventId = await createEvent(db.pool, 4);
    await reserve(db.pool, input(eventId, { seats: 4 }));
    expect(await remainingSeats(db.pool, eventId)).toBe(0);
  });

  it("répond « introuvable » pour un événement inexistant", async () => {
    await expect(reserve(db.pool, input(999_999))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await count("reservations")).toBe(0);
  });
});

describe("idempotence", () => {
  it("un rejeu renvoie la réservation d’origine sans consommer de place supplémentaire", async () => {
    const eventId = await createEvent(db.pool, 10);
    const request = input(eventId, { seats: 2 });

    const first = await reserve(db.pool, request);
    const second = await reserve(db.pool, request);

    expect(second.replayed).toBe(true);
    expect(second.reservation.id).toBe(first.reservation.id);
    expect(await remainingSeats(db.pool, eventId)).toBe(8);
    expect(await count("reservations")).toBe(1);
    expect(await count("email_outbox")).toBe(1);
  });

  it("un rejeu réussit même si l’événement est devenu complet entre-temps", async () => {
    const eventId = await createEvent(db.pool, 2);
    const request = input(eventId, { seats: 2 });
    const first = await reserve(db.pool, request);
    expect(await remainingSeats(db.pool, eventId)).toBe(0);

    const replay = await reserve(db.pool, request);

    expect(replay.replayed).toBe(true);
    expect(replay.reservation.id).toBe(first.reservation.id);
  });

  it("refuse la réutilisation d’une clé pour une demande différente", async () => {
    const eventId = await createEvent(db.pool, 10);
    const request = input(eventId, { seats: 2 });
    await reserve(db.pool, request);

    await expect(
      reserve(db.pool, { ...request, seats: 5 }),
    ).rejects.toBeInstanceOf(IdempotencyKeyReuseError);
    expect(await remainingSeats(db.pool, eventId)).toBe(8);
  });

  it("une tentative refusée (complet) ne bloque pas la clé : elle peut être réessayée plus tard", async () => {
    const eventId = await createEvent(db.pool, 1);
    await reserve(db.pool, input(eventId, { seats: 1 }));
    const request = input(eventId, { seats: 1 });

    await expect(reserve(db.pool, request)).rejects.toBeInstanceOf(
      InsufficientSeatsError,
    );
    await db.pool.query("UPDATE events SET remaining = 1 WHERE id = $1", [
      eventId,
    ]);

    await expect(reserve(db.pool, request)).resolves.toMatchObject({
      replayed: false,
    });
  });
});

describe("concurrence : jamais de survente (exigence de la charte projet)", () => {
  it("50 demandes simultanées pour 10 places : exactement 10 réussissent", async () => {
    const eventId = await createEvent(db.pool, 10);

    const outcomes = await Promise.allSettled(
      Array.from({ length: 50 }, () => reserve(db.pool, input(eventId))),
    );

    const succeeded = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );
    const refused = outcomes.filter(
      (outcome) =>
        outcome.status === "rejected" &&
        outcome.reason instanceof InsufficientSeatsError,
    );
    expect(succeeded).toHaveLength(10);
    expect(refused).toHaveLength(40);
    expect(await remainingSeats(db.pool, eventId)).toBe(0);
    expect(await count("reservations")).toBe(10);
    expect(await count("email_outbox")).toBe(10);
  });

  it("les places vendues ne dépassent jamais la capacité, avec des tailles de demande variées", async () => {
    const eventId = await createEvent(db.pool, 20);

    await Promise.allSettled(
      Array.from({ length: 40 }, (_, i) =>
        reserve(db.pool, input(eventId, { seats: (i % 4) + 1 })),
      ),
    );

    const { rows } = await db.pool.query<{ sold: number }>(
      "SELECT coalesce(sum(seats), 0) AS sold FROM reservations WHERE status = 'confirmed'",
    );
    const sold = Number(rows[0]!.sold);
    expect(sold).toBeLessThanOrEqual(20);
    expect(await remainingSeats(db.pool, eventId)).toBe(20 - sold);
  });

  it("20 envois simultanés de la MÊME demande ne créent qu’une réservation", async () => {
    const eventId = await createEvent(db.pool, 10);
    const request = input(eventId, { seats: 2 });

    const results = await Promise.all(
      Array.from({ length: 20 }, () => reserve(db.pool, request)),
    );

    expect(results.filter((result) => !result.replayed)).toHaveLength(1);
    expect(new Set(results.map((result) => result.reservation.id)).size).toBe(
      1,
    );
    expect(await remainingSeats(db.pool, eventId)).toBe(8);
    expect(await count("reservations")).toBe(1);
  });
});
