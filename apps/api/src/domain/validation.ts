import { z } from "zod";
import { ValidationError } from "./errors.js";

export const MAX_SEATS_PER_RESERVATION = 10;

export const eventIdParamsSchema = z.object({
  id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

// Les en-têtes HTTP sont en minuscules côté Node.
// La clé est limitée à un alphabet sûr : elle est stockée telle quelle et peut finir dans des logs.
export const idempotencyHeadersSchema = z.object({
  "idempotency-key": z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{8,128}$/,
      "8 à 128 caractères parmi A-Z a-z 0-9 _ -",
    ),
});

export const reservationBodySchema = z
  .object({
    customerName: z.string().trim().min(1).max(120),
    customerEmail: z.string().trim().toLowerCase().email().max(254),
    seats: z.number().int().min(1).max(MAX_SEATS_PER_RESERVATION),
  })
  .strict();

export type ReservationBody = z.infer<typeof reservationBodySchema>;

/** Valide une valeur et lève une ValidationError (HTTP 400) avec le détail des champs en défaut. */
export function parseOrThrow<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
