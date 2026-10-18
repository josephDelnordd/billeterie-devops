import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Config } from "../config.js";
import { AppError } from "../domain/errors.js";
import {
  eventIdParamsSchema,
  idempotencyHeadersSchema,
  parseOrThrow,
  reservationBodySchema,
} from "../domain/validation.js";
import type { Metrics } from "../metrics.js";
import { reserve } from "../services/reservations.js";

export function reservationRoutes(
  pool: Pool,
  config: Config,
  metrics: Metrics,
) {
  return async (app: FastifyInstance): Promise<void> => {
    // Limite appliquée uniquement à ce plugin : lire le catalogue reste libre.
    await app.register(rateLimit, {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW_MS,
      errorResponseBuilder: (_request, context) => ({
        statusCode: 429,
        code: "RATE_LIMITED",
        message: `Trop de demandes, réessayez dans ${Math.ceil(context.ttl / 1000)} s`,
      }),
    });

    app.post("/events/:id/reservations", async (request, reply) => {
      const { id } = parseOrThrow(eventIdParamsSchema, request.params);
      const headers = parseOrThrow(idempotencyHeadersSchema, request.headers);
      const body = parseOrThrow(reservationBodySchema, request.body);

      try {
        const result = await reserve(pool, {
          eventId: id,
          idempotencyKey: headers["idempotency-key"],
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          seats: body.seats,
        });
        metrics.reservations.inc({
          outcome: result.replayed ? "replayed" : "confirmed",
        });
        // 201 à la création, 200 pour un rejeu : le client distingue « créé » de « déjà fait ».
        return reply.code(result.replayed ? 200 : 201).send(result.reservation);
      } catch (error) {
        metrics.reservations.inc({
          outcome:
            error instanceof AppError ? error.code.toLowerCase() : "error",
        });
        throw error;
      }
    });
  };
}
