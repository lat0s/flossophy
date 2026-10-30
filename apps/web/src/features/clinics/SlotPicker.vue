<script setup lang="ts">
import { addDays, zonedDate, type PublicSlot } from '@flossophy/shared';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { dayNum, dayShort, monthYear, time } from '@/shared/format';

const props = defineProps<{ slots: PublicSlot[]; from: string; loading?: boolean }>();
const emit = defineEmits<{ pick: [slot: PublicSlot]; week: [from: string] }>();

const today = zonedDate(Date.now());
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(props.from, i)));
const byDay = computed(() => {
  const map = new Map<string, PublicSlot[]>(days.value.map((d) => [d, []]));
  for (const s of props.slots) map.get(zonedDate(new Date(s.startsAt)))?.push(s);
  return map;
});
// Phones show one day at a time.
const day = ref(props.from);
const hasOpen = (d: string) => !!byDay.value.get(d)?.some((s) => !s.taken);
watch(
  byDay,
  () => {
    if (!days.value.includes(day.value) || !hasOpen(day.value)) day.value = days.value.find(hasOpen) ?? props.from;
  },
  { immediate: true },
);
const openCount = computed(() => props.slots.filter((s) => !s.taken).length);
// The API serves two weeks ahead.
const canNext = computed(() => props.from < addDays(today, 7));
</script>

<template>
  <section aria-labelledby="slots-title">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 id="slots-title" class="text-xl">{{ monthYear(from) }}</h2>
        <p class="text-sm text-muted-ink" aria-live="polite">
          {{ openCount }} open {{ openCount === 1 ? 'time' : 'times' }} this week
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="brutal-sm pressable grid size-10 place-items-center rounded-xl bg-card disabled:opacity-40"
          :disabled="from <= today"
          aria-label="Previous week"
          @click="emit('week', addDays(from, -7) < today ? today : addDays(from, -7))"
        >
          <ChevronLeft class="size-5" />
        </button>
        <button
          class="brutal-sm pressable grid size-10 place-items-center rounded-xl bg-card disabled:opacity-40"
          :disabled="!canNext"
          aria-label="Next week"
          @click="emit('week', addDays(from, 7))"
        >
          <ChevronRight class="size-5" />
        </button>
      </div>
    </div>

    <div class="sm:hidden" :class="loading && 'opacity-60'">
      <div class="grid grid-cols-7 gap-1" role="tablist" aria-label="Day">
        <button
          v-for="d in days"
          :key="d"
          role="tab"
          :aria-selected="d === day"
          class="rounded-xl border-2 border-edge py-1.5 text-center"
          :class="d === day ? 'bg-ink text-paper' : d === today ? 'bg-butter text-[#17131f]' : 'bg-card'"
          @click="day = d"
        >
          <div class="text-[10px] font-bold uppercase">{{ dayShort(d) }}</div>
          <div class="font-display leading-none">{{ dayNum(d) }}</div>
          <div class="mx-auto mt-1 size-1.5 rounded-full" :class="hasOpen(d) ? 'bg-mint' : 'bg-transparent'" />
        </button>
      </div>
      <ul class="mt-3 grid grid-cols-4 gap-2" role="tabpanel">
        <li v-for="s in byDay.get(day)" :key="s.id">
          <button
            v-if="!s.taken"
            class="num w-full rounded-lg border-2 border-edge bg-mint-soft py-2 text-sm font-bold text-mint-ink shadow-[2px_2px_0_0_var(--shadow)] active:translate-y-0.5 active:shadow-none"
            :aria-label="`Book ${time(s.startsAt)}, ${s.minutes} minutes`"
            @click="emit('pick', s)"
          >
            {{ time(s.startsAt) }}
          </button>
          <span
            v-else
            class="num block w-full rounded-lg border-2 border-dashed border-line py-2 text-center text-sm text-muted-ink line-through"
            >{{ time(s.startsAt) }}</span
          >
        </li>
        <li v-if="!byDay.get(day)?.length" class="col-span-4 py-6 text-center text-sm text-muted-ink">
          No times this day
        </li>
      </ul>
    </div>

    <div class="hidden sm:block" :class="loading && 'opacity-60'">
      <div class="grid grid-cols-7 gap-2">
        <div v-for="d in days" :key="d" class="min-w-0">
          <div
            class="mb-2 rounded-xl border-2 border-edge py-1.5 text-center"
            :class="d === today ? 'bg-butter text-[#17131f]' : 'bg-card'"
          >
            <div class="text-xs font-bold uppercase">{{ dayShort(d) }}</div>
            <div class="font-display text-lg leading-none">{{ dayNum(d) }}</div>
          </div>
          <ul class="grid gap-1.5" :aria-label="`Times on ${dayShort(d)} ${dayNum(d)}`">
            <li v-for="s in byDay.get(d)" :key="s.id">
              <button
                v-if="!s.taken"
                class="num w-full rounded-lg border-2 border-edge bg-mint-soft py-1.5 text-sm font-bold text-mint-ink shadow-[2px_2px_0_0_var(--shadow)] transition hover:-translate-y-px hover:bg-mint hover:text-[#0b2e25] active:translate-y-0.5 active:shadow-none"
                :aria-label="`Book ${time(s.startsAt)}, ${s.minutes} minutes`"
                @click="emit('pick', s)"
              >
                {{ time(s.startsAt) }}
              </button>
              <span
                v-else
                class="num block w-full rounded-lg border-2 border-dashed border-line py-1.5 text-center text-sm text-muted-ink line-through"
                :aria-label="`${time(s.startsAt)} taken`"
              >
                {{ time(s.startsAt) }}
              </span>
            </li>
            <li v-if="!byDay.get(d)?.length" class="py-3 text-center text-xs text-muted-ink">No times</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
