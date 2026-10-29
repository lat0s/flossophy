<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'mint' | 'pink' | 'butter' | 'muted' | 'ink' }>(), { tone: 'muted' });
const tones = {
  mint: 'bg-mint-soft text-mint-ink',
  pink: 'bg-pink-soft text-ink',
  butter: 'bg-butter-soft text-ink',
  muted: 'bg-muted text-muted-ink',
  ink: 'bg-ink text-paper',
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border-2 border-edge px-2 py-0.5 text-xs font-bold"
    :class="tones[tone]"
  >
    <slot />
  </span>
</template>
