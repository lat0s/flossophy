import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017'),
  MONGODB_DB: z.string().default('flossophy'),
  /** Public origin of the web app; writes from any other Origin are refused. */
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(32).default('dev-only-session-secret-change-me-please'),
  /** One-click "try as patient/dentist" logins. */
  DEMO_PERSONAS: bool,
  /** Read the client IP from CF-Connecting-IP / X-Forwarded-For. */
  TRUST_PROXY: bool,
  /** Optional real delivery, e.g. smtp://user:pass@smtp.example.com:587 */
  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().default('Flossophy <hello@flossophy.local>'),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg = Env.parse(env);
  if (cfg.NODE_ENV === 'production') {
    for (const key of ['SESSION_SECRET'] as const) {
      if (cfg[key].startsWith('dev-only')) throw new Error(`${key} must be set in production`);
    }
  }
  return cfg;
}
