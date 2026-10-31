<script setup lang="ts">
import { addDays, zonedDate, type ScheduleSlot } from '@flossophy/shared';
import { ChevronLeft, ChevronRight, Plus, X } from '@lucide/vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { useSession } from '@/app/session';
import { api, ApiFailure } from '@/shared/api/client';
import { useSchedule } from '@/shared/api/queries';
import { dayNum, dayShort, monthYear, time } from '@/shared/format';
import EmptyState from '@/shared/ui/EmptyState.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import UiCard from '@/shared/ui/UiCard.vue';
import UiSpinner from '@/shared/ui/UiSpinner.vue';
import OpenSlotsDialog from './OpenSlotsDialog.vue';

const session = useSession();
const qc = useQueryClient();
const today = zonedDate(Date.now());
// A rolling week from today, so the next seven days are always in view.
const from = ref(today);
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(from.value, i)));
const { data, isPending, isError, refetch, isFetching } = useSchedule(from);
const openDialog = ref(false);

const slots = computed(() => data.value?.slots ?? []);
const byDay = computed(() => {
  const m = new Map<string, ScheduleSlot[]>(days.value.map((d) => [d, []]));
  for (const s of slots.value) m.get(zonedDate(new Date(s.startsAt)))?.push(s);
  return m;
});
const stats = computed(() => {
  const booked = slots.value.filter((s) => s.patient).length;
  const total = slots.value.length;
  const next = slots.value.find((s) => s.patient && new Date(s.startsAt).getTime() > Date.now());
  return { booked, open: total - booked, fill: total ? Math.round((booked / total) * 100) : 0, next };
});

const close = useMutation({
  mutationFn: (id: string) => api(`/dentist/slots/${id}`, { method: 'DELETE' }),
  onSuccess: () => toast('Time closed'),
  onError: (e) => toast.error(e instanceof ApiFailure ? e.message : 'Could not close the time'),
  onSettled: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
});
const isPast = (s: ScheduleSlot) => new Date(s.startsAt).getTime() < Date.now();
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl sm:text-4xl">Your week</h1>
        <p class="mt-1 text-muted-ink">{{ session.me?.name }} · {{ session.me?.title }}</p>
      </div>
      <UiButton size="lg" @click="openDialog = true"><Plus class="size-5" /> Open times</UiButton>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <UiCard tone="mint" class="p-4"
        ><p class="text-sm font-bold">Booked</p>
        <p class="num font-display text-3xl">{{ stats.booked }}</p></UiCard
      >
      <UiCard class="p-4"
        ><p class="text-sm font-bold">Open</p>
        <p class="num font-display text-3xl">{{ stats.open }}</p></UiCard
      >
      <UiCard tone="butter" class="p-4"
        ><p class="text-sm font-bold">Filled</p>
        <p class="num font-display text-3xl">{{ stats.fill }}%</p></UiCard
      >
      <UiCard tone="pink" class="p-4">
        <p class="text-sm font-bold">Next patient</p>
        <p class="truncate font-display text-lg">{{ stats.next ? stats.next.patient!.name : '—' }}</p>
        <p v-if="stats.next" class="num text-sm">
          {{ dayShort(zonedDate(new Date(stats.next.startsAt))) }} {{ time(stats.next.startsAt) }}
        </p>
      </UiCard>
    </div>

    <UiCard class="mt-6 min-w-0 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl">{{ monthYear(from) }}</h2>
        <div class="flex items-center gap-2">
          <UiButton variant="ghost" size="sm" :disabled="from === today" @click="from = today">Today</UiButton>
          <button
            class="brutal-sm pressable grid size-10 place-items-center rounded-xl bg-card"
            aria-label="Previous week"
            @click="from = addDays(from, -7)"
          >
            <ChevronLeft class="size-5" />
          </button>
          <button
            class="brutal-sm pressable grid size-10 place-items-center rounded-xl bg-card"
            aria-label="Next week"
            @click="from = addDays(from, 7)"
          >
            <ChevronRight class="size-5" />
          </button>
        </div>
      </div>

      <UiSpinner v-if="isPending" label="Loading your week…" />
      <EmptyState v-else-if="isError" title="Could not load the schedule" mood="sad"
        ><template #actions><UiButton @click="refetch()">Try again</UiButton></template></EmptyState
      >
      <EmptyState v-else-if="!slots.length" title="A quiet week" pose="wave">
        No times this week. Open some so patients can book.
        <template #actions><UiButton @click="openDialog = true">Open times</UiButton></template>
      </EmptyState>
      <div v-else class="-mx-5 overflow-x-auto px-5 pb-2" :class="isFetching && 'opacity-70'">
        <div class="grid min-w-[880px] grid-cols-7 gap-2">
          <div v-for="d in days" :key="d" class="min-w-0">
            <div
              class="mb-2 rounded-xl border-2 border-edge py-1.5 text-center"
              :class="d === today ? 'bg-butter text-[#17131f]' : 'bg-card'"
            >
              <div class="text-xs font-bold uppercase">{{ dayShort(d) }}</div>
              <div class="font-display text-lg leading-none">{{ dayNum(d) }}</div>
            </div>
            <ul class="grid gap-1.5">
              <li
                v-for="s in byDay.get(d)"
                :key="s.id"
                class="group relative rounded-lg border-2 p-2 text-xs"
                :class="[
                  s.patient ? 'border-edge bg-mint-soft' : 'border-dashed border-line bg-card',
                  isPast(s) && 'opacity-55',
                ]"
              >
                <p class="num font-bold">
                  {{ time(s.startsAt) }} <span class="font-normal text-muted-ink">· {{ s.minutes }}m</span>
                </p>
                <template v-if="s.patient">
                  <p class="truncate font-bold" :title="s.patient.email">{{ s.patient.name }}</p>
                  <p v-if="s.patient.reason" class="line-clamp-2 text-muted-ink" :title="s.patient.reason">
                    {{ s.patient.reason }}
                  </p>
                </template>
                <p v-else class="text-muted-ink">Open · {{ s.clinicName }}</p>
                <button
                  v-if="!s.patient && !isPast(s)"
                  class="absolute top-1 right-1 grid size-6 place-items-center rounded-md hover:bg-pink-soft focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  :aria-label="`Close ${time(s.startsAt)}`"
                  @click="close.mutate(s.id)"
                >
                  <X class="size-3.5" />
                </button>
              </li>
              <li v-if="!byDay.get(d)?.length" class="py-3 text-center text-xs text-muted-ink">Day off</li>
            </ul>
          </div>
        </div>
      </div>
    </UiCard>

    <OpenSlotsDialog v-model:open="openDialog" />
  </div>
</template>
