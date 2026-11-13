<template>
  <div
    class="mind-color-picker-shell"
    data-testid="mind-color-picker"
    @mousedown.stop
  >
    <!-- 2D Saturation / Value Canvas -->
    <div
      ref="svAreaRef"
      class="picker-sv-area"
      data-testid="picker-sv-area"
      :style="{ backgroundColor: `hsl(${hue}, 100%, 50%)` }"
      @mousedown.prevent="startSvDrag"
    >
      <div class="picker-sv-white" />
      <div class="picker-sv-black" />
      <span
        class="picker-sv-cursor"
        :style="{
          left: `${sat * 100}%`,
          top: `${(1 - val) * 100}%`,
          backgroundColor: currentHex,
        }"
      />
    </div>

    <!-- Clean Hue Track -->
    <div
      ref="hueTrackRef"
      class="picker-hue-track"
      data-testid="picker-hue-track"
      @mousedown.prevent="startHueDrag"
    >
      <span
        class="picker-hue-thumb"
        :style="{ left: `${(hue / 360) * 100}%` }"
      />
    </div>

    <!-- Curated Fine Swatches matching Mode -->
    <div class="picker-swatches-row">
      <button
        v-for="swatch in extraSwatches"
        :key="swatch"
        type="button"
        class="picker-mini-swatch"
        :class="{ 'is-selected': currentHex === swatch }"
        :style="{ backgroundColor: swatch }"
        :title="swatch"
        @click="selectHex(swatch)"
      />
    </div>

    <!-- Preview + Hex Input + Apply -->
    <div class="picker-footer-row">
      <span
        class="picker-preview-chip"
        data-testid="picker-preview-chip"
        :style="previewStyle"
      >
        A
      </span>
      <input
        v-model="hexDraft"
        type="text"
        maxlength="7"
        spellcheck="false"
        class="picker-hex-input"
        data-testid="picker-hex-input"
        placeholder="#111827"
        @input="handleHexTyping"
        @keydown.enter.prevent="commitColor"
      />
      <button
        type="button"
        class="picker-apply-btn"
        data-testid="picker-apply-btn"
        @click="commitColor"
      >
        Aplicar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { normalizeHexColor } from '../extensions/block-color.js';

const props = withDefaults(
  defineProps<{
    mode: 'text' | 'bg';
    initialColor?: string | null;
  }>(),
  {
    initialColor: null,
  }
);

const emit = defineEmits<{
  (e: 'apply', hex: string): void;
  (e: 'cancel'): void;
}>();

const EXTRA_TEXT_SWATCHES = [
  '#495057',
  '#0ca678',
  '#1098ad',
  '#1c7ed6',
  '#5f3dc4',
  '#d6336c',
  '#e8590c',
  '#5c940d',
];

const EXTRA_BG_SWATCHES = [
  '#f1f3f5',
  '#e6fcf5',
  '#e3fafc',
  '#e7f5ff',
  '#f3f0ff',
  '#fff0f6',
  '#fff4e6',
  '#f4fce3',
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normalizeHexColor(hex);
  if (!norm) return null;
  const n = parseInt(norm.slice(1), 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  const toByte = (val: number) => Math.round((val + m) * 255).toString(16).padStart(2, '0');
  return `#${toByte(rn)}${toByte(gn)}${toByte(bn)}`;
}

const defaultFallbackHex = computed(() => (props.mode === 'bg' ? '#e7f5ff' : '#1971c2'));
const hue = ref(209);
const sat = ref(props.mode === 'bg' ? 0.1 : 0.87);
const val = ref(props.mode === 'bg' ? 1 : 0.76);
const hexDraft = ref(defaultFallbackHex.value);

function syncFromHex(rawHex: string | null | undefined): void {
  const norm = normalizeHexColor(rawHex) ?? defaultFallbackHex.value;
  hexDraft.value = norm;
  const rgb = hexToRgb(norm);
  if (rgb) {
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    hue.value = hsv.h;
    sat.value = hsv.s;
    val.value = hsv.v;
  }
}

syncFromHex(props.initialColor);

watch(
  () => [props.initialColor, props.mode] as const,
  ([nextHex]) => {
    syncFromHex(nextHex);
  }
);

const currentHex = computed(() => hsvToHex(hue.value, sat.value, val.value));
const extraSwatches = computed(() =>
  props.mode === 'bg' ? EXTRA_BG_SWATCHES : EXTRA_TEXT_SWATCHES
);

const previewStyle = computed(() =>
  props.mode === 'bg'
    ? { backgroundColor: currentHex.value, color: '#111827' }
    : { backgroundColor: '#ffffff', color: currentHex.value }
);

const svAreaRef = ref<HTMLElement | null>(null);
const hueTrackRef = ref<HTMLElement | null>(null);
let activeDrag: 'sv' | 'hue' | null = null;

function updateSvFromClient(clientX: number, clientY: number): void {
  const el = svAreaRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  sat.value = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  val.value = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  hexDraft.value = hsvToHex(hue.value, sat.value, val.value);
}

function updateHueFromClient(clientX: number): void {
  const el = hueTrackRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0) return;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  hue.value = Math.round(ratio * 359);
  hexDraft.value = hsvToHex(hue.value, sat.value, val.value);
}

