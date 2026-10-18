import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { eventIdParamsSchema, parseOrThrow } from "../domain/validation.js";
import { getEvent, listEvents } from "../services/events.js";

export function eventRoutes(pool: Pool) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get("/events", async () => ({ events: await listEvents(pool) }));

    app.get("/events/:id", async (request) => {
      const { id } = parseOrThrow(eventIdParamsSchema, request.params);
      return getEvent(pool, id);
    });
  };
}
