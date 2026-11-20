import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Metrics } from "../metrics.js";

/**
 * - /health/live  : le processus répond (sonde liveness Kubernetes). Ne teste PAS la base :
 *                   une panne de base ne doit pas faire redémarrer tous les pods en boucle.
 * - /health/ready : la base répond (sonde readiness). En cas d'échec, le pod sort du service.
 * - /metrics      : métriques Prometheus.
 */
export function healthRoutes(pool: Pool, metrics: Metrics) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get("/health/live", async () => ({ status: "ok" }));

    app.get("/health/ready", async (_request, reply) => {
      try {
        await pool.query("SELECT 1");
        return { status: "ok" };
      } catch (error) {
        app.log.error({ err: error }, "Base de données indisponible");
        return reply.code(503).send({ status: "unavailable" });
      }
    });

    app.get("/metrics", async (_request, reply) => {
      reply.header("Content-Type", metrics.registry.contentType);
      return metrics.registry.metrics();
    });
  };
}
