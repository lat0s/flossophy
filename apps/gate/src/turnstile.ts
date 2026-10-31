export type Verify = (token: string, ip: string) => Promise<boolean>;

const URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Must match the action the web app renders the widget with. */
export const ACTION = 'open-demo';

/** Server-side Turnstile check. Fails closed on any error. */
export function turnstile(secret: string, hostname?: string): Verify {
  return async (token, ip) => {
    if (!token || token.length > 2048) return false;
    try {
      const res = await fetch(URL, {
        method: 'POST',
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as { success?: boolean; hostname?: string; action?: string };
      if (!data.success) return false;
      // Test keys report no action; real ones must match.
      if (data.action && data.action !== ACTION) return false;
      return !hostname || data.hostname === hostname;
    } catch {
      return false;
    }
  };
}
