import { loadConfig } from './core/config.ts';
import { connect, ensureIndexes, modelsFor } from './core/db.ts';
import { log } from './core/log.ts';
import { createApp } from './app.ts';

const cfg = loadConfig();
const conn = await connect(cfg.MONGODB_URI, cfg.MONGODB_DB);
const db = modelsFor(conn);
await ensureIndexes(db);
const { app, sandboxes } = createApp(cfg, conn);

if (sandboxes) {
  await sandboxes.dropAll();
  setInterval(() => sandboxes.reap().catch((e: Error) => log.error('reap failed', { err: e.message })), 60_000).unref();
}

const server = app.listen(cfg.PORT, () =>
  log.info('api up', { port: cfg.PORT, demo: cfg.DEMO_PERSONAS, sandboxes: cfg.DEMO_SANDBOXES }),
);

// Sablier stops the container with SIGTERM; finish in-flight requests first.
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, () => {
    log.info('shutting down', { sig });
    server.close(() => conn.close().then(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
