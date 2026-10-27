import argon2 from 'argon2';
import { LoginInput, Me, MeResponse, RegisterInput } from '@flossophy/shared';
import type { Config } from '../../core/config.ts';
import type { Db } from '../../core/db.ts';
import { HttpError } from '../../core/errors.ts';
import { route, type AppContext } from '../../core/route.ts';
import { RateLimiter, clientIp } from '../../core/security.ts';
import type { Sessions } from '../../core/session.ts';
import { sendEmail } from '../outbox/mailer.ts';
import type { Mailer } from '../outbox/mailer.ts';

const HASH = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
// Verified when the email is unknown, so both paths take the same time.
const DUMMY = argon2.hash('not-a-real-password', HASH);

export const hashPassword = (pw: string) => argon2.hash(pw, HASH);

export function toMe(u: { _id: unknown; name: string; email: string; role: string; title?: string | null }): Me {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as Me['role'],
    ...(u.role === 'dentist' && u.title ? { title: u.title } : {}),
  };
}

export async function currentUser(ctx: AppContext) {
  const s = ctx.state.session;
  if (!s) return null;
  return ctx.state.db.User.findById(s.userId).lean();
}

export function authRoutes(cfg: Config, sessions: Sessions, mailer: Mailer) {
  // Per IP and per account: slows guessing without letting anyone lock a stranger out for long.
  const ipLimit = new RateLimiter(20, 15 * 60_000);
  const failures = new RateLimiter(5, 15 * 60_000);

  async function signIn(ctx: AppContext, user: { _id: unknown; role: string }) {
    await sessions.issue(ctx, {
      userId: String(user._id),
      role: user.role as Me['role'],
      sandboxId: ctx.state.sandboxId,
    });
  }

  return [
    route({
      method: 'post',
      path: '/auth/register',
      tag: 'Auth',
      summary: 'Create a Patient account and sign in',
      body: RegisterInput,
      response: Me,
      status: 201,
      async handler(ctx, { body }) {
        if (!ipLimit.take(`reg:${clientIp(ctx, cfg.TRUST_PROXY)}`)) throw tooMany();
        const { User } = ctx.state.db;
        if (await User.exists({ email: body.email })) {
          throw new HttpError(409, 'conflict', 'That email already has an account', { email: 'Already registered' });
        }
        const user = await User.create({ ...body, passwordHash: await hashPassword(body.password), role: 'patient' });
        await signIn(ctx, user);
        await welcome(ctx.state.db, mailer, user.name, user.email);
        return toMe(user);
      },
    }),
    route({
      method: 'post',
      path: '/auth/login',
      tag: 'Auth',
      summary: 'Sign in with email and password',
      body: LoginInput,
      response: Me,
      async handler(ctx, { body }) {
        const ip = clientIp(ctx, cfg.TRUST_PROXY);
        if (!ipLimit.take(`login:${ip}`) || failures.peek(body.email) >= 5) throw tooMany();
        const user = await ctx.state.db.User.findOne({ email: body.email });
        const ok = user
          ? await argon2.verify(user.passwordHash, body.password)
          : await argon2.verify(await DUMMY, body.password);
        if (!user || !ok) {
          failures.take(body.email);
          throw new HttpError(401, 'unauthorized', 'Wrong email or password');
        }
        failures.reset(body.email);
        await signIn(ctx, user);
        return toMe(user);
      },
    }),
    route({
      method: 'post',
      path: '/auth/logout',
      tag: 'Auth',
      summary: 'Sign out',
      async handler(ctx) {
        sessions.clear(ctx);
        return undefined;
      },
    }),
    route({
      method: 'get',
      path: '/auth/me',
      tag: 'Auth',
      summary: 'Who is signed in (null when nobody)',
      response: MeResponse,
      async handler(ctx) {
        const user = await currentUser(ctx);
        if (!user && ctx.state.session) sessions.clear(ctx);
        return { me: user ? toMe(user) : null };
      },
    }),
  ];
}

const tooMany = () => new HttpError(429, 'too_many_requests', 'Too many attempts, try again in 15 minutes');

async function welcome(db: Db, mailer: Mailer, name: string, to: string) {
  await sendEmail(db, mailer, {
    kind: 'welcome',
    to,
    subject: 'Welcome to Flossophy 🦷',
    text: `Hi ${name},\n\nYour account is ready. Pick a clinic, tap a time, and you're booked.\n\nKeep smiling,\nFlossy from Flossophy`,
  });
}
