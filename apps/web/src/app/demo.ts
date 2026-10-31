import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/shared/api/client';

type GateStatus = { open: boolean; siteKey: string; expiresAt: number | null };

/**
 * The live demo sits behind a small gate (Turnstile + signed cookie) so bots can't wake
 * the sleeping API. Locally there is no gate and everything is open.
 */
export const useDemo = defineStore('demo', () => {
  const hasGate = ref(false);
  const open = ref(true);
  const siteKey = ref('');
  const personas = ref(false);
  const checked = ref(false);

  async function check() {
    try {
      const res = await fetch('/gate/status', { credentials: 'same-origin' });
      if (res.ok && res.headers.get('content-type')?.includes('json')) {
        const s: GateStatus = await res.json();
        hasGate.value = true;
        open.value = s.open;
        siteKey.value = s.siteKey;
      }
    } catch {
      // no gate: local development
    }
    checked.value = true;
  }

  async function enter(token: string) {
    const res = await fetch('/gate/open', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message ?? 'The demo gate said no. Try again?');
    open.value = true;
  }

  /** Waits for the API (Sablier starts it on the first request). */
  async function wake(onTick?: (s: number) => void) {
    const start = Date.now();
    for (;;) {
      try {
        await api('/health');
        break;
      } catch {
        if (Date.now() - start > 90_000) throw new Error('The clinic is taking too long to wake up');
        onTick?.(Math.round((Date.now() - start) / 1000));
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    await loadMeta();
  }

  async function loadMeta() {
    try {
      personas.value = (await api<{ demo: boolean }>('/meta')).demo;
    } catch {
      personas.value = false;
    }
  }

  function closed() {
    open.value = false;
  }

  return { hasGate, open, siteKey, personas, checked, check, enter, wake, loadMeta, closed };
});
