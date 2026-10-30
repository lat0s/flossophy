<script setup lang="ts">
import type { ClinicSummary } from '@flossophy/shared';
import L from 'leaflet';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ clinics: ClinicSummary[]; active?: string; me?: [number, number] | null }>();
const emit = defineEmits<{ select: [slug: string] }>();

const el = ref<HTMLElement>();
let map: L.Map | undefined;
const layer = L.layerGroup();
let meMarker: L.CircleMarker | undefined;

// Gothenburg centre, used before clinics load.
const HOME: L.LatLngTuple = [57.7029, 11.9668];

const pin = (c: ClinicSummary, active: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    html: `<div class="fl-pin${active ? ' is-active' : ''}" style="--pin:${c.color}"><span></span></div>`,
  });

function draw() {
  if (!map) return;
  layer.clearLayers();
  for (const c of props.clinics) {
    L.marker([c.lat, c.lng], {
      icon: pin(c, c.slug === props.active),
      title: c.name,
      keyboard: true,
      riseOnHover: true,
    })
      .on('click', () => emit('select', c.slug))
      .addTo(layer);
  }
  if (props.clinics.length) {
    const b = L.latLngBounds(props.clinics.map((c) => [c.lat, c.lng]));
    if (props.me) b.extend(props.me);
    map.fitBounds(b, { padding: [36, 36], maxZoom: 15 });
  }
}

onMounted(() => {
  map = L.map(el.value!, { center: HOME, zoom: 12, scrollWheelZoom: false, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  layer.addTo(map);
  draw();
});

watch(() => props.clinics, draw);
watch(
  () => props.active,
  () => {
    draw();
    const c = props.clinics.find((x) => x.slug === props.active);
    if (c && map) map.panTo([c.lat, c.lng]);
  },
);
watch(
  () => props.me,
  (me) => {
    meMarker?.remove();
    if (me && map)
      meMarker = L.circleMarker(me, {
        radius: 9,
        color: '#17131f',
        weight: 3,
        fillColor: '#6ea8ff',
        fillOpacity: 1,
      }).addTo(map);
  },
);

onBeforeUnmount(() => map?.remove());
</script>

<template>
  <div ref="el" class="size-full" role="region" aria-label="Map of clinics" />
</template>

<style>
.fl-pin {
  width: 34px;
  height: 34px;
  border: 3px solid #17131f;
  border-radius: 50% 50% 50% 4px;
  transform: rotate(-45deg);
  background: var(--pin);
  box-shadow: 3px 3px 0 #17131f;
  display: grid;
  place-items: center;
  transition: transform 140ms cubic-bezier(0.2, 0.9, 0.3, 1.4);
}
.fl-pin span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #17131f;
}
.fl-pin.is-active {
  transform: rotate(-45deg) scale(1.25);
}
.dark .fl-pin {
  filter: invert(1) hue-rotate(180deg) brightness(1.15);
}
</style>
