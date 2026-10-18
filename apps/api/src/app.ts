import Fastify, { type FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Config } from "./config.js";
import { AppError } from "./domain/errors.js";
import { createMetrics } from "./metrics.js";
import { eventRoutes } from "./routes/events.js";
import { healthRoutes } from "./routes/health.js";
import { reservationRoutes } from "./routes/reservations.js";

/**
 * Assemble l'application sans l'écouter sur un port : les tests utilisent `app.inject()`
 * et `server.ts` appelle `listen()`.
 */
export async function buildApp(
  config: Config,
  pool: Pool,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: config.TRUST_PROXY,
    // Les e-mails et noms sont courts : 16 Kio suffisent largement et limitent les abus.
    bodyLimit: 16 * 1024,
  });
  const metrics = createMetrics();

  // Mesure de la durée de chaque requête. `routeOptions.url` est le gabarit (/events/:id),
  // pas l'URL réelle : sinon chaque identifiant créerait une nouvelle série de métriques.
  app.addHook("onResponse", async (request, reply) => {
    const route = request.routeOptions.url ?? "inconnue";
    if (route === "/metrics") return;
    metrics.httpDuration.observe(
      { method: request.method, route, status: String(reply.statusCode) },
      reply.elapsedTime / 1000,
    );
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }
    const status = (error as { statusCode?: number }).statusCode;
    // Erreurs 4xx générées par Fastify (JSON mal formé, corps trop gros, 429...).
    if (typeof status === "number" && status >= 400 && status < 500) {
      const code = (error as { code?: string }).code ?? "BAD_REQUEST";
      return reply
        .code(status)
        .send({ code, message: (error as Error).message });
    }
    // Erreur inattendue : on journalise le détail mais on ne l'expose jamais au client.
    request.log.error({ err: error }, "Erreur interne");
    return reply
      .code(500)
      .send({ code: "INTERNAL_ERROR", message: "Erreur interne" });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ code: "NOT_FOUND", message: "Route introuvable" }),
  );

  await app.register(healthRoutes(pool, metrics));
  await app.register(eventRoutes(pool));
  await app.register(reservationRoutes(pool, config, metrics));

  return app;
}
