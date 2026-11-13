<template>
  <div
    v-if="visible"
    class="mind-block-gutter-shell"
    data-testid="block-gutter-shell"
    :style="{ top: `${top}px` }"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
  >
    <!-- Add Block Below Button (+) -->
    <button
      type="button"
      class="gutter-btn gutter-add-btn"
      title="Adicionar linha abaixo (/)"
      aria-label="Add block below"
      data-testid="block-gutter-add-btn"
      @click="emit('addBlock')"
    >
      <Plus :size="17" :stroke-width="2" />
    </button>

    <!-- Block Grip & Actions Handle (⠿) -->
    <div
      class="gutter-grip-wrapper"
      @mouseenter="isGripHovered = true"
      @mouseleave="isGripHovered = false"
    >
      <button
        type="button"
        class="gutter-btn gutter-grip-btn"
        draggable="true"
        title="Arraste para mover / Clique para menu"
        aria-label="Drag block or open menu"
        data-testid="block-gutter-handle-btn"
        @click="toggleMenu"
        @dragstart="emit('dragStart')"
        @dragend="emit('dragEnd')"
      >
        <GripVertical :size="17" :stroke-width="2" />
      </button>

      <!-- Notion-like Tooltip on Hover -->
      <div
        v-if="isGripHovered && !showMenu"
        class="gutter-tooltip"
        data-testid="gutter-grip-tooltip"
      >
        <div class="tooltip-row"><strong>Arraste</strong> para mover</div>
        <div class="tooltip-row"><strong>Clique</strong> para menu de ações</div>
      </div>
    </div>

    <!-- Actions Popover Menu (Opens to the LEFT of the gutter handle like Notion) -->
    <BlockActionsMenu
      v-if="showMenu"
      :node-type="nodeType"
      :node-text-color="nodeTextColor"
      :node-bg-color="nodeBgColor"
      :basic-blocks-only="basicBlocksOnly"
      :selected-count="selectedCount"
      :last-used-text-color="lastUsedTextColor"
      :last-used-bg-color="lastUsedBgColor"
      @close="closeMenu"
      @action="handleAction"
      @turn-into="handleTurnInto"
      @set-color="handleSetColor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Plus, GripVertical } from 'lucide-vue-next';
import BlockActionsMenu from './gutter/BlockActionsMenu.vue';
import type { BlockColorUpdate } from '../types.js';
import { normalizeBlockColorValue } from '../extensions/block-color.js';
import {
  LAST_BG_COLOR_STORAGE_KEY,
  LAST_TEXT_COLOR_STORAGE_KEY,
  readStoredColor,
  writeStoredColor,
  type GutterActionType,
} from './gutter/gutter-helpers.js';

withDefaults(
  defineProps<{
    visible?: boolean;
    top?: number;
    left?: number;
    nodeType?: string;
    nodeTextColor?: string | null;
    nodeBgColor?: string | null;
    basicBlocksOnly?: boolean;
    selectedCount?: number;
  }>(),
  {
    visible: false,
    top: 0,
    left: 0,
    nodeType: 'paragraph',
    nodeTextColor: null,
    nodeBgColor: null,
    basicBlocksOnly: false,
    selectedCount: 0,
  }
);

const emit = defineEmits<{
  (e: 'addBlock'): void;
  (e: 'dragStart'): void;
  (e: 'dragEnd'): void;
  (e: 'action', action: GutterActionType): void;
  (e: 'turnInto', type: string): void;
  (e: 'setColor', payload: BlockColorUpdate): void;
  (e: 'hover', isHovered: boolean): void;
  (e: 'menuToggle', isOpen: boolean): void;
}>();

const isGripHovered = ref(false);
const showMenu = ref(false);
const lastUsedTextColor = ref<string | null>(readStoredColor(LAST_TEXT_COLOR_STORAGE_KEY));
const lastUsedBgColor = ref<string | null>(readStoredColor(LAST_BG_COLOR_STORAGE_KEY));

function closeMenu() {
  showMenu.value = false;
  emit('menuToggle', false);
}

function toggleMenu() {
  if (showMenu.value) {
    closeMenu();
    return;
  }
  showMenu.value = true;
  emit('menuToggle', true);
}

function handleAction(action: GutterActionType) {
  closeMenu();
  emit('action', action);
}

function handleTurnInto(type: string) {
  closeMenu();
  emit('turnInto', type);
}

function handleSetColor(payload: BlockColorUpdate) {
  if (payload.textColor !== undefined) {
    const normalized = normalizeBlockColorValue(payload.textColor);
    if (normalized) {
      lastUsedTextColor.value = normalized;
      writeStoredColor(LAST_TEXT_COLOR_STORAGE_KEY, normalized);
    }
  }
  if (payload.backgroundColor !== undefined) {
    const normalized = normalizeBlockColorValue(payload.backgroundColor);
    if (normalized) {
      lastUsedBgColor.value = normalized;
      writeStoredColor(LAST_BG_COLOR_STORAGE_KEY, normalized);
    }
  }
  closeMenu();
  emit('setColor', payload);
}

function handleDocumentClick(e: MouseEvent) {
  if (!showMenu.value) return;
  const target = e.target as HTMLElement | null;
  if (target && !target.closest('.mind-block-gutter-shell')) {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick);
});
</script>

<style scoped>
.mind-block-gutter-shell {
  position: absolute;
  left: -66px;
  height: 24px;
  display: flex;
  align-items: center;
  gap: 2px;
  z-index: 50;
  padding-right: 14px;
  margin-right: -14px;
  user-select: none;
}

.gutter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: #868e96;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  padding: 0;
}

.gutter-btn:hover {
  background-color: #f1f3f5;
  color: #212529;
}

.gutter-grip-wrapper {
  position: relative;
}

.gutter-grip-btn {
  cursor: grab;
}

.gutter-grip-btn:active {
  cursor: grabbing;
}

.gutter-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  color: #37352f;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.725rem;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.tooltip-row strong {
  color: #495057;
  font-weight: 600;
}
</style>
