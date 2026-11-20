import type { Pool, PoolClient } from "pg";
import { withTransaction } from "../db/transaction.js";
import { buildConfirmationEmail } from "../domain/email.js";
import { ValidationError } from "../domain/errors.js";
import {
  IdempotencyKeyReuseError,
  InsufficientSeatsError,
  NotFoundError,
} from "../domain/errors.js";

export interface ReservationPriceDto {
  id: number;
  label: string;
  amountCents: number;
}

export interface ReservationInput {
  eventId: number;
  idempotencyKey: string;
  customerName: string;
  customerEmail: string;
  seats: number;
  /** Tarif choisi (event_prices.id) : doit appartenir à l'événement. */
  priceId?: number;
}

export interface ReservationDto {
  id: number;
  eventId: number;
  customerName: string;
  customerEmail: string;
  seats: number;
  /** Tarif choisi à la réservation, s'il y en a un. */
  price: ReservationPriceDto | null;
  status: "confirmed" | "cancelled";
  createdAt: string;
}

export interface ReservationResult {
  reservation: ReservationDto;
  /** true si la clé d'idempotence avait déjà été utilisée : aucune nouvelle réservation n'a été créée. */
  replayed: boolean;
}

interface ReservationRow {
  id: number;
  event_id: number;
  customer_name: string;
  customer_email: string;
  seats: number;
  price_id: number | null;
  price_label: string | null;
  price_amount_cents: number | null;
  status: "confirmed" | "cancelled";
  created_at: Date;
}

const FOREIGN_KEY_VIOLATION = "23503";

function toDto(row: ReservationRow): ReservationDto {
  return {
    id: row.id,
    eventId: row.event_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    seats: row.seats,
    price:
      row.price_id !== null && row.price_label !== null
        ? {
            id: row.price_id,
            label: row.price_label,
            amountCents: row.price_amount_cents ?? 0,
          }
        : null,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

/** Charge une réservation avec son tarif (LEFT JOIN event_prices). */
const SELECT_WITH_PRICE = `SELECT r.*, p.label AS price_label, p.amount_cents AS price_amount_cents
  FROM reservations r LEFT JOIN event_prices p ON p.id = r.price_id`;

async function fetchReservation(
  client: PoolClient,
  where: string,
  params: unknown[],
): Promise<ReservationRow | undefined> {
  const { rows } = await client.query<ReservationRow>(`${SELECT_WITH_PRICE} WHERE ${where}`, params);
  return rows[0];
}

function sameRequest(row: ReservationRow, input: ReservationInput): boolean {
  return (
    row.event_id === input.eventId &&
    row.customer_name === input.customerName &&
    row.customer_email === input.customerEmail &&
    row.seats === input.seats &&
    row.price_id === (input.priceId ?? null)
  );
}

/**
 * Réserve des places de façon atomique (voir ADR 0003).
 *
 * Dans UNE transaction :
 *  1. on insère la réservation ; la contrainte UNIQUE sur la clé d'idempotence détecte les rejeux.
 *     C'est fait AVANT de toucher au stock : un rejeu après épuisement doit renvoyer la
 *     réservation d'origine, pas une erreur « complet » ;
 *  2. on décrémente le stock avec une mise à jour conditionnelle (`remaining >= seats`).
 *     PostgreSQL verrouille la ligne : deux demandes simultanées pour les dernières places
 *     sont sérialisées, l'une réussit et l'autre est refusée, sans survente possible ;
 *  3. on écrit l'e-mail de confirmation dans la boîte d'envoi (même transaction).
 */
export async function reserve(
  pool: Pool,
  input: ReservationInput,
): Promise<ReservationResult> {
  return withTransaction(pool, async (client) => {
    // Le tarif, s'il est fourni, doit appartenir à l'événement demandé.
    if (input.priceId !== undefined) {
      const { rowCount } = await client.query(
        "SELECT 1 FROM event_prices WHERE id = $1 AND event_id = $2",
        [input.priceId, input.eventId],
      );
      if (rowCount === 0) {
        throw new ValidationError([
          { path: "priceId", message: "Tarif inconnu pour cet événement" },
        ]);
      }
    }

    const inserted = await insertReservation(client, input);

    if (!inserted) {
      // Clé déjà connue : la ligne existante est commitée (l'INSERT a attendu si une autre
      // transaction la détenait encore). On la renvoie si, et seulement si, la demande est identique.
      const row = await fetchReservation(client, "r.idempotency_key = $1", [
        input.idempotencyKey,
      ]);
      if (!row || !sameRequest(row, input))
        throw new IdempotencyKeyReuseError();
      return { reservation: toDto(row), replayed: true };
    }

    const created = await fetchReservation(client, "r.id = $1", [inserted.id]);
    if (created) Object.assign(inserted, created);

    const updated = await client.query<{
      name: string;
      venue: string;
      starts_at: Date;
    }>(
      `UPDATE events SET remaining = remaining - $2
        WHERE id = $1 AND remaining >= $2
        RETURNING name, venue, starts_at`,
      [input.eventId, input.seats],
    );
    const event = updated.rows[0];
    // L'événement existe (la clé étrangère l'a vérifié) : si rien n'est mis à jour, il manque des places.
    // Lever l'erreur annule la transaction, donc la réservation insérée à l'étape 1.
    if (!event) throw new InsufficientSeatsError();

    const price =
      inserted.price_id !== null
        ? {
            label: inserted.price_label ?? "",
            amountCents: inserted.price_amount_cents ?? 0,
          }
        : undefined;
    const email = buildConfirmationEmail({
      customerName: input.customerName,
      eventName: event.name,
      venue: event.venue,
      startsAt: event.starts_at,
      seats: input.seats,
      reservationId: inserted.id,
      priceLabel: price?.label,
      priceAmountCents: price?.amountCents,
    });
    await client.query(
      "INSERT INTO email_outbox (reservation_id, recipient, subject, body) VALUES ($1, $2, $3, $4)",
      [inserted.id, input.customerEmail, email.subject, email.body],
    );

    return { reservation: toDto(inserted), replayed: false };
  });
}

/** Insère la réservation ; retourne null si la clé d'idempotence existe déjà. */
async function insertReservation(
  client: PoolClient,
  input: ReservationInput,
): Promise<ReservationRow | null> {
  try {
    const { rows } = await client.query<ReservationRow>(
      `INSERT INTO reservations (event_id, idempotency_key, customer_name, customer_email, seats, price_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [
        input.eventId,
        input.idempotencyKey,
        input.customerName,
        input.customerEmail,
        input.seats,
        input.priceId ?? null,
      ],
    );
    return rows[0] ?? null;
  } catch (error) {
    if ((error as { code?: string }).code === FOREIGN_KEY_VIOLATION) {
      throw new NotFoundError("Événement introuvable");
    }
    throw error;
  }
}