function onWindowMouseMove(e: MouseEvent): void {
  if (activeDrag === 'sv') updateSvFromClient(e.clientX, e.clientY);
  else if (activeDrag === 'hue') updateHueFromClient(e.clientX);
}

function stopDrag(): void {
  activeDrag = null;
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', stopDrag);
}

function startSvDrag(e: MouseEvent): void {
  activeDrag = 'sv';
  updateSvFromClient(e.clientX, e.clientY);
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', stopDrag);
}

function startHueDrag(e: MouseEvent): void {
  activeDrag = 'hue';
  updateHueFromClient(e.clientX);
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', stopDrag);
}

function selectHex(hex: string): void {
  syncFromHex(hex);
}

function handleHexTyping(): void {
  const candidate = hexDraft.value.startsWith('#') ? hexDraft.value : `#${hexDraft.value}`;
  const norm = normalizeHexColor(candidate);
  if (norm) {
    const rgb = hexToRgb(norm);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      hue.value = hsv.h;
      sat.value = hsv.s;
      val.value = hsv.v;
    }
  }
}

function commitColor(): void {
  const candidate = hexDraft.value.startsWith('#') ? hexDraft.value : `#${hexDraft.value}`;
  const norm = normalizeHexColor(candidate) ?? currentHex.value;
  emit('apply', norm);
}

onBeforeUnmount(() => {
  stopDrag();
});
</script>

<style scoped>
.mind-color-picker-shell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 4px 2px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.picker-sv-area {
  position: relative;
  width: 100%;
  height: 92px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e9ecef;
  cursor: crosshair;
}

.picker-sv-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0));
}

.picker-sv-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000);
}

.picker-sv-cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.35), 0 1px 3px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-sizing: border-box;
}

.picker-hue-track {
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  border: 1px solid #e9ecef;
  background: linear-gradient(
    to right,
    #ff3b30 0%,
    #ff9500 17%,
    #ffcc00 33%,
    #34c759 50%,
    #00c7be 67%,
    #007aff 83%,
    #af52de 92%,
    #ff2d55 100%
  );
  cursor: pointer;
}

.picker-hue-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background-color: #ffffff;
  border: 1px solid #adb5bd;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-sizing: border-box;
}

.picker-swatches-row {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.picker-mini-swatch {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  padding: 0;
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.1s ease;
}

.picker-mini-swatch:hover {
  transform: scale(1.1);
  border-color: #868e96;
}

.picker-mini-swatch.is-selected {
  border-color: #111827;
  box-shadow: 0 0 0 1px #111827;
}

.picker-footer-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.picker-preview-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 1px solid #dee2e6;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.picker-hex-input {
  flex: 1;
  min-width: 0;
  height: 26px;
  padding: 0 7px;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  background-color: #f8f9fa;
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  outline: none;
  box-sizing: border-box;
}

.picker-hex-input:focus {
  background-color: #ffffff;
  border-color: #868e96;
}

.picker-apply-btn {
  height: 26px;
  padding: 0 9px;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  background-color: #111827;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.12s ease;
}

.picker-apply-btn:hover {
  background-color: #37352f;
}
</style>
