<script setup lang="ts">
withDefaults(defineProps<{ as?: string; tone?: 'card' | 'mint' | 'pink' | 'butter' | 'muted' }>(), {
  as: 'div',
  tone: 'card',
});
const tones = {
  card: 'bg-card',
  mint: 'bg-mint-soft',
  pink: 'bg-pink-soft',
  butter: 'bg-butter-soft',
  muted: 'bg-muted',
};
</script>

<template>
  <component :is="as" class="brutal rounded-2xl" :class="tones[tone]"><slot /></component>
</template>
