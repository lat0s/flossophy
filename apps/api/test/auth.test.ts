import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Api, ORIGIN, register, startApi } from './helpers.ts';

let api: Api;
beforeAll(async () => (api = await startApi()));
afterAll(() => api.stop());

describe('auth', () => {
  it('registers a patient, signs them in and shows them in /me', async () => {
    const a = api.agent();
    const res = await a
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'Ada@Example.com', password: 'analytical-engine' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', role: 'patient' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/fl_session=.*httponly/i);
    const me = await a.get('/api/auth/me');
    expect(me.body.me.email).toBe('ada@example.com');
    const user = await api.db.User.findOne({ email: 'ada@example.com' }).lean();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('refuses a second account on the same email', async () => {
    const res = await api
      .http()
      .post('/api/auth/register')
      .send({ name: 'Ada Again', email: 'ada@example.com', password: 'analytical-engine' });
    expect(res.status).toBe(409);
    expect(res.body.error.fields.email).toBeDefined();
  });

  it('refuses extra fields so nobody can register as a dentist', async () => {
    const res = await api
      .http()
      .post('/api/auth/register')
      .send({ name: 'Mallory', email: 'm@example.com', password: 'x'.repeat(12), role: 'dentist' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('answers the same for unknown email and wrong password, then locks after 5 tries', async () => {
    const unknown = await api
      .http()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-pass' });
    expect(unknown.status).toBe(401);
    for (let i = 0; i < 5; i++) {
      const wrong = await api
        .http()
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'wrong-password' });
      expect(wrong.status).toBe(401);
      expect(wrong.body.error.message).toBe(unknown.body.error.message);
    }
    const locked = await api
      .http()
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'analytical-engine' });
    expect(locked.status).toBe(429);
  });

  it('signs out', async () => {
    const a = await register(api);
    await a.post('/api/auth/logout').expect(204);
    expect((await a.get('/api/auth/me')).body.me).toBeNull();
  });

  it('refuses writes from another origin', async () => {
    const res = await api
      .http()
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'a@b.se', password: 'x' });
    expect(res.status).toBe(403);
    const ok = await api.http().post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@b.se', password: 'x' });
    expect(ok.status).toBe(401);
  });

  it('never leaks internals on unknown routes', async () => {
    const res = await api.http().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'not_found', message: 'Route not found' } });
  });
});
