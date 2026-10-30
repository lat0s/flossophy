<script setup lang="ts">
import type { Appointment } from '@flossophy/shared';
import { Clock, MapPin } from '@lucide/vue';
import { dayLong, relative, time } from '@/shared/format';
import Avatar from '@/shared/ui/Avatar.vue';
import UiBadge from '@/shared/ui/UiBadge.vue';
import UiButton from '@/shared/ui/UiButton.vue';

defineProps<{ appt: Appointment; past?: boolean }>();
const emit = defineEmits<{ cancel: [appt: Appointment] }>();
</script>

<template>
  <article
    class="brutal flex flex-col gap-4 rounded-2xl bg-card p-4 sm:flex-row sm:items-center"
    :class="past && 'opacity-75'"
  >
    <div
      class="brutal-sm grid w-20 shrink-0 place-items-center rounded-xl py-2 text-center"
      :class="past ? 'bg-muted' : 'bg-mint-soft'"
    >
      <span class="num font-display text-xl leading-none">{{ time(appt.startsAt) }}</span>
      <span class="mt-1 text-xs font-bold text-muted-ink">{{ appt.minutes }} min</span>
    </div>
    <div class="min-w-0 flex-1">
      <p class="font-display">{{ dayLong(appt.startsAt) }}</p>
      <p class="mt-1 flex items-center gap-2 text-sm">
        <Avatar :name="appt.dentist.name" :color="appt.dentist.avatar" size="sm" /> {{ appt.dentist.name }}
        <span class="text-muted-ink">· {{ appt.dentist.title }}</span>
      </p>
      <p class="mt-1 flex items-center gap-1 text-sm text-muted-ink">
        <MapPin class="size-3.5" />
        <span
          ><RouterLink :to="`/clinics/${appt.clinic.slug}`" class="font-semibold hover:text-ink">{{
            appt.clinic.name
          }}</RouterLink
          >, {{ appt.clinic.address }}</span
        >
      </p>
      <p v-if="appt.reason" class="mt-2 text-sm">“{{ appt.reason }}”</p>
    </div>
    <div v-if="!past" class="flex flex-col items-start gap-2 sm:items-end">
      <UiBadge tone="butter"><Clock class="size-3" /> {{ relative(appt.startsAt) }}</UiBadge>
      <UiButton v-if="appt.canCancel" variant="secondary" size="sm" @click="emit('cancel', appt)">Cancel</UiButton>
      <p v-else class="max-w-40 text-xs text-muted-ink sm:text-right">
        Less than 24 h away. Call the clinic to change it.
      </p>
    </div>
  </article>
</template>
