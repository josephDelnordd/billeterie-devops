import type { Pool, PoolClient } from "pg";
import { withTransaction } from "../db/transaction.js";
import { buildConfirmationEmail } from "../domain/email.js";
import {
  IdempotencyKeyReuseError,
  InsufficientSeatsError,
  NotFoundError,
} from "../domain/errors.js";

export interface ReservationInput {
  eventId: number;
  idempotencyKey: string;
  customerName: string;
  customerEmail: string;
  seats: number;
}

export interface ReservationDto {
  id: number;
  eventId: number;
  customerName: string;
  customerEmail: string;
  seats: number;
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
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

function sameRequest(row: ReservationRow, input: ReservationInput): boolean {
  return (
    row.event_id === input.eventId &&
    row.customer_name === input.customerName &&
    row.customer_email === input.customerEmail &&
    row.seats === input.seats
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
    const inserted = await insertReservation(client, input);

    if (!inserted) {
      // Clé déjà connue : la ligne existante est commitée (l'INSERT a attendu si une autre
      // transaction la détenait encore). On la renvoie si, et seulement si, la demande est identique.
      const existing = await client.query<ReservationRow>(
        "SELECT * FROM reservations WHERE idempotency_key = $1",
        [input.idempotencyKey],
      );
      const row = existing.rows[0];
      if (!row || !sameRequest(row, input))
        throw new IdempotencyKeyReuseError();
      return { reservation: toDto(row), replayed: true };
    }

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

    const email = buildConfirmationEmail({
      customerName: input.customerName,
      eventName: event.name,
      venue: event.venue,
      startsAt: event.starts_at,
      seats: input.seats,
      reservationId: inserted.id,
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
      `INSERT INTO reservations (event_id, idempotency_key, customer_name, customer_email, seats)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [
        input.eventId,
        input.idempotencyKey,
        input.customerName,
        input.customerEmail,
        input.seats,
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
