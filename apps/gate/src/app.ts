import { readFileSync } from 'node:fs';
import { serveStatic } from '@hono/node-server/serve-static';
import { DEMO_COOKIE, DOCS_CSP, docsPage, signDemoToken, verifyDemoToken } from '@flossophy/shared/node';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie, setCookie } from 'hono/cookie';
import type { GateConfig } from './config.ts';
import type { Verify } from './turnstile.ts';
import { alwaysAwake, type Wake } from './waker.ts';

const APP_CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  'frame-src https://challenges.cloudflare.com',
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  // canvas-confetti draws in a blob worker.
  "worker-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

const fail = (c: Context, status: 400 | 401 | 403 | 429 | 503, code: string, message: string) =>
  c.json({ error: { code, message } }, status);

/** Fixed one-hour windows per key. */
function hourlyLimit(max: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string, now = Date.now()) => {
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { n: 1, reset: now + 3_600_000 });
      return true;
    }
    return ++h.n <= max;
  };
}

export function createGate(cfg: GateConfig, verify: Verify, wake: Wake = alwaysAwake) {
  const app = new Hono();
  const allowOpen = hourlyLimit(cfg.OPENS_PER_IP_HOUR);
  // Sandboxes handed out and not yet expired: id → expiry (s).
  const active = new Map<string, number>();
  const spec = cfg.OPENAPI_FILE ? readFileSync(cfg.OPENAPI_FILE, 'utf8') : null;

  const ip = (c: Context) =>
    (cfg.TRUST_PROXY && (c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim())) ||
    (c.env as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming?.socket?.remoteAddress ||
    'unknown';
  const demo = (c: Context) => verifyDemoToken(cfg.GATE_SECRET, getCookie(c, DEMO_COOKIE));
  const liveCount = () => {
    const now = Date.now() / 1000;
    for (const [id, exp] of active) if (exp < now) active.delete(id);
    return active.size;
  };

  app.use(async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(), payment=()');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    if (cfg.SECURE_COOKIE) c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (!c.res.headers.has('Content-Security-Policy')) c.header('Content-Security-Policy', APP_CSP);
  });

  app.get('/gate/status', (c) => {
    c.header('Cache-Control', 'no-store');
    const d = demo(c);
    return c.json({ open: !!d, siteKey: cfg.TURNSTILE_SITE_KEY, expiresAt: d?.expiresAt ?? null });
  });

  app.post(
    '/gate/open',
    bodyLimit({ maxSize: 4096, onError: (c) => fail(c, 400, 'bad_request', 'Too big') }),
    async (c) => {
      c.header('Cache-Control', 'no-store');
      if (c.req.header('origin') !== cfg.APP_ORIGIN) return fail(c, 403, 'forbidden', 'Wrong origin');
      if (demo(c)) return c.json({ open: true });
      const body = (await c.req.json().catch(() => null)) as { token?: unknown } | null;
      const token = typeof body?.token === 'string' ? body.token : '';
      const who = ip(c);
      if (!allowOpen(who)) return fail(c, 429, 'too_many_requests', 'That is a lot of demos. Try again in an hour.');
      if (liveCount() >= cfg.MAX_SANDBOXES)
        return fail(c, 503, 'demo_full', 'The demo is full right now. Try again in a few minutes.');
      if (!(await verify(token, who)))
        return fail(c, 403, 'forbidden', 'The bot check did not pass. Refresh and try again.');

      const ttl = cfg.DEMO_TTL_MINUTES * 60;
      const t = signDemoToken(cfg.GATE_SECRET, ttl);
      active.set(t.sandboxId, t.expiresAt);
      setCookie(c, DEMO_COOKIE, t.token, {
        httpOnly: true,
        secure: cfg.SECURE_COOKIE,
        sameSite: 'Lax',
        path: '/',
        maxAge: ttl,
      });
      return c.json({ open: true, expiresAt: t.expiresAt });
    },
  );

  // API docs live here so reading them never wakes the API.
  if (spec) {
    app.get('/api/openapi.json', (c) =>
      c.body(spec, 200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }),
    );
    app.get('/api/docs', (c) => {
      c.header('Content-Security-Policy', DOCS_CSP);
      return c.html(docsPage('/api/openapi.json'));
    });
  }

  if (cfg.PROXY_API_URL) {
    const target = cfg.PROXY_API_URL.replace(/\/$/, '');
    app.all('/api/*', async (c) => {
      // Only visitors who passed the gate may reach, and so wake, the API.
      if (!demo(c)) return fail(c, 401, 'demo_required', 'Open the live demo from the home page first');
      if (!(await wake())) return fail(c, 503, 'waking', 'The clinic is still waking up');
      const url = new URL(c.req.url);
      const headers = new Headers(c.req.raw.headers);
      // The API trusts these, so they come from the gate only.
      for (const h of ['host', 'forwarded', 'x-forwarded-host', 'x-real-ip']) headers.delete(h);
      headers.set('x-forwarded-for', ip(c));
      headers.set('cf-connecting-ip', ip(c));
      headers.set('x-forwarded-proto', cfg.SECURE_COOKIE ? 'https' : 'http');
      const res = await fetch(target + url.pathname + url.search, {
        method: c.req.method,
        headers,
        body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
        redirect: 'manual',
        // @ts-expect-error Node needs this to stream a request body.
        duplex: 'half',
      }).catch(() => null);
      if (!res) return fail(c, 503, 'waking', 'The clinic is still waking up');
      const out = new Headers(res.headers);
      out.delete('content-encoding');
      out.delete('content-length');
      return new Response(res.body, { status: res.status, headers: out });
    });
  } else {
    app.all('/api/*', (c) => fail(c, 503, 'demo_full', 'The API is not reachable from here'));
  }

  // The web app: hashed assets cache forever, everything else falls back to index.html.
  app.use('/assets/*', async (c, next) => {
    await next();
    if (c.res.ok) c.header('Cache-Control', 'public, max-age=31536000, immutable');
  });
  app.use('*', serveStatic({ root: cfg.WEB_DIST }));
  app.get(
    '*',
    async (c, next) => {
      if (/\.\w+$/.test(c.req.path)) return c.notFound();
      c.header('Cache-Control', 'no-cache');
      return next();
    },
    serveStatic({ root: cfg.WEB_DIST, path: 'index.html' }),
  );

  return app;
}
