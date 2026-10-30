<script setup lang="ts">
import type { Role } from '@flossophy/shared';
import { CalendarHeart, Stethoscope } from '@lucide/vue';
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { useSession } from '@/app/session';
import { ApiFailure } from '@/shared/api/client';

const emit = defineEmits<{ done: [role: Role] }>();
const session = useSession();
const busy = ref<Role | null>(null);

async function go(as: Role) {
  busy.value = as;
  try {
    await session.demoLogin(as);
    emit('done', as);
  } catch (e) {
    toast.error(e instanceof ApiFailure ? e.message : 'Could not sign in');
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <button
      class="brutal pressable rounded-2xl bg-mint-soft p-4 text-left disabled:opacity-60"
      :disabled="!!busy"
      @click="go('patient')"
    >
      <CalendarHeart class="size-6 text-mint-ink" />
      <p class="mt-2 font-display">Alex</p>
      <p class="text-sm text-muted-ink">Patient. Books and cancels visits.</p>
    </button>
    <button
      class="brutal pressable rounded-2xl bg-butter-soft p-4 text-left disabled:opacity-60"
      :disabled="!!busy"
      @click="go('dentist')"
    >
      <Stethoscope class="size-6" />
      <p class="mt-2 font-display">Dr. Sara</p>
      <p class="text-sm text-muted-ink">Dentist. Runs the schedule.</p>
    </button>
  </div>
</template>
