<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  label: string;
  error?: string;
  hint?: string;
  type?: string;
  autocomplete?: string;
  placeholder?: string;
  maxlength?: number;
}>();
const model = defineModel<string>({ default: '' });
const id = useId();
</script>

<template>
  <div class="grid gap-1.5">
    <label :for="id" class="text-sm font-bold">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :aria-invalid="!!error || undefined"
      :aria-describedby="error || hint ? `${id}-msg` : undefined"
      class="h-11 rounded-xl border-2 border-edge bg-card px-3 text-[15px] shadow-[inset_0_2px_0_0_rgba(0,0,0,0.04)] outline-none placeholder:text-muted-ink focus:ring-4 focus:ring-mint/40 aria-invalid:border-danger"
    />
    <p
      v-if="error || hint"
      :id="`${id}-msg`"
      class="text-sm"
      :class="error ? 'font-semibold text-danger' : 'text-muted-ink'"
    >
      {{ error || hint }}
    </p>
  </div>
</template>
