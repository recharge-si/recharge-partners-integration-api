import { z } from "zod";

/**
 * Centralised environment configuration.
 *
 * Parsed lazily (on first `getEnv()` call) so that a missing variable fails at
 * runtime with a clear message rather than crashing the build. Never import
 * `process.env` directly elsewhere — always go through `getEnv()`.
 */
const EnvSchema = z.object({
  // --- MongoDB ---
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  MONGO_DB_NAME: z.string().optional(), // optional if the db is encoded in the URI

  // --- Scheduler (in-process node-cron) ---
  CRON_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  CRON_EXPRESSION: z.string().default("0 */6 * * *"), // every 6 hours
  CRON_TIMEZONE: z.string().default("Europe/Ljubljana"),

  // --- Manual cron trigger protection (POST /api/cron/run) ---
  CRON_SECRET: z.string().optional(),

  // --- Partner feed URLs (keep tokens out of git; set in .env) ---
  POINT7_FEED_URL: z.string().optional(), // https://point-7.com/wp-json/store/v1/export?token=…&format=json
  // Optional override — the Equipe Trading stock export link is public, so the
  // builder defaults to it. Set only if the partner reissues the link.
  UNIFIBER_STOCK_URL: z.string().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
