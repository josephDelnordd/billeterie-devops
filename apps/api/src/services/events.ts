import type { Pool } from "pg";
import type { Category } from "../domain/categories.js";
import { NotFoundError } from "../domain/errors.js";

export interface EventDto {
  id: number;
  name: string;
  description: string;
  longDescription: string;
  venue: string;
  category: Category;
  startsAt: string;
  capacity: number;
  remaining: number;
}

interface EventRow {
  id: number;
  name: string;
  description: string;
  long_description: string;
  venue: string;
  category: Category;
  starts_at: Date;
  capacity: number;
  remaining: number;
}

const COLUMNS =
  "id, name, description, long_description, venue, category, starts_at, capacity, remaining";

function toDto(row: EventRow): EventDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    longDescription: row.long_description,
    venue: row.venue,
    category: row.category,
    startsAt: row.starts_at.toISOString(),
    capacity: row.capacity,
    remaining: row.remaining,
  };
}

/** Liste les événements à venir, du plus proche au plus lointain, éventuellement filtrés par catégorie. */
export async function listEvents(
  pool: Pool,
  category?: Category,
): Promise<EventDto[]> {
  const { rows } = await pool.query<EventRow>(
    `SELECT ${COLUMNS} FROM events
     WHERE starts_at > now() AND ($1::text IS NULL OR category = $1)
     ORDER BY starts_at, id`,
    [category ?? null],
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
