import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Config } from "../config.js";
import {
  contactBodySchema,
  parseOrThrow,
} from "../domain/validation.js";
import { sendContactMessage } from "../services/contact.js";

export function contactRoutes(pool: Pool, config: Config) {
  return async (app: FastifyInstance): Promise<void> => {
    // Même protection anti-bots que les réservations : ce point d'entrée écrit en base.
    await app.register(rateLimit, {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW_MS,
      errorResponseBuilder: (_request, context) => ({
        statusCode: 429,
        code: "RATE_LIMITED",
        message: `Trop de demandes, réessayez dans ${Math.ceil(context.ttl / 1000)} s`,
      }),
    });

    app.post("/contact", async (request, reply) => {
      const body = parseOrThrow(contactBodySchema, request.body);
      const result = await sendContactMessage(pool, config.CONTACT_EMAIL, body);
      return reply.code(201).send(result);
    });
  };
}
