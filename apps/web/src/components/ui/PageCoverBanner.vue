<template>
  <div
    v-if="hasCover"
    ref="bannerRef"
    class="page-cover-banner"
    :class="{
      'is-repositioning': isRepositioning,
      'is-image': visual.kind === 'image',
    }"
    :style="bannerStyle"
    data-testid="page-cover-banner"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <!-- Repositioning helper banner -->
    <div
      v-if="isRepositioning"
      class="cover-reposition-overlay"
      data-testid="cover-reposition-bar"
    >
      <span class="cover-reposition-hint">Arraste para reposicionar ({{ draftY }}%)</span>
      <input
        v-model.number="draftY"
        type="range"
        min="0"
        max="100"
        class="cover-y-slider"
        aria-label="Posição vertical da capa"
        data-testid="cover-y-slider"
      />
      <button
        type="button"
        class="cover-action-btn primary"
        data-testid="cover-save-position-btn"
        @click.stop="savePosition"
      >
        Salvar posição
      </button>
      <button
        type="button"
        class="cover-action-btn"
        data-testid="cover-cancel-position-btn"
        @click.stop="cancelReposition"
      >
        Cancelar
      </button>
    </div>

    <!-- Hover controls when not read-only -->
    <div
      v-else-if="!readOnly"
      class="cover-hover-controls"
      :class="{ 'is-open': isPickerOpen }"
      data-testid="cover-hover-controls"
    >
      <button
        type="button"
        class="cover-action-btn"
        data-testid="cover-change-btn"
        @click.stop="isPickerOpen = !isPickerOpen"
      >
        <ImageIcon :size="13" :stroke-width="1.75" />
        <span>Alterar capa</span>
      </button>

      <button
        v-if="visual.kind === 'image'"
        type="button"
        class="cover-action-btn"
        data-testid="cover-reposition-btn"
        @click.stop="startReposition"
      >
        <MoveVertical :size="13" :stroke-width="1.75" />
        <span>Reposicionar</span>
      </button>

      <button
        type="button"
        class="cover-action-btn danger"
        data-testid="cover-remove-btn"
        @click.stop="handleRemove"
      >
        <X :size="13" :stroke-width="1.75" />
        <span>Remover</span>
      </button>
    </div>

    <!-- Lightweight Mind Light Cover Picker Popover -->
    <div
      v-if="isPickerOpen && !readOnly"
      class="cover-picker-popover"
      data-testid="cover-picker-popover"
      @click.stop
    >
      <div class="cover-picker-header">
        <span class="cover-picker-title">Galeria de Capas</span>
        <button
          type="button"
          class="cover-picker-close"
          aria-label="Fechar galeria"
          @click="isPickerOpen = false"
        >
          <X :size="14" />
        </button>
      </div>

      <div class="cover-presets-grid">
        <button
          v-for="preset in MIND_COVER_PRESETS"
          :key="preset.id"
          type="button"
          class="cover-preset-swatch"
          :class="{ active: coverUrl === preset.id }"
          :style="{ background: preset.background }"
          :title="preset.label"
          :data-testid="`cover-preset-${preset.id}`"
          @click="selectPreset(preset.id)"
        >
          <span class="cover-preset-label">{{ preset.label }}</span>
        </button>
      </div>

      <div class="cover-picker-footer">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          class="cover-hidden-input"
          data-testid="cover-file-input"
          @change="handleFileSelected"
        />
        <button
          type="button"
          class="cover-upload-btn"
          :disabled="uploading"
          data-testid="cover-upload-btn"
          @click="fileInputRef?.click()"
        >
          <Upload :size="13" :stroke-width="1.75" />
          <span>{{ uploading ? 'Enviando imagem...' : 'Enviar imagem do computador' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue';
import { Image as ImageIcon, MoveVertical, Upload, X } from 'lucide-vue-next';
import { MIND_COVER_PRESETS, resolveCoverVisual } from '../../utils/asset-url.js';

const props = withDefaults(
  defineProps<{
    coverUrl?: string | null;
    coverYPosition?: number;
    readOnly?: boolean;
    uploading?: boolean;
  }>(),
  {
    coverUrl: '',
    coverYPosition: 50,
    readOnly: false,
    uploading: false,
  },
);

const emit = defineEmits<{
  'update:coverUrl': [value: string];
  'update:coverYPosition': [value: number];
  'upload-file': [file: File];
  remove: [];
}>();

const bannerRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isPickerOpen = ref(false);
const isRepositioning = ref(false);
const draftY = ref(props.coverYPosition ?? 50);

let isDragging = false;
let dragStartY = 0;
let dragInitialPosY = 50;

watch(
  () => props.coverYPosition,
  (nextVal) => {
    if (!isRepositioning.value) {
      draftY.value = nextVal ?? 50;
    }
  },
);

const visual = computed(() => resolveCoverVisual(props.coverUrl));
const hasCover = computed(() => visual.value.kind !== 'none');

const bannerStyle = computed<CSSProperties>(() => {
  if (visual.value.kind === 'css') {
    return { background: visual.value.value };
  }
  if (visual.value.kind === 'image') {
    const pos = isRepositioning.value ? draftY.value : (props.coverYPosition ?? 50);
    return {
      backgroundImage: `url("${visual.value.value}")`,
      backgroundPosition: `center ${pos}%`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    };
  }
  return {};
});

function selectPreset(presetId: string): void {
  emit('update:coverUrl', presetId);
  isPickerOpen.value = false;
}

function handleFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  emit('upload-file', file);
  input.value = '';
  isPickerOpen.value = false;
}

function startReposition(): void {
  isPickerOpen.value = false;
  draftY.value = props.coverYPosition ?? 50;
  isRepositioning.value = true;
}

function cancelReposition(): void {
  draftY.value = props.coverYPosition ?? 50;
  isRepositioning.value = false;
  isDragging = false;
}

function savePosition(): void {
  emit('update:coverYPosition', Math.min(100, Math.max(0, Math.round(draftY.value))));
  isRepositioning.value = false;
  isDragging = false;
}

function handleRemove(): void {
  isPickerOpen.value = false;
  isRepositioning.value = false;
  emit('remove');
}

function handlePointerDown(event: PointerEvent): void {
  if (!isRepositioning.value || visual.value.kind !== 'image') return;
  isDragging = true;
  dragStartY = event.clientY;
  dragInitialPosY = draftY.value;
}

function handlePointerMove(event: PointerEvent): void {
  if (!isDragging || !isRepositioning.value) return;
  const deltaY = event.clientY - dragStartY;
  // Moving mouse down reveals upper portion -> decrease background-position Y%
  const nextY = dragInitialPosY - deltaY * 0.45;
  draftY.value = Math.min(100, Math.max(0, Math.round(nextY)));
}

function handlePointerUp(): void {
  isDragging = false;
}

function openPicker(): void {
  isPickerOpen.value = true;
}

defineExpose({ openPicker });
</script>

<style scoped>
.page-cover-banner {
  position: relative;
  width: 100%;
  height: 176px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  background-color: #f8f9fa;
  transition: background-color 0.15s ease;
  user-select: none;
}

.page-cover-banner.is-repositioning {
  cursor: ns-resize;
}

.cover-hover-controls {
  position: absolute;
  top: 12px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.page-cover-banner:hover .cover-hover-controls,
.page-cover-banner:focus-within .cover-hover-controls,
.cover-hover-controls.is-open {
  opacity: 1;
}

.cover-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid rgba(222, 226, 230, 0.9);
  background: rgba(255, 255, 255, 0.92);
  color: #343a40;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(6px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.cover-action-btn:hover {
  background: #ffffff;
  border-color: #ced4da;
  color: #212529;
}

.cover-action-btn.primary {
  background: #1971c2;
  border-color: #1971c2;
  color: #ffffff;
}

.cover-action-btn.primary:hover {
  background: #1864ab;
}

.cover-action-btn.danger:hover {
  color: #c92a2a;
  border-color: #ffc9c9;
  background: #fff5f5;
}

.cover-reposition-overlay {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #dee2e6;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.cover-reposition-hint {
  font-size: 12px;
  font-weight: 500;
  color: #495057;
  white-space: nowrap;
}

.cover-y-slider {
  width: 90px;
  accent-color: #1971c2;
}

.cover-picker-popover {
  position: absolute;
  top: 46px;
  right: 16px;
  z-index: 40;
  width: 310px;
  padding: 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.cover-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cover-picker-title {
  font-size: 12.5px;
  font-weight: 600;
  color: #212529;
}

.cover-picker-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #868e96;
  cursor: pointer;
}

.cover-picker-close:hover {
  background: #f1f3f5;
  color: #212529;
}

.cover-presets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.cover-preset-swatch {
  position: relative;
  height: 44px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  padding: 4px 6px;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.cover-preset-swatch:hover {
  transform: translateY(-1px);
  border-color: #adb5bd;
}

.cover-preset-swatch.active {
  border: 2px solid #1971c2;
}

.cover-preset-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #343a40;
  background: rgba(255, 255, 255, 0.78);
  padding: 1px 5px;
  border-radius: 4px;
}

.cover-picker-footer {
  border-top: 1px solid #f1f3f5;
  padding-top: 10px;
}

.cover-hidden-input {
  display: none;
}

.cover-upload-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  color: #343a40;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.cover-upload-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.cover-upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
