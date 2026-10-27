import type { Context, Next } from 'koa';
import { ZodError } from 'zod';
import type { ApiError, ErrorCode } from '@flossophy/shared';
import { log } from './log.ts';

export class HttpError extends Error {
  status: number;
  code: ErrorCode;
  fields: Record<string, string> | undefined;
  constructor(status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} not found`);

export function zodFields(err: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Turns thrown errors into the shared ApiError shape. Never leaks stack traces. */
export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next();
    if (ctx.status === 404 && ctx.body === undefined) throw notFound('Route');
  } catch (err) {
    let body: ApiError;
    if (err instanceof HttpError) {
      ctx.status = err.status;
      body = { error: { code: err.code, message: err.message, fields: err.fields } };
    } else if (err instanceof ZodError) {
      ctx.status = 400;
      body = { error: { code: 'bad_request', message: 'Check the highlighted fields', fields: zodFields(err) } };
    } else if (isClientError(err)) {
      ctx.status = err.status;
      body = { error: { code: 'bad_request', message: err.expose ? err.message : 'Bad request' } };
    } else {
      log.error('unhandled', { path: ctx.path, err: err instanceof Error ? err.stack : String(err) });
      ctx.status = 500;
      body = { error: { code: 'internal', message: 'Something went wrong on our side' } };
    }
    ctx.body = body;
  }
}

function isClientError(err: unknown): err is { status: number; expose?: boolean; message: string } {
  const s = (err as { status?: unknown })?.status;
  return typeof s === 'number' && s >= 400 && s < 500;
}
