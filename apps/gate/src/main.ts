import { serve } from '@hono/node-server';
import { createGate } from './app.ts';
import { loadConfig, TEST_SECRET } from './config.ts';
import { turnstile } from './turnstile.ts';
import { sablier } from './waker.ts';

const cfg = loadConfig();
if (cfg.NODE_ENV === 'production' && cfg.TURNSTILE_SECRET === TEST_SECRET) {
  console.warn(
    JSON.stringify({ level: 'warn', msg: 'Turnstile test keys in production: the bot check always passes' }),
  );
}
const wake = cfg.SABLIER_URL ? sablier(cfg.SABLIER_URL, cfg.SABLIER_GROUP, cfg.SABLIER_SESSION) : undefined;
const app = createGate(cfg, turnstile(cfg.TURNSTILE_SECRET, cfg.TURNSTILE_HOSTNAME), wake);
const server = serve({ fetch: app.fetch, port: cfg.PORT }, () =>
  console.log(
    JSON.stringify({ level: 'info', msg: 'gate up', port: cfg.PORT, proxy: !!cfg.PROXY_API_URL, sablier: !!wake }),
  ),
);
for (const sig of ['SIGTERM', 'SIGINT'] as const) process.on(sig, () => server.close(() => process.exit(0)));
