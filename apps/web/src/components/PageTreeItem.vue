<template>
  <div class="tree-node-wrapper">
    <div
      ref="rowRef"
      class="tree-node-row"
      :class="{
        'tree-node-active': activePageId === node.id,
        'has-children': node.children.length > 0,
        'is-renaming': isRenaming,
        'is-dragging': draggingId === node.id,
        'drop-before': dropZone === 'before',
        'drop-inside': dropZone === 'inside',
        'drop-after': dropZone === 'after',
      }"
      :style="{
        paddingLeft: `${depth * 14 + 10}px`,
        '--tree-indent': `${depth * 14 + 10}px`,
      }"
      :draggable="!isRenaming"
      data-testid="page-tree-row"
      :data-page-id="node.id"
      @click="handleRowClick"
      @contextmenu.prevent="handleRowContextMenu($event)"
      @dragstart.stop="handleDragStart($event)"
      @dragend.stop="handleDragEnd"
      @dragover.prevent.stop="handleDragOver($event)"
      @dragleave.stop="handleDragLeave"
      @drop.prevent.stop="handleDrop($event)"
    >
      <!-- Leading Icon / Expand Chevron Swap Container (Notion-like, closes #29) -->
      <div class="tree-leading-box">
        <button
          v-if="node.children.length > 0"
          type="button"
          class="tree-chevron-swap-btn"
          :class="{ 'is-expanded': expanded }"
          title="Expandir/Recolher subnotas"
          @click.stop="expanded = !expanded"
        >
          <ChevronDown v-if="expanded" :size="14" :stroke-width="1.75" />
          <ChevronRight v-else :size="14" :stroke-width="1.75" />
        </button>

        <span class="tree-icon-span" :class="{ 'has-parent-chevron': node.children.length > 0 }">
          <MindPageIcon
            :icon="node.icon"
            :has-content="Boolean(node.contentMarkdown?.trim())"
            :size="15"
          />
        </span>
      </div>

      <!-- Inline Rename Input or Standard Title -->
      <input
        v-if="isRenaming"
        ref="renameInputRef"
        v-model="renameBuffer"
        type="text"
        class="tree-rename-input"
        data-testid="tree-rename-input"
        @click.stop
        @keydown.enter="submitRename"
        @keydown.esc="cancelRename"
        @blur="submitRename"
      />
      <span v-else class="tree-node-title">{{ node.title }}</span>

      <!-- Notion-like Action Buttons on Hover: '+' and '...' -->
      <div v-if="!isRenaming" class="tree-action-buttons" @click.stop>
        <button
          type="button"
          class="tree-action-icon-btn"
          title="Criar subnota"
          data-testid="tree-add-child-btn"
          @click.stop="$emit('create-child', node.id)"
        >
          <Plus :size="14" :stroke-width="1.75" />
        </button>
        <button
          type="button"
          class="tree-action-icon-btn"
          title="Mais opções"
          data-testid="tree-more-options-btn"
          @click.stop="handleMoreOptionsClick($event)"
        >
          <MoreHorizontal :size="14" :stroke-width="1.75" />
        </button>
      </div>
    </div>

    <!-- Recursive Children -->
    <div v-if="expanded && node.children.length > 0" class="tree-children">
      <PageTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :active-page-id="activePageId"
        :renaming-id="renamingId"
        :dragging-id="draggingId"
        :force-expanded="forceExpanded"
        :depth="depth + 1"
        @select="$emit('select', $event)"
        @create-child="$emit('create-child', $event)"
        @more-options="(id, ev) => $emit('more-options', id, ev)"
        @contextmenu="(ev, n) => $emit('contextmenu', ev, n)"
        @rename-save="(id, title) => $emit('rename-save', id, title)"
        @drag-node-start="$emit('drag-node-start', $event)"
        @drag-node-end="$emit('drag-node-end')"
        @tree-drop="$emit('tree-drop', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-vue-next';
import type { PageTreeNode } from '@mind-hub/shared';
import MindPageIcon from './ui/MindPageIcon.vue';

export interface TreeDropPayload {
  draggedId: string;
  targetId: string;
  targetParentId: string | null;
  zone: 'before' | 'inside' | 'after';
}

defineOptions({
  name: 'PageTreeItem',
});

const props = withDefaults(
  defineProps<{
    node: PageTreeNode;
    activePageId: string;
    depth: number;
    renamingId?: string;
    draggingId?: string;
    forceExpanded?: boolean | null;
  }>(),
  {
    renamingId: '',
    draggingId: '',
    forceExpanded: null,
  },
);

const emit = defineEmits<{
  (e: 'select', pageId: string): void;
  (e: 'create-child', parentId: string): void;
  (e: 'more-options', pageId: string, event?: MouseEvent): void;
  (e: 'contextmenu', event: MouseEvent, node: PageTreeNode): void;
  (e: 'rename-save', pageId: string, newTitle: string): void;
  (e: 'drag-node-start', pageId: string): void;
  (e: 'drag-node-end'): void;
  (e: 'tree-drop', payload: TreeDropPayload): void;
}>();

const rowRef = ref<HTMLElement | null>(null);
const expanded = ref(props.forceExpanded ?? true);
const renameBuffer = ref(props.node.title);
const renameInputRef = ref<HTMLInputElement | null>(null);
const dropZone = ref<'before' | 'inside' | 'after' | null>(null);
let dragHoverExpandTimer: ReturnType<typeof setTimeout> | null = null;

const isRenaming = computed(() => props.renamingId === props.node.id);

watch(
  () => props.forceExpanded,
  (val) => {
    if (val !== null && val !== undefined) {
      expanded.value = val;
    }
  },
  { immediate: true },
);

watch(
  isRenaming,
  (val) => {
    if (val) {
      renameBuffer.value = props.node.title;
      nextTick(() => {
        renameInputRef.value?.focus();
        renameInputRef.value?.select();
      });
    }
  },
  { immediate: true },
);

function handleRowClick(): void {
  if (!isRenaming.value) {
    emit('select', props.node.id);
  }
}

function handleRowContextMenu(event: MouseEvent): void {
  emit('contextmenu', event, props.node);
}

function handleMoreOptionsClick(event: MouseEvent): void {
  const btn = event.currentTarget as HTMLElement | null;
  let clientX = event.clientX;
  let clientY = event.clientY;
  if (btn && (!clientX || !clientY)) {
    const rect = btn.getBoundingClientRect();
    clientX = rect.left;
    clientY = rect.bottom + 4;
  }
  const normalizedEvent =
    clientX !== event.clientX || clientY !== event.clientY
      ? new MouseEvent('click', { clientX, clientY, bubbles: true })
      : event;
  emit('contextmenu', normalizedEvent, props.node);
  emit('more-options', props.node.id, normalizedEvent);
}

function handleDragStart(event: DragEvent): void {
  if (isRenaming.value) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', props.node.id);
  }
  emit('drag-node-start', props.node.id);
}

