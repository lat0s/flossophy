import Router from '@koa/router';
import { bodyParser } from '@koa/bodyparser';
import Koa from 'koa';
import helmet from 'koa-helmet';
import type { Connection } from 'mongoose';
import { DEMO_COOKIE, DOCS_CSP, docsPage, verifyDemoToken } from '@flossophy/shared/node';
import type { Config } from './core/config.ts';
import { type Db, modelsFor } from './core/db.ts';
import { HttpError, errorMiddleware } from './core/errors.ts';
import { log } from './core/log.ts';
import { openApiDoc } from './core/openapi.ts';
import { type AppContext, mount } from './core/route.ts';
import { RateLimiter, originCheck, rateLimit } from './core/security.ts';
import { type Sessions, sessions as makeSessions } from './core/session.ts';
import { authRoutes, hashPassword } from './features/auth/routes.ts';
import { clinicRoutes } from './features/clinics/routes.ts';
import { demoRoutes } from './features/demo/routes.ts';
import { type Sandboxes, sandboxes as makeSandboxes } from './features/demo/sandboxes.ts';
import { dentistRoutes } from './features/dentist/routes.ts';
import { type Mailer, createMailer } from './features/outbox/mailer.ts';
import { outboxRoutes } from './features/outbox/routes.ts';
import { slotRoutes } from './features/slots/routes.ts';
import { DEMO_PASSWORD } from './seed/data.ts';

const PREFIX = '/api';
const OPEN_PATHS = new Set([`${PREFIX}/health`, `${PREFIX}/docs`, `${PREFIX}/openapi.json`]);

function apiRoutes(cfg: Config, sessions: Sessions, mailer: Mailer) {
  return [
    ...authRoutes(cfg, sessions, mailer),
    ...clinicRoutes(),
    ...slotRoutes(mailer),
    ...dentistRoutes(),
    ...(cfg.DEMO_PERSONAS ? outboxRoutes() : []),
    ...demoRoutes(cfg, sessions),
  ];
}

/** The OpenAPI document, without a database. The gate serves a copy so docs never wake the API. */
export function buildSpec(cfg: Config) {
  return openApiDoc(apiRoutes(cfg, makeSessions(cfg), null), PREFIX);
}

export function createApp(cfg: Config, conn: Connection) {
  const app = new Koa();
  app.proxy = cfg.TRUST_PROXY;
  const sessions = makeSessions(cfg);
  const mailer = createMailer(cfg);
  const mainDb = modelsFor(conn);
  let demoHash: Promise<string> | undefined;
  const sandboxes: Sandboxes | null = cfg.DEMO_SANDBOXES
    ? makeSandboxes(conn, {
        idleMs: cfg.SANDBOX_IDLE_MINUTES * 60_000,
        max: 40,
        passwordHash: () => (demoHash ??= hashPassword(DEMO_PASSWORD)),
      })
    : null;

  const routes = apiRoutes(cfg, sessions, mailer);
  const spec = openApiDoc(routes, PREFIX);
  const router = new Router({ prefix: PREFIX });

  router.get('/health', async (ctx) => {
    await conn.db!.admin().ping();
    ctx.body = { ok: true };
  });
  router.get('/openapi.json', (ctx) => {
    ctx.body = spec;
  });
  router.get('/docs', (ctx) => {
    ctx.set('Content-Security-Policy', DOCS_CSP);
    ctx.type = 'html';
    ctx.body = docsPage(`${PREFIX}/openapi.json`);
  });
  mount(router, routes);

  app.use(errorMiddleware);
  app.use(async (ctx, next) => {
    const t = performance.now();
    await next();
    if (ctx.path !== `${PREFIX}/health`) {
      log.info('req', { m: ctx.method, p: ctx.path, s: ctx.status, ms: Math.round(performance.now() - t) });
    }
  });
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );
  app.use(rateLimit(new RateLimiter(300, 60_000), cfg, 'all'));
  app.use(originCheck(cfg));
  app.use(bodyParser({ jsonLimit: '20kb', enableTypes: ['json'] }));

  // Pick the database for this request and read the session.
  app.use(async (ctx, next) => {
    const c = ctx as unknown as AppContext;
    let db: Db = mainDb;
    let sandboxId: string | null = null;
    if (sandboxes && !OPEN_PATHS.has(ctx.path)) {
      const demo = verifyDemoToken(cfg.GATE_SECRET, ctx.cookies.get(DEMO_COOKIE));
      if (!demo) throw new HttpError(401, 'demo_required', 'Open the live demo from the home page first');
      sandboxId = demo.sandboxId;
      db = await sandboxes.get(sandboxId);
    }
    c.state.db = db;
    c.state.sandboxId = sandboxId;
    c.state.session = await sessions.read(ctx, sandboxId);
    await next();
  });

  app.use(router.routes()).use(router.allowedMethods({ throw: true }));
  return { app, sandboxes, spec };
}
