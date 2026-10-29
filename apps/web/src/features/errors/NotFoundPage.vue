<script setup lang="ts">
import Flossy from '@/shared/mascot/Flossy.vue';
import UiButton from '@/shared/ui/UiButton.vue';
</script>

<template>
  <div class="grid min-h-[calc(100dvh-8rem)] place-items-center px-4 py-12 text-center">
    <div>
      <Flossy mood="sad" cracked class="mx-auto size-44" label="Flossy with a crack, looking sad" />
      <p class="mt-4 font-display text-6xl">404</p>
      <h1 class="mt-2 text-2xl">This page fell out</h1>
      <p class="mt-2 text-muted-ink">We looked under the pillow. Nothing.</p>
      <div class="mt-6 flex justify-center gap-3">
        <UiButton to="/">Home</UiButton>
        <UiButton to="/clinics" variant="secondary">Find a clinic</UiButton>
      </div>
    </div>
  </div>
</template>
