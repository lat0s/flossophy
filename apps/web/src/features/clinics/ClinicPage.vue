<script setup lang="ts">
import { zonedDate, type PublicSlot, type Weekday } from '@flossophy/shared';
import { ArrowLeft, MapPin, Phone } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { useClinic, useSlots } from '@/shared/api/queries';
import { ApiFailure } from '@/shared/api/client';
import Avatar from '@/shared/ui/Avatar.vue';
import EmptyState from '@/shared/ui/EmptyState.vue';
import UiBadge from '@/shared/ui/UiBadge.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import UiCard from '@/shared/ui/UiCard.vue';
import UiSpinner from '@/shared/ui/UiSpinner.vue';
import BookDialog from './BookDialog.vue';
import SlotPicker from './SlotPicker.vue';

const props = defineProps<{ slug: string }>();
const { data: clinic, isPending, error } = useClinic(() => props.slug);
watch(clinic, (c) => c && (document.title = `${c.name} · Flossophy`));

const from = ref(zonedDate(Date.now()));
const dentistId = ref<string>('all');
const { data: slotData, isFetching } = useSlots(() => clinic.value?.id, from);
const slots = computed(() =>
  (slotData.value?.slots ?? []).filter((s) => dentistId.value === 'all' || s.dentistId === dentistId.value),
);

const picked = ref<PublicSlot | null>(null);
const dialog = ref(false);
function pick(s: PublicSlot) {
  picked.value = s;
  dialog.value = true;
}

const DAYS: [Weekday, string][] = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
];
const chip = (on: boolean) =>
  `brutal-sm pressable flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-bold ${on ? 'bg-ink text-paper' : 'bg-card'}`;
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <RouterLink to="/clinics" class="mb-5 inline-flex items-center gap-1 font-bold text-muted-ink hover:text-ink"
      ><ArrowLeft class="size-4" /> All clinics</RouterLink
    >

    <UiSpinner v-if="isPending" label="Opening the clinic…" />
    <EmptyState
      v-else-if="error"
      :title="
        error instanceof ApiFailure && error.status === 404 ? 'No clinic by that name' : 'Could not load the clinic'
      "
      mood="sad"
    >
      <template #actions><UiButton to="/clinics">Back to clinics</UiButton></template>
    </EmptyState>

    <div v-else-if="clinic" class="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside class="grid min-w-0 content-start gap-5">
        <UiCard class="overflow-hidden">
          <div class="h-20 border-b-2 border-edge" :style="{ background: clinic.color }" />
          <div class="p-5">
            <h1 class="text-2xl leading-tight">{{ clinic.name }}</h1>
            <p class="mt-2 flex gap-2 text-muted-ink">
              <MapPin class="mt-0.5 size-4 shrink-0" /> {{ clinic.address }}, {{ clinic.area }}
            </p>
            <p class="mt-1 flex gap-2 text-muted-ink"><Phone class="mt-0.5 size-4 shrink-0" /> {{ clinic.phone }}</p>
            <p class="mt-4">{{ clinic.about }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <UiBadge v-for="t in clinic.tags" :key="t">{{ t }}</UiBadge>
            </div>
          </div>
        </UiCard>
        <UiCard class="p-5">
          <h2 class="text-lg">Opening hours</h2>
          <dl class="num mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <template v-for="[k, label] in DAYS" :key="k">
              <dt class="font-bold">{{ label }}</dt>
              <dd :class="!clinic.openingHours[k] && 'text-muted-ink'">
                {{
                  clinic.openingHours[k] ? `${clinic.openingHours[k].open}–${clinic.openingHours[k].close}` : 'Closed'
                }}
              </dd>
            </template>
          </dl>
        </UiCard>
      </aside>

      <div class="grid min-w-0 content-start gap-5">
        <UiCard class="p-5">
          <h2 class="text-lg">Dentists</h2>
          <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by dentist">
            <button
              :class="chip(dentistId === 'all')"
              class="!pl-3"
              :aria-pressed="dentistId === 'all'"
              @click="dentistId = 'all'"
            >
              Anyone
            </button>
            <button
              v-for="d in clinic.dentists"
              :key="d.id"
              :class="chip(dentistId === d.id)"
              :aria-pressed="dentistId === d.id"
              :title="d.bio"
              @click="dentistId = d.id"
            >
              <Avatar :name="d.name" :color="d.avatar" size="sm" /> {{ d.name }}
            </button>
          </div>
        </UiCard>
        <UiCard class="p-5">
          <SlotPicker :slots="slots" :from="from" :loading="isFetching" @week="from = $event" @pick="pick" />
        </UiCard>
      </div>

      <BookDialog v-model:open="dialog" :clinic="clinic" :slot="picked" />
    </div>
  </div>
</template>
