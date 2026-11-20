import type { Pool } from "pg";
import type { Category } from "../domain/categories.js";
import { NotFoundError } from "../domain/errors.js";

export interface EventPriceDto {
  label: string;
  amountCents: number;
}

export interface EventDto {
  id: number;
  name: string;
  description: string;
  longDescription: string;
  prices: EventPriceDto[];
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

interface PriceRow {
  event_id: number;
  label: string;
  amount_cents: number;
}

const COLUMNS =
  "id, name, description, long_description, venue, category, starts_at, capacity, remaining";

function toDto(row: EventRow): EventDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    longDescription: row.long_description,
    prices: [],
    venue: row.venue,
    category: row.category,
    startsAt: row.starts_at.toISOString(),
    capacity: row.capacity,
    remaining: row.remaining,
  };
}

/** Attache les tarifs de chaque événement (une seule requête pour tous les ids). */
async function attachPrices(
  pool: Pool,
  dtos: EventDto[],
): Promise<EventDto[]> {
  const ids = dtos.map((dto) => dto.id);
  if (ids.length === 0) return dtos;
  const { rows } = await pool.query<PriceRow>(
    `SELECT event_id, label, amount_cents FROM event_prices
     WHERE event_id = ANY($1::bigint[])
     ORDER BY position, id`,
    [ids],
  );
  const byEvent = new Map<number, EventPriceDto[]>();
  for (const row of rows) {
    const list = byEvent.get(row.event_id) ?? [];
    list.push({ label: row.label, amountCents: row.amount_cents });
    byEvent.set(row.event_id, list);
  }
  for (const dto of dtos) {
    dto.prices = byEvent.get(dto.id) ?? [];
  }
  return dtos;
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
  return attachPrices(pool, rows.map(toDto));
}

export async function getEvent(pool: Pool, id: number): Promise<EventDto> {
  const { rows } = await pool.query<EventRow>(
    `SELECT ${COLUMNS} FROM events WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new NotFoundError("Événement introuvable");
  const dtos = await attachPrices(pool, [toDto(row)]);
  const dto = dtos[0];
  if (!dto) throw new NotFoundError("Événement introuvable");
  return dto;
}
