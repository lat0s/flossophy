<script setup lang="ts">
import { initials } from '@/shared/format';

withDefaults(defineProps<{ name: string; color: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' });
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center rounded-full border-2 border-[#17131f] font-display text-[#17131f]"
    :class="{ sm: 'size-8 text-[11px]', md: 'size-11 text-sm', lg: 'size-16 text-lg' }[size]"
    :style="{ background: color }"
    aria-hidden="true"
  >
    {{ initials(name) }}
  </span>
</template>
