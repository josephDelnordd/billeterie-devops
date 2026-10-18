import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { Pool } from "pg";
import { createPool } from "../../src/db/pool.js";
import { runMigrations } from "../../src/db/migrate.js";

export interface TestDatabase {
  pool: Pool;
  stop: () => Promise<void>;
}

/** Démarre un vrai PostgreSQL jetable (Docker requis) et applique les migrations. */
export async function startTestDatabase(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    "postgres:17-alpine",
  ).start();
  const pool = createPool(container.getConnectionUri());
  await runMigrations(pool);
  return {
    pool,
    stop: async () => {
      await pool.end();
      await container.stop();
    },
  };
}

/** Remet la base à zéro entre deux tests, en conservant le schéma. */
export async function resetData(pool: Pool): Promise<void> {
  await pool.query(
    "TRUNCATE email_outbox, reservations, events RESTART IDENTITY CASCADE",
  );
}

export async function createEvent(
  pool: Pool,
  capacity: number,
  name = "Événement de test",
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO events (name, venue, starts_at, capacity, remaining)
     VALUES ($1, 'Salle de test', now() + interval '30 days', $2, $2) RETURNING id`,
    [name, capacity],
  );
  return rows[0]!.id;
}

export async function remainingSeats(
  pool: Pool,
  eventId: number,
): Promise<number> {
  const { rows } = await pool.query<{ remaining: number }>(
    "SELECT remaining FROM events WHERE id = $1",
    [eventId],
  );
  return rows[0]!.remaining;
}
