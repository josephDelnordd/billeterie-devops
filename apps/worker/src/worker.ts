import pg from "pg";
import pino from "pino";
import { loadConfig } from "./config.js";
import { createSmtpMailer } from "./mailer.js";
import { processOutbox } from "./outbox.js";

pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 5_000,
});
const mailer = createSmtpMailer(config);

const options = {
  batchSize: config.BATCH_SIZE,
  maxAttempts: config.MAX_ATTEMPTS,
  backoffBaseMs: config.BACKOFF_BASE_MS,
  backoffMaxMs: config.BACKOFF_MAX_MS,
};

let stopping = false;
let wake: (() => void) | undefined;

// Attente interruptible : un signal d'arrêt réveille la boucle sans attendre la fin du délai.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    wake = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}

function requestStop(signal: string): void {
  logger.info({ signal }, "Arrêt demandé : fin du lot en cours");
  stopping = true;
  wake?.();
}
process.on("SIGTERM", () => requestStop("SIGTERM"));
process.on("SIGINT", () => requestStop("SIGINT"));

logger.info(
  {
    smtp: `${config.SMTP_HOST}:${config.SMTP_PORT}`,
    pollMs: config.POLL_INTERVAL_MS,
  },
  "Worker démarré",
);

while (!stopping) {
  try {
    const summary = await processOutbox(pool, mailer, options);
    if (summary.sent + summary.retried + summary.failed > 0) {
      logger.info(summary, "Lot traité");
      // Du travail a été trouvé : on enchaîne sans attendre pour vider vite une file chargée.
      continue;
    }
  } catch (error) {
    // Base indisponible, etc. : on journalise et on réessaie au prochain tour au lieu de quitter.
    logger.error({ err: error }, "Erreur pendant le traitement");
  }
  await sleep(config.POLL_INTERVAL_MS);
}

await pool.end();
logger.info("Worker arrêté");
