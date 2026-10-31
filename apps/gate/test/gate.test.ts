import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createGate } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';

const dist = mkdtempSync(join(tmpdir(), 'gate-'));
writeFileSync(join(dist, 'index.html'), '<!doctype html><div id="app"></div>');
const ORIGIN = 'http://localhost:8090';

function gate(env: Record<string, string> = {}, pass = true) {
  const cfg = loadConfig({ NODE_ENV: 'test', WEB_DIST: dist, TRUST_PROXY: 'true', ...env });
  return createGate(cfg, async (token) => pass && token === 'ok');
}

const open = (app: ReturnType<typeof gate>, ip = '1.1.1.1', token = 'ok') =>
  app.request('/gate/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'cf-connecting-ip': ip },
    body: JSON.stringify({ token }),
  });
const cookieOf = (res: Response) => res.headers.get('set-cookie')!.split(';')[0]!;

describe('gate', () => {
  it('opens the demo after the bot check and sets an httpOnly cookie', async () => {
    const app = gate();
    const res = await open(app);
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/fl_demo=.*HttpOnly.*SameSite=Lax/i);
    const status = await app.request('/gate/status', { headers: { cookie: cookieOf(res) } });
    expect(await status.json()).toMatchObject({ open: true });
  });

  it('refuses a failed bot check', async () => {
    expect((await open(gate({}, false))).status).toBe(403);
  });

  it('refuses other origins', async () => {
    const res = await gate().request('/gate/open', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
      body: '{}',
    });
    expect(res.status).toBe(403);
  });

  it('limits opens per IP', async () => {
    const app = gate({ OPENS_PER_IP_HOUR: '2' });
    expect((await open(app)).status).toBe(200);
    expect((await open(app)).status).toBe(200);
    expect((await open(app)).status).toBe(429);
    expect((await open(app, '2.2.2.2')).status).toBe(200);
  });

  it('caps live sandboxes', async () => {
    const app = gate({ MAX_SANDBOXES: '1' });
    expect((await open(app, '1.1.1.1')).status).toBe(200);
    expect((await open(app, '2.2.2.2')).status).toBe(503);
  });

  it('sets the forwarding headers itself', async () => {
    const { createServer } = await import('node:http');
    const seen: Record<string, unknown> = {};
    const api = createServer((req, res) => (Object.assign(seen, req.headers), res.end('{}')));
    await new Promise<void>((r) => api.listen(0, '127.0.0.1', r));
    const port = (api.address() as { port: number }).port;
    const app = gate({ PROXY_API_URL: `http://127.0.0.1:${port}`, SECURE_COOKIE: 'true' });
    const res = await open(app, '9.9.9.9');
    await app.request('/api/clinics', {
      headers: {
        cookie: cookieOf(res),
        'cf-connecting-ip': '9.9.9.9',
        'x-forwarded-proto': 'http',
        'x-real-ip': '6.6.6.6',
      },
    });
    api.close();
    expect(seen['x-forwarded-proto']).toBe('https');
    expect(seen['x-forwarded-for']).toBe('9.9.9.9');
    expect(seen['x-real-ip']).toBeUndefined();
  });

  it('serves the app with a strict CSP and falls back to index.html', async () => {
    const res = await gate().request('/clinics/floss-boss');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('id="app"');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect((await gate().request('/missing.js')).status).toBe(404);
  });

  it('keeps the API closed without a gate cookie', async () => {
    const res = await gate({ PROXY_API_URL: 'http://127.0.0.1:9' }).request('/api/clinics');
    expect(res.status).toBe(401);
  });
});
