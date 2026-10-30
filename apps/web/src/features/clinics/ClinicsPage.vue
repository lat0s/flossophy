<script setup lang="ts">
import { LocateFixed, Search, X } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useClinics } from '@/shared/api/queries';
import EmptyState from '@/shared/ui/EmptyState.vue';
import UiButton from '@/shared/ui/UiButton.vue';
import UiSpinner from '@/shared/ui/UiSpinner.vue';
import ClinicCard from './ClinicCard.vue';
import ClinicMap from './ClinicMap.vue';

const route = useRoute();
const router = useRouter();
const text = ref(String(route.query.q ?? ''));
const q = ref(text.value);
const me = ref<[number, number] | null>(null);
const locating = ref(false);
const active = ref<string>();

let timer: ReturnType<typeof setTimeout>;
watch(text, (v) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    q.value = v.trim();
    router.replace({ query: q.value ? { q: q.value } : {} });
  }, 250);
});

const near = computed(() => (me.value ? me.value.map((n) => n.toFixed(4)).join(',') : ''));
const { data, isPending, isError, refetch } = useClinics(q, near);
const clinics = computed(() => data.value?.clinics ?? []);

function locate() {
  if (me.value) return (me.value = null);
  if (!navigator.geolocation) return toast.error('Your browser cannot share a location');
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (p) => {
      me.value = [p.coords.latitude, p.coords.longitude];
      locating.value = false;
    },
    () => {
      locating.value = false;
      toast.error('No location. Showing all clinics instead.');
    },
    { timeout: 8000, maximumAge: 300_000 },
  );
}

function select(slug: string) {
  active.value = slug;
  document.querySelector(`[data-slug="${slug}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="text-3xl sm:text-4xl">Find a clinic</h1>
    <p class="mt-1 text-muted-ink">Sorted by the soonest open time. Share your location to sort by distance.</p>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <label
        class="brutal-sm flex h-12 flex-1 items-center gap-2 rounded-xl bg-card px-3 focus-within:ring-4 focus-within:ring-mint/40"
      >
        <Search class="size-5 text-muted-ink" />
        <span class="sr-only">Search clinics</span>
        <input
          v-model="text"
          type="search"
          placeholder="Name, area or treatment, e.g. Haga or kids"
          class="h-full flex-1 bg-transparent outline-none placeholder:text-muted-ink"
          maxlength="60"
        />
        <button v-if="text" aria-label="Clear search" class="rounded-lg p-1 hover:bg-muted" @click="text = ''">
          <X class="size-4" />
        </button>
      </label>
      <UiButton :variant="me ? 'butter' : 'secondary'" size="lg" class="!h-12" :loading="locating" @click="locate">
        <LocateFixed class="size-5" /> {{ me ? 'Near me: on' : 'Near me' }}
      </UiButton>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div class="order-2 lg:order-1">
        <UiSpinner v-if="isPending" label="Finding clinics…" />
        <EmptyState v-else-if="isError" title="The clinics are hiding" mood="sad">
          Something went wrong loading them.
          <template #actions><UiButton @click="refetch()">Try again</UiButton></template>
        </EmptyState>
        <EmptyState v-else-if="!clinics.length" title="No clinics match" mood="wow">
          Try a shorter word, like an area name.
          <template #actions><UiButton variant="secondary" @click="text = ''">Show all clinics</UiButton></template>
        </EmptyState>
        <ul v-else class="grid gap-4" aria-label="Clinics">
          <li v-for="c in clinics" :key="c.id" @mouseenter="active = c.slug" @focusin="active = c.slug">
            <ClinicCard :clinic="c" :active="active === c.slug" />
          </li>
        </ul>
      </div>
      <div
        class="brutal order-1 h-64 overflow-hidden rounded-2xl sm:h-80 lg:sticky lg:top-24 lg:order-2 lg:h-[calc(100dvh-8rem)]"
      >
        <ClinicMap :clinics="clinics" :active="active" :me="me" @select="select" />
      </div>
    </div>
  </div>
</template>
