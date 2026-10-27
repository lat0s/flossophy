import type { Context, Next } from 'koa';
import type { Config } from './config.ts';
import { HttpError } from './errors.ts';

export function clientIp(ctx: Context, trustProxy: boolean) {
  if (trustProxy) {
    const cf = ctx.get('cf-connecting-ip');
    if (cf) return cf;
    const xff = ctx.get('x-forwarded-for').split(',')[0]?.trim();
    if (xff) return xff;
  }
  return ctx.ip;
}

/** Browsers always send Origin on cross-site writes; refuse any that isn't ours. */
export function originCheck(cfg: Config) {
  const allowed = new Set([cfg.APP_ORIGIN]);
  return async (ctx: Context, next: Next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(ctx.method)) {
      const origin = ctx.get('origin');
      if (origin && !allowed.has(origin)) throw new HttpError(403, 'forbidden', 'Cross-site request refused');
    }
    await next();
  };
}

/** Fixed-window counter in memory; fine for one API instance. */
export class RateLimiter {
  private hits = new Map<string, { n: number; resetAt: number }>();
  private limit: number;
  private windowMs: number;
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** Counts a hit and returns false once the key is over its limit. */
  take(key: string, now = Date.now()) {
    const cur = this.hits.get(key);
    if (!cur || cur.resetAt <= now) {
      this.hits.set(key, { n: 1, resetAt: now + this.windowMs });
      this.sweep(now);
      return true;
    }
    cur.n++;
    return cur.n <= this.limit;
  }

  peek(key: string, now = Date.now()) {
    const cur = this.hits.get(key);
    return !cur || cur.resetAt <= now ? 0 : cur.n;
  }

  reset(key: string) {
    this.hits.delete(key);
  }

  private sweep(now: number) {
    if (this.hits.size < 10_000) return;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

export function rateLimit(limiter: RateLimiter, cfg: Config, name: string) {
  return async (ctx: Context, next: Next) => {
    if (!limiter.take(`${name}:${clientIp(ctx, cfg.TRUST_PROXY)}`)) {
      throw new HttpError(429, 'too_many_requests', 'Slow down a little and try again in a minute');
    }
    await next();
  };
}
