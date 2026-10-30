<script setup lang="ts">
import type { Appointment, ClinicDetail, PublicSlot } from '@flossophy/shared';
import { CalendarCheck, Clock, Stethoscope } from '@lucide/vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useDemo } from '@/app/demo';
import { useSession } from '@/app/session';
import { api, ApiFailure } from '@/shared/api/client';
import { keys } from '@/shared/api/queries';
import { celebrate } from '@/shared/confetti';
import { dayLong, time } from '@/shared/format';
import Flossy from '@/shared/mascot/Flossy.vue';
import Avatar from '@/shared/ui/Avatar.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import UiDialog from '@/shared/ui/UiDialog.vue';

const props = defineProps<{ clinic: ClinicDetail; slot: PublicSlot | null }>();
const open = defineModel<boolean>('open', { default: false });

const session = useSession();
const demo = useDemo();
const router = useRouter();
const qc = useQueryClient();
const reason = ref('');
const done = ref<Appointment | null>(null);
watch(open, (o) => {
  if (o) {
    done.value = null;
    reason.value = '';
  }
});

const dentist = computed(() => props.clinic.dentists.find((d) => d.id === props.slot?.dentistId));

const book = useMutation({
  mutationFn: () =>
    api<{ appointment: Appointment }>(`/slots/${props.slot!.id}/book`, {
      method: 'POST',
      body: { reason: reason.value.trim() || undefined },
    }),
  onSuccess: ({ appointment }) => {
    done.value = appointment;
    celebrate();
    qc.invalidateQueries({ queryKey: ['slots'] });
    qc.invalidateQueries({ queryKey: keys.appointments });
    qc.invalidateQueries({ queryKey: ['clinics'] });
  },
  onError: (e) => {
    toast.error(e instanceof ApiFailure ? e.message : 'Booking failed');
    if (e instanceof ApiFailure && e.code === 'conflict') {
      open.value = false;
      qc.invalidateQueries({ queryKey: ['slots'] });
    }
  },
});

async function asAlex() {
  await session.demoLogin('patient');
  toast.success('Signed in as Alex, the demo patient');
}
</script>

<template>
  <UiDialog v-model:open="open" :title="done ? 'You are booked in!' : 'Book this time'">
    <div v-if="done" class="text-center">
      <Flossy pose="cheer" mood="happy" class="mx-auto size-36" label="Flossy cheering" />
      <p class="mt-2 font-bold">{{ dayLong(done.startsAt) }} at {{ time(done.startsAt) }}</p>
      <p class="text-muted-ink">with {{ done.dentist.name }} at {{ done.clinic.name }}</p>
      <p class="mt-3 text-sm text-muted-ink">
        A confirmation is on its way{{ demo.personas ? ' (see the Outbox)' : '' }}. You can cancel up to 24 h before.
      </p>
      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <UiButton to="/visits">See my visits</UiButton>
        <UiButton variant="secondary" @click="open = false">Book another</UiButton>
      </div>
    </div>

    <template v-else-if="slot">
      <div class="grid gap-3 rounded-2xl border-2 border-edge bg-muted p-4">
        <p class="flex items-center gap-2 font-bold">
          <CalendarCheck class="size-5 text-mint" /> {{ dayLong(slot.startsAt) }}
        </p>
        <p class="flex items-center gap-2">
          <Clock class="size-5 text-muted-ink" /> {{ time(slot.startsAt) }} · {{ slot.minutes }} min
        </p>
        <p v-if="dentist" class="flex items-center gap-2">
          <Avatar :name="dentist.name" :color="dentist.avatar" size="sm" /> {{ dentist.name }}
          <span class="text-muted-ink">· {{ dentist.title }}</span>
        </p>
      </div>

      <form v-if="session.isPatient" class="mt-4 grid gap-4" @submit.prevent="book.mutate()">
        <div class="grid gap-1.5">
          <label for="reason" class="text-sm font-bold"
            >What is it about? <span class="font-normal text-muted-ink">(optional)</span></label
          >
          <textarea
            id="reason"
            v-model="reason"
            maxlength="200"
            rows="3"
            placeholder="Check-up, a sore tooth, a chipped smile…"
            class="rounded-xl border-2 border-edge bg-card p-3 outline-none placeholder:text-muted-ink focus:ring-4 focus:ring-mint/40"
          />
          <p class="num text-right text-xs text-muted-ink">{{ reason.length }}/200</p>
        </div>
        <UiButton type="submit" size="lg" :loading="book.isPending.value">Confirm booking</UiButton>
      </form>

      <div v-else-if="session.isDentist" class="mt-4 flex gap-3 rounded-2xl border-2 border-edge bg-butter-soft p-4">
        <Stethoscope class="size-5 shrink-0" />
        <p>You are signed in as a dentist. Sign in as a patient to book.</p>
      </div>

      <div v-else class="mt-4 grid gap-3">
        <p class="text-muted-ink">Sign in to book this time.</p>
        <UiButton v-if="demo.personas" size="lg" @click="asAlex">Continue as Alex (demo patient)</UiButton>
        <div class="grid grid-cols-2 gap-3">
          <UiButton variant="secondary" @click="router.push({ path: '/login', query: { next: $route.fullPath } })"
            >Sign in</UiButton
          >
          <UiButton variant="secondary" @click="router.push({ path: '/register', query: { next: $route.fullPath } })"
            >Create account</UiButton
          >
        </div>
      </div>
    </template>
  </UiDialog>
</template>
