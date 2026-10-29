<script setup lang="ts">
import Flossy from '@/shared/mascot/Flossy.vue';
defineProps<{ label?: string }>();
</script>

<template>
  <div class="grid place-items-center py-16 text-center" role="status">
    <Flossy pose="floss" mood="wink" class="size-24" />
    <p class="mt-3 font-bold text-muted-ink">{{ label ?? 'Flossing…' }}</p>
  </div>
</template>
