<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'butter';
    size?: 'sm' | 'md' | 'lg';
    to?: RouteLocationRaw;
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
);

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold whitespace-nowrap select-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-[15px]',
    lg: 'h-14 px-6 text-lg',
  }[props.size],
  {
    primary: 'brutal-sm pressable bg-mint text-[#0b2e25]',
    secondary: 'brutal-sm pressable bg-card text-ink',
    butter: 'brutal-sm pressable bg-butter text-[#17131f]',
    danger: 'brutal-sm pressable bg-pink text-[#17131f]',
    ghost: 'text-ink hover:bg-muted',
  }[props.variant],
]);
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes"><slot /></RouterLink>
  <a v-else-if="href" :href="href" :class="classes" target="_blank" rel="noopener"><slot /></a>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <span
      v-if="loading"
      class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