function handleDragEnd(): void {
  clearExpandTimer();
  dropZone.value = null;
  emit('drag-node-end');
}

function handleDragOver(event: DragEvent): void {
  if (props.draggingId === props.node.id) {
    dropZone.value = null;
    return;
  }
  const el = rowRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const height = Math.max(rect.height, 1);
  const relY = event.clientY - rect.top;
  const ratio = relY / height;

  if (ratio < 0.25) {
    dropZone.value = 'before';
    clearExpandTimer();
  } else if (ratio > 0.75) {
    dropZone.value = 'after';
    clearExpandTimer();
  } else {
    dropZone.value = 'inside';
    if (!expanded.value && props.node.children.length > 0 && !dragHoverExpandTimer) {
      dragHoverExpandTimer = setTimeout(() => {
        expanded.value = true;
      }, 450);
    }
  }
}

function handleDragLeave(): void {
  clearExpandTimer();
  dropZone.value = null;
}

function handleDrop(event: DragEvent): void {
  clearExpandTimer();
  const zone = dropZone.value ?? 'inside';
  dropZone.value = null;
  const draggedId = event.dataTransfer?.getData('text/plain') || props.draggingId;
  if (!draggedId || draggedId === props.node.id) return;

  if (zone === 'inside') {
    expanded.value = true;
  }

  emit('tree-drop', {
    draggedId,
    targetId: props.node.id,
    targetParentId: props.node.parentId,
    zone,
  });
}

function clearExpandTimer(): void {
  if (dragHoverExpandTimer) {
    clearTimeout(dragHoverExpandTimer);
    dragHoverExpandTimer = null;
  }
}

function submitRename(): void {
  if (isRenaming.value) {
    const trimmed = renameBuffer.value.trim();
    if (trimmed && trimmed !== props.node.title) {
      emit('rename-save', props.node.id, trimmed);
    } else {
      cancelRename();
    }
  }
}

function cancelRename(): void {
  emit('rename-save', '', '');
}

onBeforeUnmount(() => {
  clearExpandTimer();
});
</script>

<style scoped>
.tree-node-wrapper {
  user-select: none;
}

.tree-node-row {
  display: flex;
  align-items: center;
  position: relative;
  min-height: 30px;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--mind-text-secondary);
  font-size: 13.5px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.tree-node-row:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.tree-node-active {
  background: var(--mind-bg-active);
  color: var(--mind-text-primary);
  font-weight: 500;
}

.tree-node-row.is-dragging {
  opacity: 0.45;
}

.tree-node-row.drop-before::before {
  content: '';
  position: absolute;
  top: -1px;
  left: var(--tree-indent, 10px);
  right: 6px;
  height: 2px;
  background: var(--mind-accent-primary, #1971c2);
  border-radius: 2px;
  pointer-events: none;
}

.tree-node-row.drop-after::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: var(--tree-indent, 10px);
  right: 6px;
  height: 2px;
  background: var(--mind-accent-primary, #1971c2);
  border-radius: 2px;
  pointer-events: none;
}

.tree-node-row.drop-inside {
  background: rgba(25, 113, 194, 0.09);
  box-shadow: inset 0 0 0 1px rgba(25, 113, 194, 0.38);
}

.tree-leading-box {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  flex-shrink: 0;
}

.tree-icon-span {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  transition: opacity 0.12s ease;
}

.tree-chevron-swap-btn {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  border-radius: 4px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: color 0.12s ease, background-color 0.12s ease;
}

.tree-chevron-swap-btn:hover {
  background: var(--mind-bg-active);
  color: var(--mind-text-primary);
}

/* On row hover: if node has children, swap icon with chevron */
.tree-node-row.has-children:hover .tree-icon-span.has-parent-chevron {
  opacity: 0;
  pointer-events: none;
}

.tree-node-row.has-children:hover .tree-chevron-swap-btn {
  display: flex;
}

.tree-node-title {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-rename-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.35;
  padding: 2px 6px;
  border: 1px solid var(--mind-accent-primary, #1971c2);
  border-radius: 4px;
  background: #ffffff;
  color: var(--mind-text-primary, #212529);
  outline: none;
}

.tree-action-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
  margin-left: auto;
  flex-shrink: 0;
}

.tree-node-row:hover .tree-action-buttons,
.tree-node-row:focus-within .tree-action-buttons {
  opacity: 1;
}

.tree-action-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.tree-action-icon-btn:hover {
  background: var(--mind-bg-active);
  color: var(--mind-text-primary);
}

.tree-custom-img-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 3px;
}
</style>
