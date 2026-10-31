import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

// Cloudflare's public test keys: the check always passes. Fine locally, never in the live demo.
export const TEST_SITE_KEY = '1x00000000000000000000AA';
export const TEST_SECRET = '1x0000000000000000000000000000000AA';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8090),
  /** Built web app (apps/web/dist). */
  WEB_DIST: z.string().default('../web/dist'),
  /** OpenAPI JSON served at /api/docs, so reading the docs never wakes the API. */
  OPENAPI_FILE: z.string().optional(),
  /** Forward /api here. Only visitors with a demo cookie get through. */
  PROXY_API_URL: z.string().url().optional(),
  APP_ORIGIN: z.string().default('http://localhost:8090'),
  GATE_SECRET: z.string().min(32).default('dev-only-gate-secret-change-me-please-now'),
  TURNSTILE_SITE_KEY: z.string().default(TEST_SITE_KEY),
  TURNSTILE_SECRET: z.string().default(TEST_SECRET),
  /** Expected hostname in the Turnstile result, e.g. flossophy.lat0s.com. */
  TURNSTILE_HOSTNAME: z.string().optional(),
  DEMO_TTL_MINUTES: z.coerce.number().int().min(5).max(240).default(60),
  MAX_SANDBOXES: z.coerce.number().int().min(1).default(30),
  OPENS_PER_IP_HOUR: z.coerce.number().int().min(1).default(5),
  /** Read the client IP from CF-Connecting-IP / X-Forwarded-For. */
  TRUST_PROXY: bool,
  SECURE_COOKIE: bool,
});

export type GateConfig = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GateConfig {
  const cfg = Env.parse(env);
  if (cfg.NODE_ENV === 'production' && cfg.GATE_SECRET.startsWith('dev-only'))
    throw new Error('GATE_SECRET must be set in production');
  return cfg;
}
