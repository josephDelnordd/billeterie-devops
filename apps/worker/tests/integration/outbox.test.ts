import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Mailer, OutgoingEmail } from "../../src/mailer.js";
import { type ProcessOptions, processOutbox } from "../../src/outbox.js";

// On applique le VRAI schéma de l'API : ces tests détecteraient une divergence entre les deux paquets.
const SCHEMA_PATH = fileURLToPath(
  new URL("../../../api/src/db/migrations/001_init.sql", import.meta.url),
);

const options: ProcessOptions = {
  batchSize: 50,
  maxAttempts: 3,
  backoffBaseMs: 60_000,
  backoffMaxMs: 3_600_000,
};

let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
let pool: pg.Pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  pool = new pg.Pool({ connectionString: container.getConnectionUri() });
  await pool.query(await readFile(SCHEMA_PATH, "utf8"));
});
afterAll(async () => {
  await pool.end();
  await container.stop();
});
beforeEach(async () => {
  await pool.query(
    "TRUNCATE email_outbox, reservations, events RESTART IDENTITY CASCADE",
  );
});

class FakeMailer implements Mailer {
  sent: OutgoingEmail[] = [];
  constructor(private readonly failWith?: Error) {}
  async send(email: OutgoingEmail): Promise<void> {
    if (this.failWith) throw this.failWith;
    // Petite attente pour que deux workers concurrents se chevauchent réellement.
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.sent.push(email);
  }
}

/** Crée n e-mails en attente (avec l'événement et la réservation exigés par les clés étrangères). */
async function enqueue(count: number): Promise<void> {
  await pool.query(
    "INSERT INTO events (name, starts_at, capacity, remaining) VALUES ('E', now() + interval '1 day', 100, 100)",
  );
  for (let i = 1; i <= count; i++) {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO reservations (event_id, idempotency_key, customer_name, customer_email, seats)
       VALUES (1, $1, 'Ada', 'ada@example.com', 1) RETURNING id`,
      [`cle-worker-${String(i).padStart(4, "0")}`],
    );
    await pool.query(
      "INSERT INTO email_outbox (reservation_id, recipient, subject, body) VALUES ($1, 'ada@example.com', $2, 'corps')",
      [rows[0]!.id, `Sujet ${i}`],
    );
  }
}

const statuses = async () =>
  (
    await pool.query<{
      status: string;
      attempts: number;
      last_error: string | null;
    }>("SELECT status, attempts, last_error FROM email_outbox ORDER BY id")
  ).rows;

describe("processOutbox", () => {
  it("envoie les e-mails en attente et les marque comme envoyés", async () => {
    await enqueue(3);
    const mailer = new FakeMailer();

    const summary = await processOutbox(pool, mailer, options);

    expect(summary).toEqual({ sent: 3, retried: 0, failed: 0 });
    expect(mailer.sent.map((email) => email.subject)).toEqual([
      "Sujet 1",
      "Sujet 2",
      "Sujet 3",
    ]);
    expect(
      (await statuses()).every(
        (row) => row.status === "sent" && row.attempts === 1,
      ),
    ).toBe(true);
  });

  it("ne renvoie jamais un e-mail déjà envoyé", async () => {
    await enqueue(2);
    const mailer = new FakeMailer();
    await processOutbox(pool, mailer, options);
    await processOutbox(pool, mailer, options);
    expect(mailer.sent).toHaveLength(2);
  });

  it("ne fait rien quand la file est vide", async () => {
    expect(await processOutbox(pool, new FakeMailer(), options)).toEqual({
      sent: 0,
      retried: 0,
      failed: 0,
    });
  });

  it("respecte la taille de lot", async () => {
    await enqueue(5);
    const summary = await processOutbox(pool, new FakeMailer(), {
      ...options,
      batchSize: 2,
    });
    expect(summary.sent).toBe(2);
  });

  it("en cas d’échec : reste en attente, enregistre l’erreur et repousse la prochaine tentative", async () => {
    await enqueue(1);

    const summary = await processOutbox(
      pool,
      new FakeMailer(new Error("SMTP indisponible")),
      options,
    );

    expect(summary).toEqual({ sent: 0, retried: 1, failed: 0 });
    expect(await statuses()).toEqual([
      { status: "pending", attempts: 1, last_error: "SMTP indisponible" },
    ]);
    const { rows } = await pool.query<{ delay: number }>(
      "SELECT extract(epoch FROM next_attempt_at - now()) AS delay FROM email_outbox",
    );
    // 60 s de base ± la durée du test : le message ne doit pas être repris immédiatement.
    expect(Number(rows[0]!.delay)).toBeGreaterThan(50);
  });

  it("ne reprend pas un message dont la prochaine tentative est dans le futur", async () => {
    await enqueue(1);
    await processOutbox(pool, new FakeMailer(new Error("panne")), options);

    const mailer = new FakeMailer();
    const summary = await processOutbox(pool, mailer, options);

    expect(summary).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(mailer.sent).toHaveLength(0);
  });

  it("reprend le message dès que son délai est écoulé", async () => {
    await enqueue(1);
    await processOutbox(pool, new FakeMailer(new Error("panne")), options);
    await pool.query(
      "UPDATE email_outbox SET next_attempt_at = now() - interval '1 second'",
    );

    const mailer = new FakeMailer();
    expect((await processOutbox(pool, mailer, options)).sent).toBe(1);
    expect((await statuses())[0]).toMatchObject({
      status: "sent",
      attempts: 2,
      last_error: null,
    });
  });

  it("abandonne (statut failed) après le nombre maximal de tentatives", async () => {
    await enqueue(1);
    const failing = new FakeMailer(new Error("toujours en panne"));

    for (let i = 0; i < options.maxAttempts; i++) {
      await pool.query(
        "UPDATE email_outbox SET next_attempt_at = now() - interval '1 second'",
      );
      await processOutbox(pool, failing, options);
    }

    expect(await statuses()).toEqual([
      { status: "failed", attempts: 3, last_error: "toujours en panne" },
    ]);
    // Un message abandonné n'est plus jamais repris.
    const mailer = new FakeMailer();
    await processOutbox(pool, mailer, options);
    expect(mailer.sent).toHaveLength(0);
  });

  it("un échec n’empêche pas l’envoi des autres e-mails", async () => {
    await enqueue(2);
    await pool.query(
      "UPDATE email_outbox SET recipient = 'casse@example.com' WHERE id = 1",
    );
    const mailer: Mailer = {
      async send(email) {
        if (email.to === "casse@example.com")
          throw new Error("destinataire refusé");
      },
    };

    const summary = await processOutbox(pool, mailer, options);

    expect(summary).toEqual({ sent: 1, retried: 1, failed: 0 });
  });

  it("deux workers concurrents n’envoient jamais le même e-mail deux fois", async () => {
    await enqueue(30);
    const mailerA = new FakeMailer();
    const mailerB = new FakeMailer();

    await Promise.all([
      processOutbox(pool, mailerA, options),
      processOutbox(pool, mailerB, options),
    ]);

    const subjects = [...mailerA.sent, ...mailerB.sent].map(
      (email) => email.subject,
    );
    expect(subjects).toHaveLength(30);
    expect(new Set(subjects).size).toBe(30);
    expect((await statuses()).every((row) => row.status === "sent")).toBe(true);
  });
});
