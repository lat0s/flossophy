import type Router from '@koa/router';
import type { Context } from 'koa';
import { z, type ZodType } from 'zod';
import type { Role } from '@flossophy/shared';
import type { Db } from './db.ts';
import { HttpError } from './errors.ts';
import type { Session } from './session.ts';

/** What every handler can read from the request. */
export type AppState = { db: Db; sandboxId: string | null; session: Session | null };
export type AppContext = Context & { state: AppState };

type Method = 'get' | 'post' | 'patch' | 'delete';
type Infer<T> = T extends ZodType ? z.output<T> : undefined;

export type RouteDef<B, Q, P> = {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  /** Who may call it: a role, any signed-in user, or everyone (default). */
  auth?: Role | 'user';
  body?: B;
  query?: Q;
  params?: P;
  response?: ZodType;
  status?: number;
  handler: (
    ctx: AppContext,
    input: { body: Infer<B>; query: Infer<Q>; params: Infer<P>; session: Session },
  ) => Promise<unknown>;
};

export type AnyRoute = RouteDef<ZodType | undefined, ZodType | undefined, ZodType | undefined>;

/** Typed route: zod-validated input, role check, and an OpenAPI entry from the same schemas. */
export function route<B extends ZodType | undefined, Q extends ZodType | undefined, P extends ZodType | undefined>(
  def: RouteDef<B, Q, P>,
): AnyRoute {
  return def as unknown as AnyRoute;
}

export function mount(router: Router, routes: AnyRoute[]) {
  for (const r of routes) {
    router[r.method](r.path, async (ctx) => {
      const c = ctx as unknown as AppContext;
      const session = c.state.session;
      if (r.auth) {
        if (!session) throw new HttpError(401, 'unauthorized', 'Sign in first');
        if (r.auth !== 'user' && session.role !== r.auth) {
          throw new HttpError(403, 'forbidden', `Only a ${r.auth} can do that`);
        }
      }
      const input = {
        body: r.body ? r.body.parse((ctx.request as { body?: unknown }).body ?? {}) : undefined,
        query: r.query ? r.query.parse({ ...ctx.query }) : undefined,
        params: r.params ? r.params.parse(ctx.params) : undefined,
        session: session!,
      };
      const out = await r.handler(c, input as never);
      ctx.status = r.status ?? (out === undefined ? 204 : 200);
      if (out !== undefined) ctx.body = out;
    });
  }
}

export const IdParam = z.strictObject({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
