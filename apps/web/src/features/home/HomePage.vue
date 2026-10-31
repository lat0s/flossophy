<script setup lang="ts">
import {
  ArrowRight,
  BookOpenText,
  CalendarCheck,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Zap,
} from '@lucide/vue';
import { computed } from 'vue';
import { useDemo } from '@/app/demo';
import Flossy from '@/shared/mascot/Flossy.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import UiCard from '@/shared/ui/UiCard.vue';

const demo = useDemo();
const start = computed(() => (demo.hasGate && !demo.open ? '/demo' : '/clinics'));

const features = [
  {
    icon: Zap,
    tone: 'mint',
    title: 'Live open times',
    text: 'Pick a clinic, a dentist and a time. Times others take disappear while you look.',
  },
  {
    icon: ShieldCheck,
    tone: 'pink',
    title: 'No double booking',
    text: 'Booking is one atomic database write. Two people, one time: one wins, one gets a friendly nudge.',
  },
  {
    icon: Stethoscope,
    tone: 'butter',
    title: 'Dentist portal',
    text: 'See the week, who is coming and why. Open a month of times in one go.',
  },
  {
    icon: Lock,
    tone: 'card',
    title: 'Your own sandbox',
    text: 'Every demo visitor gets a private copy of the data. Break things; nobody else sees it.',
  },
] as const;

const steps = [
  { title: 'Find a clinic', text: 'Search by name or area, or let the map find the nearest one.' },
  { title: 'Pick a time', text: 'Week view, per dentist. Booked times are crossed out.' },
  { title: 'Done', text: 'You get a confirmation email (in the demo Outbox). Cancel up to 24 h before.' },
];

const stack = [
  'Vue 3',
  'TypeScript',
  'Koa',
  'MongoDB',
  'zod',
  'Tailwind',
  'Reka UI',
  'Vitest',
  'Playwright',
  'Docker',
  'OpenAPI',
];
const tones = { mint: 'bg-mint-soft', pink: 'bg-pink-soft', butter: 'bg-butter-soft', card: 'bg-muted' };
</script>

<template>
  <div>
    <section class="dots border-b-2 border-edge">
      <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
        <div>
          <p
            class="brutal-sm mb-5 inline-flex items-center gap-2 rounded-full bg-butter px-3 py-1 text-sm font-bold text-[#17131f]"
          >
            <Sparkles class="size-4" /> Revived from a 2023 university project
          </p>
          <h1 class="text-[clamp(2.4rem,6vw,4.2rem)] leading-[0.95]">
            Book the dentist.<br />
            <span class="relative inline-block">
              <span class="relative z-10">Skip the drama.</span>
              <span class="absolute inset-x-0 bottom-1 -z-0 h-4 -rotate-1 rounded bg-mint/70" aria-hidden="true" />
            </span>
          </h1>
          <p class="mt-5 max-w-lg text-lg text-muted-ink">
            Flossophy finds open times at clinics around Gothenburg and books them in two taps. Dentists get a calm week
            view. Flossy gets to wave.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UiButton :to="start" size="lg">Open the live demo <ArrowRight class="size-5" /></UiButton>
            <UiButton href="/api/docs" variant="secondary" size="lg"><BookOpenText class="size-5" /> API docs</UiButton>
          </div>
          <p class="mt-4 text-sm text-muted-ink">No sign-up needed. Try it as Alex (patient) or Dr. Sara (dentist).</p>
        </div>

        <div class="relative mx-auto w-full max-w-sm">
          <div class="brutal-lg relative aspect-square rotate-2 rounded-[2.5rem] bg-mint">
            <Flossy pose="wave" mood="happy" label="Flossy the tooth, waving" class="absolute inset-6" />
          </div>
          <div class="brutal absolute -top-4 -left-6 -rotate-6 rounded-2xl bg-card px-3 py-2 text-sm font-bold">
            <CalendarCheck class="mr-1 inline size-4 text-mint" /> Today 09:30 · Floss Boss
          </div>
          <div
            class="brutal absolute -right-4 bottom-10 rotate-3 rounded-2xl bg-pink px-3 py-2 text-sm font-bold text-[#17131f]"
          >
            Booked!
          </div>
          <div
            class="brutal absolute -bottom-5 left-6 -rotate-2 rounded-2xl bg-butter px-3 py-2 text-sm font-bold text-[#17131f]"
          >
            <MapPin class="mr-1 inline size-4" /> 8 clinics nearby
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 py-16">
      <h2 class="text-3xl">What it does</h2>
      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard v-for="f in features" :key="f.title" class="p-5">
          <span class="brutal-sm mb-4 grid size-11 place-items-center rounded-xl" :class="tones[f.tone]"
            ><component :is="f.icon" class="size-5"
          /></span>
          <h3 class="text-lg">{{ f.title }}</h3>
          <p class="mt-2 text-muted-ink">{{ f.text }}</p>
        </UiCard>
      </div>
    </section>

    <section class="border-y-2 border-edge bg-mint-soft">
      <div class="mx-auto max-w-6xl px-4 py-16">
        <h2 class="text-3xl">How booking works</h2>
        <ol class="mt-8 grid gap-5 md:grid-cols-3">
          <li v-for="(s, i) in steps" :key="s.title" class="brutal flex gap-4 rounded-2xl bg-card p-5">
            <span
              class="brutal-sm grid size-10 shrink-0 place-items-center rounded-full bg-butter font-display text-[#17131f]"
              >{{ i + 1 }}</span
            >
            <div>
              <h3 class="text-lg">{{ s.title }}</h3>
              <p class="mt-1 text-muted-ink">{{ s.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-[1fr_1.2fr] md:items-center">
      <div>
        <h2 class="text-3xl">Built like a real product</h2>
        <p class="mt-3 text-muted-ink">
          Started as a university group project in 2023. Rebuilt from scratch in 2026 as a full-stack showcase: typed
          end to end, tested, containerised and secured.
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <span v-for="t in stack" :key="t" class="brutal-sm rounded-full bg-card px-3 py-1 text-sm font-bold">{{
            t
          }}</span>
        </div>
      </div>
      <UiCard tone="butter" class="p-6">
        <ul class="grid gap-3 font-semibold">
          <li class="flex gap-3">
            <ShieldCheck class="mt-0.5 size-5 shrink-0" /> argon2id passwords, httpOnly cookies, strict CSP
          </li>
          <li class="flex gap-3">
            <ShieldCheck class="mt-0.5 size-5 shrink-0" /> One zod schema validates, types and documents each route
          </li>
          <li class="flex gap-3">
            <ShieldCheck class="mt-0.5 size-5 shrink-0" /> Bot check before the demo wakes; the API sleeps when idle
          </li>
          <li class="flex gap-3">
            <ShieldCheck class="mt-0.5 size-5 shrink-0" /> Race-tested booking: five tries at once, exactly one wins
          </li>
        </ul>
      </UiCard>
    </section>
  </div>
</template>
