import type { Context } from 'koa';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@flossophy/shared';
import type { Config } from './config.ts';

export const SESSION_COOKIE = 'fl_session';
const TTL_SEC = 8 * 3600;

export type Session = { userId: string; role: Role; sandboxId: string | null };

export function sessions(cfg: Config) {
  const key = new TextEncoder().encode(cfg.SESSION_SECRET);
  const secure = cfg.APP_ORIGIN.startsWith('https://');

  return {
    async issue(ctx: Context, s: Session) {
      const jwt = await new SignJWT({ role: s.role, sbx: s.sandboxId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(s.userId)
        .setIssuedAt()
        .setExpirationTime(`${TTL_SEC}s`)
        .sign(key);
      ctx.cookies.set(SESSION_COOKIE, jwt, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: TTL_SEC * 1000,
        overwrite: true,
      });
    },

    /** The session, if valid and minted for the same sandbox as this request. */
    async read(ctx: Context, sandboxId: string | null): Promise<Session | null> {
      const jwt = ctx.cookies.get(SESSION_COOKIE);
      if (!jwt) return null;
      try {
        const { payload } = await jwtVerify(jwt, key, { algorithms: ['HS256'] });
        const sbx = (payload.sbx as string | null) ?? null;
        if (sbx !== sandboxId || !payload.sub) return null;
        return { userId: payload.sub, role: payload.role as Role, sandboxId: sbx };
      } catch {
        return null;
      }
    },

    clear(ctx: Context) {
      ctx.cookies.set(SESSION_COOKIE, null, { httpOnly: true, sameSite: 'lax', secure });
    },
  };
}
export type Sessions = ReturnType<typeof sessions>;
