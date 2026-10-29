<script setup lang="ts">
import Flossy from '@/shared/mascot/Flossy.vue';

withDefaults(
  defineProps<{ title: string; mood?: 'happy' | 'wink' | 'sad' | 'wow'; pose?: 'idle' | 'wave' | 'floss' | 'cheer' }>(),
  {
    mood: 'wink',
    pose: 'idle',
  },
);
</script>

<template>
  <div class="grid place-items-center px-6 py-12 text-center">
    <Flossy :mood="mood" :pose="pose" class="mb-4 size-28" />
    <p class="font-display text-lg">{{ title }}</p>
    <div class="mt-1 max-w-sm text-muted-ink"><slot /></div>
    <div v-if="$slots.actions" class="mt-5 flex flex-wrap justify-center gap-3"><slot name="actions" /></div>
  </div>
</template>
