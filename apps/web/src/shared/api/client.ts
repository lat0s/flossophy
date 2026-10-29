import type { ErrorCode } from '@flossophy/shared';

export class ApiFailure extends Error {
  status: number;
  code: ErrorCode | 'network';
  fields: Record<string, string>;
  constructor(status: number, code: ApiFailure['code'], message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
};

const listeners = new Set<(e: ApiFailure) => void>();
/** Called for every failed request, e.g. to send visitors back to the demo gate. */
export const onApiFailure = (fn: (e: ApiFailure) => void) => listeners.add(fn);

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const qs = opts.query
    ? '?' +
      new URLSearchParams(
        Object.entries(opts.query)
          .filter((e): e is [string, string] => e[1] !== undefined)
          .map(([k, v]) => [k, String(v)]),
      )
    : '';
  let res: Response;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method: opts.method ?? 'GET',
      credentials: 'same-origin',
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch {
    throw new ApiFailure(0, 'network', "Can't reach the clinic right now. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    const fail = new ApiFailure(res.status, e?.code ?? 'internal', e?.message ?? 'Something went wrong', e?.fields);
    listeners.forEach((fn) => fn(fail));
    throw fail;
  }
  return data as T;
}
