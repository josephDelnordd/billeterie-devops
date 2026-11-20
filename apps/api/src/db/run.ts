// Outil en ligne de commande : `node dist/db/run.js migrate [seed]`.
// Séparé du serveur pour pouvoir l'exécuter comme tâche ponctuelle (Compose, puis Job Kubernetes).
import { loadConfig } from "../config.js";
import { runMigrations } from "./migrate.js";
import { createPool } from "./pool.js";
import { seedDemoEvents } from "./seed.js";

const commands = process.argv.slice(2);
const known = new Set(["migrate", "seed"]);
const unknown = commands.filter((command) => !known.has(command));

if (commands.length === 0 || unknown.length > 0) {
  console.error(
    `Usage : run.js <migrate|seed>... (reçu : ${commands.join(" ") || "rien"})`,
  );
  process.exit(2);
}

const pool = createPool(loadConfig().DATABASE_URL);
try {
  for (const command of commands) {
    if (command === "migrate") {
      const applied = await runMigrations(pool);
      console.log(
        applied.length > 0
          ? `Migrations appliquées : ${applied.join(", ")}`
          : "Base déjà à jour",
      );
    } else {
      const created = await seedDemoEvents(pool);
      console.log(
        created > 0
          ? `${created} événements de démonstration créés`
          : "Événements déjà présents : rien à créer",
      );
    }
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
