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
    <div v-else class="mt-6 grid gap-5 md:grid-cols-[340px_1fr]">
      <ul class="grid content-start gap-2" aria-label="Emails">
        <li v-for="e in emails" :key="e.id">
          <button
            class="brutal-sm pressable flex w-full gap-3 rounded-xl p-3 text-left"
            :class="e.id === openId ? 'bg-ink text-paper' : 'bg-card'"
            :aria-current="e.id === openId || undefined"
            @click="openId = e.id"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-[#17131f] text-[#17131f]"
              :class="tone[e.kind]"
              ><component :is="icon[e.kind]" class="size-4"
            /></span>
            <span class="min-w-0">
              <span class="block truncate font-bold">{{ e.subject }}</span>
              <span class="block truncate text-sm opacity-70">{{ e.to }} · {{ relative(e.sentAt) }}</span>
            </span>
          </button>
        </li>
      </ul>
      <article v-if="current" class="brutal rounded-2xl bg-card p-6">
        <p class="flex items-center gap-2 text-sm text-muted-ink"><Mail class="size-4" /> To {{ current.to }}</p>
        <h2 class="mt-2 text-2xl">{{ current.subject }}</h2>
        <pre class="mt-5 font-sans whitespace-pre-wrap">{{ current.text }}</pre>
      </article>
    </div>
  </div>
</template>
