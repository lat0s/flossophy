<script setup lang="ts">
import { CalendarHeart, LogOut, Menu, Moon, Stethoscope, Sun, X } from '@lucide/vue';
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useDemo } from '@/app/demo';
import { useSession } from '@/app/session';
import Flossy from '@/shared/mascot/Flossy.vue';
import { theme, toggleTheme } from '@/shared/theme';
import UiButton from '@/shared/ui/UiButton.vue';

const session = useSession();
const demo = useDemo();
const router = useRouter();
const route = useRoute();
const open = ref(false);
watch(
  () => route.fullPath,
  () => (open.value = false),
);

async function logout() {
  await session.logout();
  toast('Signed out. Keep flossing!');
  router.push('/');
}

const link =
  'rounded-xl px-3 py-2 font-bold hover:bg-muted aria-[current=page]:bg-mint-soft aria-[current=page]:text-mint-ink';
</script>

<template>
  <header class="sticky top-0 z-[900] border-b-2 border-edge bg-paper/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
      <RouterLink to="/" class="flex items-center gap-2" aria-label="Flossophy home">
        <Flossy :animated="false" mood="wink" class="size-9" />
        <span class="font-display text-lg tracking-tight">Flossophy</span>
      </RouterLink>

      <nav class="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
        <RouterLink to="/clinics" :class="link">Clinics</RouterLink>
        <RouterLink v-if="session.isPatient" to="/visits" :class="link">My visits</RouterLink>
        <RouterLink v-if="session.isDentist" to="/dentist" :class="link">Schedule</RouterLink>
        <RouterLink v-if="demo.personas" to="/outbox" :class="link">Outbox</RouterLink>
        <a href="/api/docs" :class="link">API</a>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <button
          class="brutal-sm pressable grid size-10 place-items-center rounded-xl bg-card"
          :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
          @click="toggleTheme"
        >
          <Sun v-if="theme === 'dark'" class="size-5" />
          <Moon v-else class="size-5" />
        </button>
        <template v-if="session.me">
          <span class="hidden items-center gap-1.5 text-sm font-bold text-muted-ink lg:flex">
            <Stethoscope v-if="session.isDentist" class="size-4" />
            <CalendarHeart v-else class="size-4" />
            {{ session.me.name }}
          </span>
          <UiButton variant="secondary" size="sm" class="hidden md:inline-flex" @click="logout"
            ><LogOut class="size-4" />Sign out</UiButton
          >
        </template>
        <UiButton v-else-if="session.loaded" to="/login" size="sm" class="hidden md:inline-flex">Sign in</UiButton>
        <UiButton v-else to="/clinics" size="sm" class="hidden md:inline-flex">Book a visit</UiButton>
        <button
          class="brutal-sm pressable grid size-10 place-items-center rounded-xl bg-card md:hidden"
          :aria-expanded="open"
          aria-label="Menu"
          @click="open = !open"
        >
          <X v-if="open" class="size-5" />
          <Menu v-else class="size-5" />
        </button>
      </div>
    </div>

    <nav v-if="open" class="grid gap-1 border-t-2 border-edge bg-paper px-4 py-3 md:hidden" aria-label="Mobile">
      <RouterLink to="/clinics" :class="link">Clinics</RouterLink>
      <RouterLink v-if="session.isPatient" to="/visits" :class="link">My visits</RouterLink>
      <RouterLink v-if="session.isDentist" to="/dentist" :class="link">Schedule</RouterLink>
      <RouterLink v-if="demo.personas" to="/outbox" :class="link">Outbox</RouterLink>
      <a href="/api/docs" :class="link">API docs</a>
      <button v-if="session.me" :class="link" class="text-left" @click="logout">Sign out</button>
      <RouterLink v-else to="/login" :class="link">Sign in</RouterLink>
    </nav>
  </header>
</template>
