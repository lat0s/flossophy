<script setup lang="ts">
import Flossy from '@/shared/mascot/Flossy.vue';
defineProps<{ title: string; subtitle: string }>();
</script>

<template>
  <div class="dots min-h-[calc(100dvh-8rem)] px-4 py-10">
    <div class="brutal-lg mx-auto max-w-md rounded-3xl bg-card p-6 sm:p-8">
      <Flossy mood="wink" class="-mt-16 mb-2 size-24" />
      <h1 class="text-3xl">{{ title }}</h1>
      <p class="mt-1 mb-6 text-muted-ink">{{ subtitle }}</p>
      <slot />
    </div>
  </div>
</template>
