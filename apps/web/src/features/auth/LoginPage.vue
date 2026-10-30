<script setup lang="ts">
import type { Role } from '@flossophy/shared';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useDemo } from '@/app/demo';
import { useSession } from '@/app/session';
import { ApiFailure } from '@/shared/api/client';
import UiButton from '@/shared/ui/UiButton.vue';
import UiField from '@/shared/ui/UiField.vue';
import AuthLayout from './AuthLayout.vue';
import DemoPersonas from './DemoPersonas.vue';
import { nextPath } from './redirect';

const session = useSession();
const demo = useDemo();
const route = useRoute();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

const done = (role: Role) => router.replace(nextPath(route.query, role));

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await session.login({ email: email.value, password: password.value });
    toast.success(`Welcome back, ${session.me!.name.split(' ')[0]}!`);
    done(session.me!.role);
  } catch (e) {
    error.value = e instanceof ApiFailure ? e.message : 'Could not sign in';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Sign in" subtitle="Good to see you. Floss today?">
    <template v-if="demo.personas">
      <p class="mb-3 text-sm font-bold">Try the demo in one click</p>
      <DemoPersonas @done="done" />
      <div class="my-6 flex items-center gap-3 text-sm text-muted-ink">
        <span class="h-0.5 flex-1 bg-line" /> or use an account <span class="h-0.5 flex-1 bg-line" />
      </div>
    </template>
    <form class="grid gap-4" novalidate @submit.prevent="submit">
      <UiField v-model="email" label="Email" type="email" autocomplete="email" />
      <UiField v-model="password" label="Password" type="password" autocomplete="current-password" />
      <p v-if="error" class="rounded-xl border-2 border-edge bg-pink-soft px-3 py-2 text-sm font-semibold" role="alert">
        {{ error }}
      </p>
      <UiButton type="submit" size="lg" :loading="busy">Sign in</UiButton>
    </form>
    <p class="mt-5 text-center text-sm text-muted-ink">
      New here?
      <RouterLink
        :to="{ path: '/register', query: route.query }"
        class="font-bold text-ink underline decoration-mint decoration-2 underline-offset-4"
        >Create an account</RouterLink
      >
    </p>
  </AuthLayout>
</template>
