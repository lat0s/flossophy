import { OutboxEmail } from '@flossophy/shared';
import { z } from 'zod';
import { route } from '../../core/route.ts';

/** Demo only: shows the emails the app "sent", since nothing really leaves the server. */
export function outboxRoutes() {
  return [
    route({
      method: 'get',
      path: '/outbox',
      tag: 'Demo',
      summary: 'Emails sent in this demo sandbox, newest first',
      response: z.object({ emails: z.array(OutboxEmail) }),
      async handler(ctx) {
        const emails = await ctx.state.db.Email.find().sort({ sentAt: -1 }).limit(50).lean();
        return {
          emails: emails.map((e) => ({
            id: String(e._id),
            kind: e.kind,
            to: e.to,
            subject: e.subject,
            text: e.text,
            sentAt: e.sentAt.toISOString(),
          })),
        };
      },
    }),
  ];
}
