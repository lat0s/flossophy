<script setup lang="ts">
import {
  addDays,
  OpenSlotsInput,
  SLOT_MINUTES,
  zonedDate,
  type OpenSlotsResult,
  type Weekday,
} from '@flossophy/shared';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api, ApiFailure } from '@/shared/api/client';
import { useDentistClinics } from '@/shared/api/queries';
import UiButton from '@/shared/ui/UiButton.vue';
import UiDialog from '@/shared/ui/UiDialog.vue';

const open = defineModel<boolean>('open', { default: false });
const qc = useQueryClient();
const { data } = useDentistClinics();

const today = zonedDate(Date.now());
const form = reactive({
  clinicId: '',
  from: addDays(today, 1),
  to: addDays(today, 14),
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'] as Weekday[],
  start: '09:00',
  end: '12:00',
  minutes: 30 as (typeof SLOT_MINUTES)[number],
});
const errors = ref<Record<string, string>>({});
watch(data, (d) => d && !form.clinicId && (form.clinicId = d.clinics[0]?.id ?? ''), { immediate: true });

const DAYS: [Weekday, string][] = [
  ['mon', 'M'],
  ['tue', 'T'],
  ['wed', 'W'],
  ['thu', 'T'],
  ['fri', 'F'],
  ['sat', 'S'],
  ['sun', 'S'],
];
const toggle = (d: Weekday) =>
  (form.weekdays = form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d]);

const submit = useMutation({
  mutationFn: (body: OpenSlotsInput) => api<OpenSlotsResult>('/dentist/slots', { method: 'POST', body }),
  onSuccess: (r) => {
    toast.success(
      `Opened ${r.created} ${r.created === 1 ? 'time' : 'times'}${r.skipped ? `, skipped ${r.skipped} (taken, past or outside hours)` : ''}`,
    );
    qc.invalidateQueries({ queryKey: ['schedule'] });
    open.value = false;
  },
  onError: (e) => {
    if (e instanceof ApiFailure && Object.keys(e.fields).length) errors.value = e.fields;
    else toast.error(e instanceof ApiFailure ? e.message : 'Could not open times');
  },
});

function go() {
  const parsed = OpenSlotsInput.safeParse({ ...form });
  if (!parsed.success) {
    errors.value = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return;
  }
  errors.value = {};
  submit.mutate(parsed.data);
}

const input = 'h-11 w-full rounded-xl border-2 border-edge bg-card px-3 outline-none focus:ring-4 focus:ring-mint/40';
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Open times"
    description="Add bookable times in one go. Times outside opening hours are skipped."
  >
    <form class="grid gap-4" novalidate @submit.prevent="go">
      <label class="grid gap-1.5">
        <span class="text-sm font-bold">Clinic</span>
        <select v-model="form.clinicId" :class="input">
          <option v-for="c in data?.clinics" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="grid gap-1.5"
          ><span class="text-sm font-bold">From</span
          ><input v-model="form.from" type="date" :min="today" :class="input"
        /></label>
        <label class="grid gap-1.5"
          ><span class="text-sm font-bold">To</span
          ><input v-model="form.to" type="date" :min="form.from" :class="input"
        /></label>
      </div>
      <p v-if="errors.to" class="-mt-2 text-sm font-semibold text-danger">{{ errors.to }}</p>
      <fieldset>
        <legend class="mb-1.5 text-sm font-bold">Days</legend>
        <div class="flex gap-1.5">
          <button
            v-for="[k, l] in DAYS"
            :key="k"
            type="button"
            class="brutal-sm grid size-10 place-items-center rounded-xl font-bold"
            :class="form.weekdays.includes(k) ? 'bg-mint text-[#0b2e25]' : 'bg-card text-muted-ink'"
            :aria-pressed="form.weekdays.includes(k)"
            :aria-label="k"
            @click="toggle(k)"
          >
            {{ l }}
          </button>
        </div>
        <p v-if="errors.weekdays" class="mt-1 text-sm font-semibold text-danger">{{ errors.weekdays }}</p>
      </fieldset>
      <div class="grid grid-cols-3 gap-3">
        <label class="grid gap-1.5"
          ><span class="text-sm font-bold">Start</span
          ><input v-model="form.start" type="time" step="900" :class="input"
        /></label>
        <label class="grid gap-1.5"
          ><span class="text-sm font-bold">End</span><input v-model="form.end" type="time" step="900" :class="input"
        /></label>
        <label class="grid gap-1.5">
          <span class="text-sm font-bold">Length</span>
          <select v-model.number="form.minutes" :class="input">
            <option v-for="m in SLOT_MINUTES" :key="m" :value="m">{{ m }} min</option>
          </select>
        </label>
      </div>
      <p v-if="errors.end" class="-mt-2 text-sm font-semibold text-danger">{{ errors.end }}</p>
      <UiButton type="submit" size="lg" :loading="submit.isPending.value">Open times</UiButton>
    </form>
  </UiDialog>
</template>
