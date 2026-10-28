import { DemoLoginInput, Me } from '@flossophy/shared';
import { z } from 'zod';
import type { Config } from '../../core/config.ts';
import { HttpError } from '../../core/errors.ts';
import { route } from '../../core/route.ts';
import type { Sessions } from '../../core/session.ts';
import { DEMO_DENTIST_EMAIL, DEMO_PATIENT } from '../../seed/data.ts';
import { toMe } from '../auth/routes.ts';

export const Meta = z.object({ demo: z.boolean(), sandbox: z.boolean() });

export function demoRoutes(cfg: Config, sessions: Sessions) {
  return [
    route({
      method: 'get',
      path: '/meta',
      tag: 'Demo',
      summary: 'Which demo features this server has on',
      response: Meta,
      async handler(ctx) {
        return { demo: cfg.DEMO_PERSONAS, sandbox: ctx.state.sandboxId !== null };
      },
    }),
    route({
      method: 'post',
      path: '/demo/login',
      tag: 'Demo',
      summary: 'Sign in as the seeded demo Patient or Dentist',
      body: DemoLoginInput,
      response: Me,
      async handler(ctx, { body }) {
        if (!cfg.DEMO_PERSONAS) throw new HttpError(404, 'not_found', 'Demo logins are off');
        const email = body.as === 'patient' ? DEMO_PATIENT.email : DEMO_DENTIST_EMAIL;
        const user = await ctx.state.db.User.findOne({ email }).lean();
        if (!user) throw new HttpError(404, 'not_found', 'Run the seed first: pnpm seed');
        await sessions.issue(ctx, { userId: String(user._id), role: body.as, sandboxId: ctx.state.sandboxId });
        return toMe(user);
      },
    }),
  ];
}
