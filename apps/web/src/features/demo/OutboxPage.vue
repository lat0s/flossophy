<script setup lang="ts">
import type { OutboxEmail } from '@flossophy/shared';
import { Mail, MailCheck, MailX, PartyPopper } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { useDemo } from '@/app/demo';
import { useOutbox } from '@/shared/api/queries';
import { relative } from '@/shared/format';
import EmptyState from '@/shared/ui/EmptyState.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import UiSpinner from '@/shared/ui/UiSpinner.vue';

const demo = useDemo();
const { data, isPending } = useOutbox(() => demo.personas);
const emails = computed(() => data.value?.emails ?? []);
const openId = ref<string>();
watch(emails, (e) => !openId.value && (openId.value = e[0]?.id), { immediate: true });
const current = computed(() => emails.value.find((e) => e.id === openId.value));
const paragraphs = computed(() => current.value?.text.split(/\n{2,}/) ?? []);
const sentAt = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const icon = { booked: MailCheck, cancelled: MailX, welcome: PartyPopper } satisfies Record<
  OutboxEmail['kind'],
  unknown
>;
const tone = { booked: 'bg-mint-soft', cancelled: 'bg-pink-soft', welcome: 'bg-butter-soft' };
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="text-3xl sm:text-4xl">Outbox</h1>
    <p class="mt-1 text-muted-ink">Every email the app would send. In the demo nothing leaves the building.</p>

    <EmptyState v-if="!demo.personas" title="The outbox is a demo thing" mood="wow">
      Run the API with DEMO_PERSONAS=true to see it.
    </EmptyState>
    <UiSpinner v-else-if="isPending" />
    <EmptyState v-else-if="!emails.length" title="No mail yet" pose="wave">
      Book or cancel a visit and the emails show up here.
      <template #actions><UiButton to="/clinics">Book a visit</UiButton></template>
    </EmptyState>
    <div v-else class="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
      <ul class="flex min-w-0 flex-col gap-2" aria-label="Emails">
        <li v-for="e in emails" :key="e.id">
          <button
            class="brutal-sm pressable flex w-full gap-3 rounded-xl p-3 text-left"
            :class="e.id === openId ? 'bg-ink text-paper' : 'bg-card'"
            :aria-current="e.id === openId || undefined"
            @click="openId = e.id"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-edge text-ink"
              :class="tone[e.kind]"
              ><component :is="icon[e.kind]" class="size-4"
            /></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-bold">{{ e.subject }}</span>
              <span class="block truncate text-sm opacity-70">{{ e.to }} · {{ relative(e.sentAt) }}</span>
            </span>
          </button>
        </li>
      </ul>
      <article v-if="current" class="brutal min-w-0 overflow-hidden rounded-2xl bg-card">
        <header class="border-b-2 border-dashed border-line px-6 py-5">
          <h2 class="text-xl break-words sm:text-2xl">{{ current.subject }}</h2>
          <dl class="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
            <dt class="text-muted-ink">From</dt>
            <dd class="flex items-center gap-1.5 font-medium"><Mail class="size-4 shrink-0" /> Flossy at Flossophy</dd>
            <dt class="text-muted-ink">To</dt>
            <dd class="break-all">{{ current.to }}</dd>
            <dt class="text-muted-ink">Sent</dt>
            <dd>{{ sentAt(current.sentAt) }}</dd>
          </dl>
        </header>
        <div class="grid gap-4 px-6 py-6 leading-relaxed">
          <p v-for="(p, i) in paragraphs" :key="i" class="break-words whitespace-pre-line">{{ p }}</p>
        </div>
      </article>
    </div>
  </div>
</template>
