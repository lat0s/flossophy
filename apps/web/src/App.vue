<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';
import AppFooter from '@/app/shell/AppFooter.vue';
import AppHeader from '@/app/shell/AppHeader.vue';
import { theme } from '@/shared/theme';
</script>

<template>
  <a
    href="#main"
    class="sr-only z-50 rounded-lg bg-ink px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >Skip to content</a
  >
  <div class="flex min-h-dvh flex-col">
    <AppHeader />
    <main id="main" class="flex-1">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
  </div>
  <Toaster
    position="bottom-center"
    :theme="theme"
    :toast-options="{ class: 'brutal !rounded-2xl !font-sans !text-[15px] !bg-card !text-ink !border-edge' }"
  />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 140ms ease,
    transform 160ms ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
</style>
