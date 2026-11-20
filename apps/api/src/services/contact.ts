import type { Pool } from "pg";
import { buildContactEmail, type ContactEmailInput } from "../domain/email.js";

export interface ContactMessageDto {
  id: number;
  status: "queued";
}

/**
 * Enregistre un message du formulaire de contact dans la boîte d'envoi
 * transactionnelle : le worker l'enverra par SMTP (visible dans Mailpit en local).
 * Une seule requête : l'insertion est atomique, aucun e-mail ne peut être perdu.
 */
export async function sendContactMessage(
  pool: Pool,
  recipient: string,
  input: ContactEmailInput,
): Promise<ContactMessageDto> {
  const email = buildContactEmail(input);
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO email_outbox (reservation_id, recipient, subject, body)
     VALUES (NULL, $1, $2, $3) RETURNING id`,
    [recipient, email.subject, email.body],
  );
  return { id: rows[0]!.id, status: "queued" };
}
