<script setup lang="ts">
/** Flossy, the tooth. Sticker-style SVG with a few moods and poses. */
withDefaults(
  defineProps<{
    mood?: 'happy' | 'wink' | 'sad' | 'wow';
    pose?: 'idle' | 'wave' | 'floss' | 'cheer';
    animated?: boolean;
    cracked?: boolean;
    label?: string;
  }>(),
  { mood: 'happy', pose: 'idle', animated: true, cracked: false, label: '' },
);

const INK = '#17131f';
const PINK = '#ff8fb1';
const MINT = '#22c7a0';
const BUTTER = '#ffc93c';
const star = 'M0 -10 C2 -2 2 -2 10 0 C2 2 2 2 0 10 C-2 2 -2 2 -10 0 C-2 -2 -2 -2 0 -10 Z';
</script>

<template>
  <svg
    viewBox="0 0 240 240"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    class="overflow-visible"
  >
    <ellipse cx="120" cy="226" rx="60" ry="8" :fill="INK" opacity="0.12" />

    <g :style="animated ? 'animation: bob 3.2s ease-in-out infinite; transform-origin: 120px 200px' : ''">
      <!-- arms behind the body -->
      <g v-if="pose === 'floss'" :style="animated ? 'animation: floss 0.9s ease-in-out infinite' : ''">
        <path d="M52 150 L28 150" :stroke="INK" stroke-width="8" stroke-linecap="round" />
        <path d="M188 150 L212 150" :stroke="INK" stroke-width="8" stroke-linecap="round" />
        <path d="M24 150 Q120 196 216 150" fill="none" :stroke="MINT" stroke-width="5" stroke-linecap="round" />
        <circle cx="24" cy="150" r="9" fill="#fff" :stroke="INK" stroke-width="5" />
        <circle cx="216" cy="150" r="9" fill="#fff" :stroke="INK" stroke-width="5" />
      </g>
      <g v-else-if="pose === 'cheer'">
        <path d="M54 130 L26 92" :stroke="INK" stroke-width="8" stroke-linecap="round" />
        <path d="M186 130 L214 92" :stroke="INK" stroke-width="8" stroke-linecap="round" />
        <circle cx="24" cy="88" r="9" fill="#fff" :stroke="INK" stroke-width="5" />
        <circle cx="216" cy="88" r="9" fill="#fff" :stroke="INK" stroke-width="5" />
      </g>
      <g v-else>
        <path d="M54 146 L32 166" :stroke="INK" stroke-width="8" stroke-linecap="round" />
        <circle cx="29" cy="169" r="9" fill="#fff" :stroke="INK" stroke-width="5" />
        <g
          v-if="pose === 'wave'"
          :style="animated ? 'animation: wave 2.4s ease-in-out infinite; transform-origin: 186px 136px' : ''"
        >
          <path d="M186 136 L212 104" :stroke="INK" stroke-width="8" stroke-linecap="round" />
          <circle cx="215" cy="100" r="9" fill="#fff" :stroke="INK" stroke-width="5" />
        </g>
        <g v-else>
          <path d="M186 146 L208 166" :stroke="INK" stroke-width="8" stroke-linecap="round" />
          <circle cx="211" cy="169" r="9" fill="#fff" :stroke="INK" stroke-width="5" />
        </g>
      </g>

      <!-- body -->
      <path
        d="M120 52 C100 34 58 30 46 66 C38 92 46 118 54 146 C60 170 62 204 78 206 C94 208 96 178 102 162 C107 150 133 150 138 162 C144 178 146 208 162 206 C178 204 180 170 186 146 C194 118 202 92 194 66 C182 30 140 34 120 52 Z"
        fill="#fff"
        :stroke="INK"
        stroke-width="7"
        stroke-linejoin="round"
      />
      <path
        d="M174 58 C190 76 186 108 180 136 C176 158 172 182 166 198 C176 190 178 168 182 148 C190 118 196 92 188 70 C185 64 180 60 174 58 Z"
        fill="#d6f2e9"
      />
      <path d="M66 68 C70 58 80 52 92 54" fill="none" stroke="#d6f2e9" stroke-width="7" stroke-linecap="round" />
      <path
        v-if="cracked"
        d="M120 54 L112 72 L124 82 L114 100"
        fill="none"
        :stroke="INK"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- face -->
      <g :style="animated && mood !== 'sad' ? 'animation: blink 4.5s infinite; transform-origin: 120px 110px' : ''">
        <template v-if="mood === 'sad'">
          <path d="M86 112 Q96 104 106 112" fill="none" :stroke="INK" stroke-width="6" stroke-linecap="round" />
          <path d="M134 112 Q144 104 154 112" fill="none" :stroke="INK" stroke-width="6" stroke-linecap="round" />
          <path d="M150 120 C146 128 146 132 150 134 C154 132 154 128 150 120 Z" fill="#6ea8ff" />
        </template>
        <template v-else>
          <circle cx="96" cy="108" r="11" :fill="INK" />
          <circle cx="99.5" cy="104" r="3.6" fill="#fff" />
          <path
            v-if="mood === 'wink'"
            d="M134 110 Q144 100 154 110"
            fill="none"
            :stroke="INK"
            stroke-width="6"
            stroke-linecap="round"
          />
          <template v-else>
            <circle cx="144" cy="108" r="11" :fill="INK" />
            <circle cx="147.5" cy="104" r="3.6" fill="#fff" />
          </template>
        </template>
      </g>
      <ellipse cx="78" cy="128" rx="10" ry="6" :fill="PINK" opacity="0.75" />
      <ellipse cx="162" cy="128" rx="10" ry="6" :fill="PINK" opacity="0.75" />
      <path
        v-if="mood === 'sad'"
        d="M106 142 Q120 130 134 142"
        fill="none"
        :stroke="INK"
        stroke-width="6"
        stroke-linecap="round"
      />
      <ellipse v-else-if="mood === 'wow'" cx="120" cy="138" rx="8" ry="10" :fill="INK" />
      <g v-else>
        <path
          d="M104 127 Q120 154 136 127 Q120 133 104 127 Z"
          :fill="INK"
          stroke-linejoin="round"
          :stroke="INK"
          stroke-width="3"
        />
        <path d="M113 139 Q120 150 127 139 Q120 135 113 139 Z" :fill="PINK" />
      </g>
    </g>

    <!-- sparkles -->
    <g v-if="pose === 'cheer'" :fill="BUTTER" :stroke="INK" stroke-width="2.5">
      <path :d="star" transform="translate(40 40) scale(1.2)" />
      <path :d="star" transform="translate(204 44)" />
      <path :d="star" transform="translate(222 150) scale(0.8)" :fill="MINT" />
      <path :d="star" transform="translate(16 140) scale(0.7)" :fill="PINK" />
    </g>
  </svg>
</template>
