import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const app = await buildApp(config, pool);

// Arrêt propre : on cesse d'accepter des connexions, on termine les requêtes en cours,
// puis on ferme le pool. Kubernetes envoie SIGTERM avant de tuer un pod.
let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  app.log.info({ signal }, "Arrêt en cours");
  try {
    await app.close();
    await pool.end();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "Échec de l'arrêt propre");
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  app.log.error({ err: error }, "Démarrage impossible");
  process.exit(1);
}
