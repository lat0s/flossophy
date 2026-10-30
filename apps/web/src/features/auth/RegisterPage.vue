<script setup lang="ts">
import { RegisterInput } from '@flossophy/shared';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useSession } from '@/app/session';
import { ApiFailure } from '@/shared/api/client';
import UiButton from '@/shared/ui/UiButton.vue';
import UiField from '@/shared/ui/UiField.vue';
import AuthLayout from './AuthLayout.vue';
import { nextPath } from './redirect';

const session = useSession();
const route = useRoute();
const router = useRouter();
const form = reactive({ name: '', email: '', password: '' });
const errors = ref<Record<string, string>>({});
const busy = ref(false);

async function submit() {
  // Same schema as the API, so the messages match.
  const parsed = RegisterInput.safeParse(form);
  if (!parsed.success) {
    errors.value = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return;
  }
  errors.value = {};
  busy.value = true;
  try {
    await session.register(parsed.data);
    toast.success('Account created. Welcome to Flossophy!');
    router.replace(nextPath(route.query, 'patient'));
  } catch (e) {
    if (e instanceof ApiFailure) errors.value = Object.keys(e.fields).length ? e.fields : { form: e.message };
    else errors.value = { form: 'Could not create the account' };
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Create account" subtitle="Patients only. It takes ten seconds.">
    <form class="grid gap-4" novalidate @submit.prevent="submit">
      <UiField v-model="form.name" label="Name" autocomplete="name" :error="errors.name" :maxlength="80" />
      <UiField v-model="form.email" label="Email" type="email" autocomplete="email" :error="errors.email" />
      <UiField
        v-model="form.password"
        label="Password"
        type="password"
        autocomplete="new-password"
        :error="errors.password"
        hint="At least 10 characters"
      />
      <p
        v-if="errors.form"
        class="rounded-xl border-2 border-edge bg-pink-soft px-3 py-2 text-sm font-semibold"
        role="alert"
      >
        {{ errors.form }}
      </p>
      <UiButton type="submit" size="lg" :loading="busy">Create account</UiButton>
    </form>
    <p class="mt-5 text-center text-sm text-muted-ink">
      Have one?
      <RouterLink
        :to="{ path: '/login', query: route.query }"
        class="font-bold text-ink underline decoration-mint decoration-2 underline-offset-4"
        >Sign in</RouterLink
      >
    </p>
  </AuthLayout>
</template>
