import type { Pool, PoolClient } from "pg";
import { computeBackoffMs } from "./backoff.js";
import type { Mailer } from "./mailer.js";

export interface ProcessOptions {
  batchSize: number;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
}

export interface ProcessSummary {
  sent: number;
  retried: number;
  failed: number;
}

interface OutboxRow {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  attempts: number;
}

/**
 * Traite jusqu'à `batchSize` e-mails en attente. Chaque message est géré dans sa propre transaction :
 *  - `FOR UPDATE SKIP LOCKED` : plusieurs workers peuvent tourner en parallèle sans prendre le même message ;
 *  - en cas de crash pendant l'envoi, la transaction est annulée et le message sera repris
 *    (livraison « au moins une fois » : un doublon est possible, une perte ne l'est pas).
 */
export async function processOutbox(
  pool: Pool,
  mailer: Mailer,
  options: ProcessOptions,
): Promise<ProcessSummary> {
  const summary: ProcessSummary = { sent: 0, retried: 0, failed: 0 };

  for (let i = 0; i < options.batchSize; i++) {
    const outcome = await processOne(pool, mailer, options);
    if (outcome === "empty") break;
    if (outcome === "sent") summary.sent++;
    else if (outcome === "retry") summary.retried++;
    else summary.failed++;
  }
  return summary;
}

type Outcome = "empty" | "sent" | "retry" | "failed";

async function processOne(
  pool: Pool,
  mailer: Mailer,
  options: ProcessOptions,
): Promise<Outcome> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<OutboxRow>(
      `SELECT id, recipient, subject, body, attempts
         FROM email_outbox
        WHERE status = 'pending' AND next_attempt_at <= now()
        ORDER BY next_attempt_at, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
    );
    const row = rows[0];
    if (!row) {
      await client.query("COMMIT");
      return "empty";
    }

    try {
      await mailer.send({
        to: row.recipient,
        subject: row.subject,
        text: row.body,
      });
    } catch (error) {
      const outcome = await recordFailure(client, row, error, options);
      await client.query("COMMIT");
      return outcome;
    }

    await client.query(
      "UPDATE email_outbox SET status = 'sent', attempts = attempts + 1, sent_at = now(), last_error = NULL WHERE id = $1",
      [row.id],
    );
    await client.query("COMMIT");
    return "sent";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function recordFailure(
  client: PoolClient,
  row: OutboxRow,
  error: unknown,
  options: ProcessOptions,
): Promise<"retry" | "failed"> {
  const attempts = row.attempts + 1;
  // Limité : un message d'erreur SMTP peut être très long et ne doit pas gonfler la table.
  const message = (
    error instanceof Error ? error.message : String(error)
  ).slice(0, 500);

  if (attempts >= options.maxAttempts) {
    await client.query(
      "UPDATE email_outbox SET status = 'failed', attempts = $2, last_error = $3 WHERE id = $1",
      [row.id, attempts, message],
    );
    return "failed";
  }

  const delayMs = computeBackoffMs(
    attempts,
    options.backoffBaseMs,
    options.backoffMaxMs,
  );
  await client.query(
    `UPDATE email_outbox
        SET attempts = $2, last_error = $3, next_attempt_at = now() + ($4::int * interval '1 millisecond')
      WHERE id = $1`,
    [row.id, attempts, message, delayMs],
  );
  return "retry";
}
