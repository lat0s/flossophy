import Router from '@koa/router';
import { bodyParser } from '@koa/bodyparser';
import Koa from 'koa';
import helmet from 'koa-helmet';
import type { Connection } from 'mongoose';
import { DOCS_CSP, docsPage } from '@flossophy/shared/node';
import type { Config } from './core/config.ts';
import { modelsFor } from './core/db.ts';
import { errorMiddleware } from './core/errors.ts';
import { log } from './core/log.ts';
import { openApiDoc } from './core/openapi.ts';
import { type AppContext, mount } from './core/route.ts';
import { RateLimiter, originCheck, rateLimit } from './core/security.ts';
import { type Sessions, sessions as makeSessions } from './core/session.ts';
import { authRoutes } from './features/auth/routes.ts';
import { clinicRoutes } from './features/clinics/routes.ts';
import { demoRoutes } from './features/demo/routes.ts';
import { type Mailer, createMailer } from './features/outbox/mailer.ts';
import { outboxRoutes } from './features/outbox/routes.ts';
import { slotRoutes } from './features/slots/routes.ts';

const PREFIX = '/api';

function apiRoutes(cfg: Config, sessions: Sessions, mailer: Mailer) {
  return [
    ...authRoutes(cfg, sessions, mailer),
    ...clinicRoutes(),
    ...slotRoutes(mailer),
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
  const db = modelsFor(conn);

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

  // Read the session.
  app.use(async (ctx, next) => {
    const c = ctx as unknown as AppContext;
    c.state.db = db;
    c.state.sandboxId = null;
    c.state.session = await sessions.read(ctx, null);
    await next();
  });

  app.use(router.routes()).use(router.allowedMethods({ throw: true }));
  return { app, spec };
}
