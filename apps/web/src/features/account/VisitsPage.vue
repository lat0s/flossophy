<script setup lang="ts">
import { MAX_UPCOMING, type Appointment } from '@flossophy/shared';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { useSession } from '@/app/session';
import { api, ApiFailure } from '@/shared/api/client';
import { keys, useAppointments } from '@/shared/api/queries';
import { dateTime } from '@/shared/format';
import EmptyState from '@/shared/ui/EmptyState.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import UiDialog from '@/shared/ui/UiDialog.vue';
import UiSpinner from '@/shared/ui/UiSpinner.vue';
import AppointmentCard from './AppointmentCard.vue';

const session = useSession();
const qc = useQueryClient();
const { data, isPending, isError, refetch } = useAppointments();
const target = ref<Appointment | null>(null);
const confirm = ref(false);

function ask(a: Appointment) {
  target.value = a;
  confirm.value = true;
}

const cancel = useMutation({
  mutationFn: (id: string) => api(`/me/appointments/${id}`, { method: 'DELETE' }),
  onSuccess: () => {
    toast('Visit cancelled. The time is open for someone else.');
    confirm.value = false;
  },
  onError: (e) => toast.error(e instanceof ApiFailure ? e.message : 'Could not cancel'),
  onSettled: () => {
    qc.invalidateQueries({ queryKey: keys.appointments });
    qc.invalidateQueries({ queryKey: ['slots'] });
  },
});
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <h1 class="text-3xl sm:text-4xl">My visits</h1>
    <p class="mt-1 text-muted-ink">
      Hi {{ session.me?.name.split(' ')[0] }}. You can hold up to {{ MAX_UPCOMING }} upcoming visits.
    </p>

    <UiSpinner v-if="isPending" />
    <EmptyState v-else-if="isError" title="Could not load your visits" mood="sad">
      <template #actions><UiButton @click="refetch()">Try again</UiButton></template>
    </EmptyState>
    <template v-else-if="data">
      <section class="mt-8" aria-labelledby="up">
        <h2 id="up" class="mb-4 text-xl">Upcoming</h2>
        <EmptyState v-if="!data.upcoming.length" title="Nothing booked" pose="wave">
          Your teeth miss the attention.
          <template #actions><UiButton to="/clinics">Find a time</UiButton></template>
        </EmptyState>
        <TransitionGroup v-else tag="ul" name="list" class="grid gap-4">
          <li v-for="a in data.upcoming" :key="a.id"><AppointmentCard :appt="a" @cancel="ask" /></li>
        </TransitionGroup>
      </section>
      <section v-if="data.past.length" class="mt-10" aria-labelledby="past">
        <h2 id="past" class="mb-4 text-xl">Past</h2>
        <ul class="grid gap-4">
          <li v-for="a in data.past" :key="a.id"><AppointmentCard :appt="a" past /></li>
        </ul>
      </section>
    </template>

    <UiDialog
      v-model:open="confirm"
      title="Cancel this visit?"
      :description="target ? `${dateTime(target.startsAt)} with ${target.dentist.name}` : ''"
    >
      <p class="text-muted-ink">The time goes back on the board for someone else. You can book a new one any time.</p>
      <div class="mt-5 flex flex-wrap justify-end gap-3">
        <UiButton variant="secondary" @click="confirm = false">Keep it</UiButton>
        <UiButton variant="danger" :loading="cancel.isPending.value" @click="target && cancel.mutate(target.id)"
          >Yes, cancel</UiButton
        >
      </div>
    </UiDialog>
  </div>
</template>

<style scoped>
.list-leave-active {
  transition: all 220ms ease;
}
.list-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
