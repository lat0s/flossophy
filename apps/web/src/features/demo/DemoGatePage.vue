<script setup lang="ts">
import type { Role } from '@flossophy/shared';
import { ArrowRight, ShieldCheck } from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDemo } from '@/app/demo';
import { useSession } from '@/app/session';
import { nextPath } from '@/features/auth/redirect';
import DemoPersonas from '@/features/auth/DemoPersonas.vue';
import Flossy from '@/shared/mascot/Flossy.vue';
import { theme } from '@/shared/theme';
import UiButton from '@/shared/ui/UiButton.vue';
import { loadTurnstile } from './turnstile';

type Step = 'check' | 'waking' | 'ready' | 'error';

const demo = useDemo();
const session = useSession();
const route = useRoute();
const router = useRouter();
const step = ref<Step>('check');
const error = ref('');
const seconds = ref(0);
// Decided once, so signing in from the picker doesn't unmount it mid-redirect.
const pickPersona = ref(false);
const box = ref<HTMLElement>();
let widget: string | undefined;

async function wake() {
  step.value = 'waking';
  try {
    await demo.wake((s) => (seconds.value = s));
    await session.load();
    pickPersona.value = demo.personas && !session.me;
    step.value = 'ready';
  } catch (e) {
    fail(e);
  }
}

function fail(e: unknown) {
  error.value = e instanceof Error ? e.message : 'Something went wrong';
  step.value = 'error';
}

async function challenge() {
  step.value = 'check';
  error.value = '';
  try {
    const ts = await loadTurnstile();
    if (widget) ts.remove(widget);
    widget = ts.render(box.value!, {
      sitekey: demo.siteKey,
      theme: theme.value,
      action: 'open-demo',
      callback: async (token: string) => {
        try {
          await demo.enter(token);
          await wake();
        } catch (e) {
          fail(e);
        }
      },
      'error-callback': () => fail(new Error('The bot check failed. Refresh and try again.')),
    });
  } catch (e) {
    fail(e);
  }
}

function retry() {
  if (demo.hasGate && !demo.open) challenge();
  else wake();
}

onMounted(() => (demo.hasGate && !demo.open ? challenge() : wake()));
onBeforeUnmount(() => widget && window.turnstile?.remove(widget));

const go = (role?: Role) =>
  router.replace(
    role
      ? nextPath(route.query, role)
      : typeof route.query.next === 'string'
        ? nextPath(route.query, 'patient')
        : '/clinics',
  );
</script>

<template>
  <div class="dots grid min-h-[calc(100dvh-8rem)] place-items-center px-4 py-10">
    <div class="brutal-lg w-full max-w-lg rounded-3xl bg-card p-6 text-center sm:p-8">
      <template v-if="step === 'check'">
        <Flossy pose="wave" mood="wink" class="mx-auto size-32" />
        <h1 class="mt-3 text-3xl">Open the live demo</h1>
        <p class="mt-2 text-muted-ink">
          A quick bot check keeps the clinic quiet for humans. You then get your own private copy of the data for an
          hour.
        </p>
        <div ref="box" class="mt-6 flex min-h-[70px] justify-center" />
        <p class="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-ink">
          <ShieldCheck class="size-4" /> Protected by Cloudflare Turnstile. No tracking cookies.
        </p>
      </template>

      <template v-else-if="step === 'waking'">
        <Flossy pose="floss" mood="happy" class="mx-auto size-36" label="Flossy flossing while the clinic wakes up" />
        <h1 class="mt-3 text-3xl">Waking the clinic…</h1>
        <p class="mt-2 text-muted-ink" aria-live="polite">
          The API sleeps when nobody is around, to save power.
          {{ seconds > 2 ? `${seconds}s, nearly there.` : 'Hang on a sec.' }}
        </p>
      </template>

      <template v-else-if="step === 'ready'">
        <Flossy pose="cheer" mood="happy" class="mx-auto size-32" />
        <h1 class="mt-3 text-3xl">You're in!</h1>
        <p class="mt-2 mb-6 text-muted-ink">Pick who you want to be. Your sandbox is fresh and only yours.</p>
        <DemoPersonas v-if="pickPersona" @done="go" />
        <div class="mt-5 flex justify-center">
          <UiButton v-if="pickPersona" variant="ghost" @click="go()"
            >Just look around <ArrowRight class="size-4"
          /></UiButton>
          <UiButton v-else-if="session.me" @click="go(session.me.role)"
            >Continue as {{ session.me.name.split(' ')[0] }} <ArrowRight class="size-4"
          /></UiButton>
          <UiButton v-else @click="go()">Find a clinic <ArrowRight class="size-4" /></UiButton>
        </div>
      </template>

      <template v-else>
        <Flossy mood="sad" cracked class="mx-auto size-32" />
        <h1 class="mt-3 text-3xl">Ouch.</h1>
        <p class="mt-2 text-muted-ink" role="alert">{{ error }}</p>
        <UiButton class="mt-6" @click="retry">Try again</UiButton>
      </template>
    </div>
  </div>
</template>
