import { z } from 'zod';

export const OutboxKind = z.enum(['booked', 'cancelled', 'welcome']);

export const OutboxEmail = z.object({
  id: z.string(),
  kind: OutboxKind,
  to: z.string(),
  subject: z.string(),
  text: z.string(),
  sentAt: z.string(),
});
export type OutboxEmail = z.infer<typeof OutboxEmail>;
