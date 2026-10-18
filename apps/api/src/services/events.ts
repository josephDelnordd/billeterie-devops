import type { Pool } from "pg";
import { NotFoundError } from "../domain/errors.js";

export interface EventDto {
  id: number;
  name: string;
  description: string;
  venue: string;
  startsAt: string;
  capacity: number;
  remaining: number;
}

interface EventRow {
  id: number;
  name: string;
  description: string;
  venue: string;
  starts_at: Date;
  capacity: number;
  remaining: number;
}

const COLUMNS = "id, name, description, venue, starts_at, capacity, remaining";

function toDto(row: EventRow): EventDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    venue: row.venue,
    startsAt: row.starts_at.toISOString(),
    capacity: row.capacity,
    remaining: row.remaining,
  };
}

/** Liste les événements à venir, du plus proche au plus lointain. */
export async function listEvents(pool: Pool): Promise<EventDto[]> {
  const { rows } = await pool.query<EventRow>(
    `SELECT ${COLUMNS} FROM events WHERE starts_at > now() ORDER BY starts_at, id`,
  );
  return rows.map(toDto);
}

export async function getEvent(pool: Pool, id: number): Promise<EventDto> {
  const { rows } = await pool.query<EventRow>(
    `SELECT ${COLUMNS} FROM events WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new NotFoundError("Événement introuvable");
  return toDto(row);
}
