/** Wakes the sleeping API through Sablier and remembers it is up for a short while. */
export type Wake = () => Promise<boolean>;

export function sablier(url: string, group: string, session: string): Wake {
  const q = new URLSearchParams({ group, session_duration: session, timeout: '60s' });
  let awakeUntil = 0;
  let pending: Promise<boolean> | null = null;
  return () => {
    if (Date.now() < awakeUntil) return Promise.resolve(true);
    // Each call also extends Sablier's idle session, so ping at most every 30s.
    pending ??= fetch(`${url.replace(/\/$/, '')}/api/strategies/blocking?${q}`, { signal: AbortSignal.timeout(65_000) })
      .then((r) => {
        if (r.ok) awakeUntil = Date.now() + 30_000;
        return r.ok;
      })
      .catch(() => false)
      .finally(() => (pending = null));
    return pending;
  };
}

export const alwaysAwake: Wake = () => Promise.resolve(true);
