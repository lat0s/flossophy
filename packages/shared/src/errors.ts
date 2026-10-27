import { z } from 'zod';

export const ErrorCode = z.enum([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'too_many_requests',
  'demo_full',
  'demo_required',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** Every error response has this shape. */
export const ApiError = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
