import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().default("RiDDiX - Matrix Synapse Panel"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  SYNAPSE_INTERNAL_URL: z.string().url().optional(),
  SYNAPSE_PUBLIC_URL: z.string().url().optional(),
  SYNAPSE_SERVER_NAME: z.string().min(1).optional(),
  SYNAPSE_ADMIN_ACCESS_TOKEN: z.string().min(1).optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(15),
  CAPTCHA_SITE_KEY: z.string().optional(),
  CAPTCHA_SECRET: z.string().optional(),
  SYNAPSE_CONFIG_DIR: z.string().optional(),
  SYNAPSE_APPSERVICE_DIR: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error("Invalid environment configuration:", formatted);
    throw new Error("Missing or invalid environment variables. Check server logs.");
  }
  return result.data;
}

let _env: Env | null = null;

export function env(): Env {
  if (!_env) {
    _env = loadEnv();
  }
  return _env;
}
