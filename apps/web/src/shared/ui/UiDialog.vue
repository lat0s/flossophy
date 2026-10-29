<script setup lang="ts">
import { X } from '@lucide/vue';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';

defineProps<{ title: string; description?: string; wide?: boolean }>();
const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[1000] bg-[#17131f]/45 backdrop-blur-[2px]" />
      <DialogContent
        class="brutal-lg fixed inset-x-4 top-[8dvh] z-[1001] mx-auto max-h-[84dvh] overflow-y-auto rounded-3xl bg-card p-5 sm:p-6 data-[state=open]:animate-[pop-in_220ms_cubic-bezier(0.2,0.9,0.3,1.3)]"
        :class="wide ? 'max-w-2xl' : 'max-w-md'"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogTitle class="font-display text-xl">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-muted-ink">{{ description }}</DialogDescription>
          </div>
          <DialogClose
            class="brutal-sm pressable grid size-9 shrink-0 place-items-center rounded-xl bg-card"
            aria-label="Close"
          >
            <X class="size-4" />
          </DialogClose>
        </div>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
