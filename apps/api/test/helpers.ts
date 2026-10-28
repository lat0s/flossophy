import { randomBytes } from 'node:crypto';
import { inject } from 'vitest';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/core/config.ts';
import { connect, ensureIndexes, modelsFor } from '../src/core/db.ts';
import { hashPassword } from '../src/features/auth/routes.ts';
import { DEMO_PASSWORD } from '../src/seed/data.ts';
import { seed } from '../src/seed/seed.ts';

export const ORIGIN = 'http://localhost:5173';

export async function startApi(env: Record<string, string> = {}) {
  const conn: Connection = await connect(inject('mongoUri'), `t_${randomBytes(4).toString('hex')}`);
  const cfg = loadConfig({ NODE_ENV: 'test', APP_ORIGIN: ORIGIN, DEMO_PERSONAS: 'true', ...env });
  const db = modelsFor(conn);
  await ensureIndexes(db);
  await seed(db, await hashPassword(DEMO_PASSWORD));
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

export async function signIn(api: Api, as: 'patient' | 'dentist') {
  const a = api.agent();
  await a.post('/api/demo/login').send({ as }).expect(200);
  return a;
}

export async function register(
  api: Api,
  name = 'Pat Tester',
  email = `pat${Math.random().toString(36).slice(2, 8)}@example.com`,
) {
  const a = api.agent();
  await a.post('/api/auth/register').send({ name, email, password: 'correct-horse-battery' }).expect(201);
  return a;
}

/** A future open Slot more than `minHours` away. */
export async function openSlot(api: Api, minHours = 48) {
  const slot = await api.db.Slot.findOne({
    booking: null,
    startsAt: { $gt: new Date(Date.now() + minHours * 3600_000) },
  })
    .sort({ startsAt: 1 })
    .lean();
  if (!slot) throw new Error('no open slot in seed');
  return slot;
}
