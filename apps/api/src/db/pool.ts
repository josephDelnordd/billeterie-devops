import pg from "pg";

// BIGSERIAL est renvoyé en chaîne par défaut pour éviter toute perte de précision.
// Nos identifiants restent très en dessous de 2^53 : on les expose comme nombres.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}
