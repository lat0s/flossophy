import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/shared/api/client';

/** Demo features the API has on: one-click persona logins and the Outbox. */
export const useDemo = defineStore('demo', () => {
  const personas = ref(false);

  async function loadMeta() {
    try {
      personas.value = (await api<{ demo: boolean }>('/meta')).demo;
    } catch {
      personas.value = false;
    }
  }

  return { personas, loadMeta };
});
