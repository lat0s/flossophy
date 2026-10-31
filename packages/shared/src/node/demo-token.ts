import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Name of the cookie the gate sets once a visitor passed Turnstile. */
export const DEMO_COOKIE = 'fl_demo';

/** `<sandboxId>.<expiresAtSec>.<hmac>`; the sandbox id names the visitor's private database. */
export function signDemoToken(secret: string, ttlSec: number, now = Date.now()) {
  const id = randomBytes(9).toString('base64url').replace(/[-_]/g, 'x').toLowerCase();
  const exp = Math.floor(now / 1000) + ttlSec;
  const body = `${id}.${exp}`;
  return { token: `${body}.${mac(secret, body)}`, sandboxId: id, expiresAt: exp };
}

export function verifyDemoToken(secret: string, token: string | undefined, now = Date.now()) {
  if (!token) return null;
  const [id, exp, sig] = token.split('.');
  if (!id || !exp || !sig || !/^[a-z0-9]{12}$/.test(id)) return null;
  const want = Buffer.from(mac(secret, `${id}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (Number(exp) * 1000 < now) return null;
  return { sandboxId: id, expiresAt: Number(exp) };
}

function mac(secret: string, body: string) {
  return createHmac('sha256', secret).update(body).digest('base64url');
}
