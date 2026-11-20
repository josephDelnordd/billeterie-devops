import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

// Verrou advisory arbitraire : empêche deux instances de migrer en même temps (ex. plusieurs pods).
const MIGRATION_LOCK_ID = 727_001;

/**
 * Applique, dans l'ordre alphabétique, les fichiers .sql pas encore enregistrés dans schema_migrations.
 * Chaque fichier s'exécute dans sa propre transaction. Retourne les noms des migrations appliquées.
 */
export async function runMigrations(
  pool: Pool,
  dir: string = MIGRATIONS_DIR,
): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const done = new Set(
      (
        await client.query<{ name: string }>(
          "SELECT name FROM schema_migrations",
        )
      ).rows.map((row) => row.name),
    );
    const files = (await readdir(dir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(join(dir, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
          `Échec de la migration ${file} : ${(error as Error).message}`,
          { cause: error },
        );
      }
      applied.push(file);
    }
    return applied;
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID])
      .catch(() => undefined);
    client.release();
  }
}
