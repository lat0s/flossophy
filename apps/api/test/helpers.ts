import { randomBytes } from 'node:crypto';
import { inject } from 'vitest';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/core/config.ts';
import { connect, ensureIndexes, modelsFor } from '../src/core/db.ts';

export const ORIGIN = 'http://localhost:5173';

export async function startApi(env: Record<string, string> = {}) {
  const conn: Connection = await connect(inject('mongoUri'), `t_${randomBytes(4).toString('hex')}`);
  const cfg = loadConfig({ NODE_ENV: 'test', APP_ORIGIN: ORIGIN, DEMO_PERSONAS: 'true', ...env });
  const db = modelsFor(conn);
  await ensureIndexes(db);
  const { app } = createApp(cfg, conn);
  const server = app.callback();
  return {
    cfg,
    db,
    agent: () => request.agent(server),
    http: () => request(server),
    async stop() {
      await conn.dropDatabase();
      await conn.close();
    },
  };
}

export type Api = Awaited<ReturnType<typeof startApi>>;

export async function register(
  api: Api,
  name = 'Pat Tester',
  email = `pat${Math.random().toString(36).slice(2, 8)}@example.com`,
) {
  const a = api.agent();
  await a.post('/api/auth/register').send({ name, email, password: 'correct-horse-battery' }).expect(201);
  return a;
}
