import type { LoginInput, Me, MeResponse, RegisterInput, Role } from '@flossophy/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/shared/api/client';
import { queryClient } from './query';

/** Who is signed in. The server owns the session cookie; this only mirrors it. */
export const useSession = defineStore('session', () => {
  const me = ref<Me | null>(null);
  const loaded = ref(false);

  async function load() {
    try {
      me.value = (await api<MeResponse>('/auth/me')).me;
    } catch {
      me.value = null;
    } finally {
      loaded.value = true;
    }
  }

  function set(user: Me | null) {
    me.value = user;
    loaded.value = true;
    queryClient.removeQueries({ queryKey: ['appointments'] });
    queryClient.removeQueries({ queryKey: ['schedule'] });
  }

  return {
    me,
    loaded,
    load,
    isPatient: computed(() => me.value?.role === 'patient'),
    isDentist: computed(() => me.value?.role === 'dentist'),
    login: async (body: LoginInput) => set(await api<Me>('/auth/login', { method: 'POST', body })),
    register: async (body: RegisterInput) => set(await api<Me>('/auth/register', { method: 'POST', body })),
    demoLogin: async (as: Role) => set(await api<Me>('/demo/login', { method: 'POST', body: { as } })),
    clear: () => set(null),
    logout: async () => {
      await api('/auth/logout', { method: 'POST' });
      set(null);
    },
  };
});
