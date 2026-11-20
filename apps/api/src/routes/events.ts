import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import {
  eventIdParamsSchema,
  eventsQuerySchema,
  parseOrThrow,
} from "../domain/validation.js";
import { getEvent, listEvents } from "../services/events.js";

export function eventRoutes(pool: Pool) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get("/events", async (request) => {
      const { category } = parseOrThrow(eventsQuerySchema, request.query);
      return { events: await listEvents(pool, category) };
    });

    app.get("/events/:id", async (request) => {
      const { id } = parseOrThrow(eventIdParamsSchema, request.params);
      return getEvent(pool, id);
    });
  };
}
