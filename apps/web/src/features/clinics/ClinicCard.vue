<script setup lang="ts">
import type { ClinicSummary } from '@flossophy/shared';
import { Clock, MapPin, Navigation } from '@lucide/vue';
import { soonest } from '@/shared/format';
import UiBadge from '@/shared/ui/UiBadge.vue';

defineProps<{ clinic: ClinicSummary; active?: boolean }>();
</script>

<template>
  <RouterLink
    :to="`/clinics/${clinic.slug}`"
    class="brutal pressable block rounded-2xl bg-card p-4"
    :class="active && 'ring-4 ring-mint/50'"
    :data-slug="clinic.slug"
  >
    <div class="flex items-start gap-3">
      <span
        class="brutal-sm mt-0.5 size-10 shrink-0 rounded-xl"
        :style="{ background: clinic.color }"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="truncate text-[17px]">{{ clinic.name }}</h3>
          <span
            v-if="clinic.distanceKm !== undefined"
            class="num flex shrink-0 items-center gap-1 text-sm font-bold text-muted-ink"
          >
            <Navigation class="size-3.5" /> {{ clinic.distanceKm.toFixed(1) }} km
          </span>
        </div>
        <p class="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-ink">
          <MapPin class="size-3.5 shrink-0" /> {{ clinic.area }} · {{ clinic.address }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UiBadge v-if="clinic.nextOpenSlot" tone="mint"
            ><Clock class="size-3" /> {{ soonest(clinic.nextOpenSlot) }}</UiBadge
          >
          <UiBadge v-else tone="pink">Fully booked this fortnight</UiBadge>
          <UiBadge v-for="t in clinic.tags.slice(0, 2)" :key="t">{{ t }}</UiBadge>
        </div>
      </div>
    </div>
  </RouterLink>
</template>
