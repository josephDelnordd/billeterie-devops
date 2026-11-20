import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  // Par défaut : Mailpit en local (SMTP sur 1025, sans authentification ni TLS).
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  MAIL_FROM: z
    .string()
    .min(3)
    .default("Billetterie <no-reply@billetterie.local>"),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  BATCH_SIZE: z.coerce.number().int().positive().max(500).default(20),
  // Au-delà, le message passe en « failed » pour intervention humaine plutôt que de boucler.
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  BACKOFF_BASE_MS: z.coerce.number().int().positive().default(30_000),
  BACKOFF_MAX_MS: z.coerce.number().int().positive().default(3_600_000),
});

export type Config = z.infer<typeof schema>;

/** Lit et valide la configuration depuis l'environnement ; échoue vite avec un message clair. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuration invalide : ${details}`);
  }
  return parsed.data;
}
