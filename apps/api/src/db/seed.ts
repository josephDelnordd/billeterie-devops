import type { Pool } from "pg";

/**
 * Insère quelques événements fictifs, uniquement si la table est vide (idempotent).
 * Données de démonstration uniquement : jamais de données réelles dans ce projet.
 * Retourne le nombre d'événements créés.
 */
export async function seedDemoEvents(pool: Pool): Promise<number> {
  const result = await pool.query(`
    INSERT INTO events (name, description, venue, starts_at, capacity, remaining)
    SELECT v.name, v.description, v.venue, now() + v.starts_in, v.capacity, v.capacity
    FROM (VALUES
      ('Concert de printemps',  'Orchestre symphonique, programme romantique', 'Grande salle, Paris',  interval '30 days', 200),
      ('Dernières places',      'Petite salle : idéal pour tester le complet',  'Salle intime, Lyon',   interval '10 days', 5),
      ('Festival ouverture',    'Ouverture des ventes : forte affluence',       'Parc des expos, Lille', interval '60 days', 1000)
    ) AS v(name, description, venue, starts_in, capacity)
    WHERE NOT EXISTS (SELECT 1 FROM events)`);
  return result.rowCount ?? 0;
}
