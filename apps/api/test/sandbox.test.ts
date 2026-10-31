import { DEMO_COOKIE, signDemoToken } from '@flossophy/shared/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Api, startApi } from './helpers.ts';

const GATE_SECRET = 'test-gate-secret-that-is-long-enough-123';
let api: Api;
beforeAll(async () => (api = await startApi({ DEMO_SANDBOXES: 'true', GATE_SECRET })));
afterAll(() => api.stop());

const visitor = () => {
  const { token, sandboxId } = signDemoToken(GATE_SECRET, 3600);
  const a = api.agent();
  return { a, cookie: `${DEMO_COOKIE}=${token}`, sandboxId };
};

describe('demo sandboxes', () => {
  it('refuses requests without the gate cookie, but health and docs stay open', async () => {
    expect((await api.http().get('/api/clinics')).status).toBe(401);
    expect((await api.http().get('/api/health')).status).toBe(200);
    expect((await api.http().get('/api/openapi.json')).body.paths['/api/slots/{id}/book']).toBeDefined();
  });

  it('gives each visitor their own seeded data', async () => {
    const v1 = visitor();
    const v2 = visitor();
    const c1 = await v1.a.get('/api/clinics').set('Cookie', v1.cookie).expect(200);
    expect(c1.body.clinics).toHaveLength(8);
    await v1.a
      .post('/api/auth/register')
      .set('Cookie', v1.cookie)
      .send({ name: 'Only In One', email: 'one@example.com', password: 'sandbox-password' })
      .expect(201);
    const again = await v2.a
      .post('/api/auth/register')
      .set('Cookie', v2.cookie)
      .send({ name: 'Only In Two', email: 'one@example.com', password: 'sandbox-password' });
    expect(again.status).toBe(201);
  });

  it("won't accept a session from another sandbox", async () => {
    const v1 = visitor();
    const v2 = visitor();
    const login = await v1.a.post('/api/demo/login').set('Cookie', v1.cookie).send({ as: 'patient' }).expect(200);
    const session = login.headers['set-cookie']![0]!.split(';')[0]!;
    const me = await api.http().get('/api/auth/me').set('Cookie', `${v2.cookie}; ${session}`).expect(200);
    expect(me.body.me).toBeNull();
  });

  it('drops idle sandboxes', async () => {
    const before = api.sandboxes!.size;
    await api.sandboxes!.reap(Date.now() + 2 * 3600_000);
    expect(api.sandboxes!.size).toBe(0);
    expect(before).toBeGreaterThan(0);
  });
});
