<template>
  <div class="tree-node-wrapper">
    <div
      class="tree-node-row"
      :class="{
        'tree-node-active': activePageId === node.id,
        'has-children': node.children.length > 0,
        'is-renaming': isRenaming,
      }"
      :style="{ paddingLeft: `${depth * 14 + 10}px` }"
      data-testid="page-tree-row"
      :data-page-id="node.id"
      @click="handleRowClick"
      @contextmenu.prevent="handleContextMenu($event)"
    >
      <!-- Leading Icon / Expand Chevron Swap Container (Notion-like, closes #29) -->
      <div class="tree-leading-box">
        <button
          v-if="node.children.length > 0"
          type="button"
          class="tree-chevron-swap-btn"
          :class="{ 'is-expanded': expanded }"
          title="Expandir/Recolher subpáginas"
          @click.stop="expanded = !expanded"
        >
          <ChevronDown v-if="expanded" :size="14" />
          <ChevronRight v-else :size="14" />
        </button>

        <span class="tree-icon-span" :class="{ 'has-parent-chevron': node.children.length > 0 }">
          <MindPageIcon
            :icon="node.icon || (node.children.length > 0 ? '📁' : '')"
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
          title="Criar subpágina"
          data-testid="tree-add-child-btn"
          @click.stop="$emit('create-child', node.id)"
        >
          <Plus :size="14" />
        </button>
        <button
          type="button"
          class="tree-action-icon-btn"
          title="Mais opções"
          data-testid="tree-more-options-btn"
          @click.stop="handleContextMenu($event)"
        >
          <MoreHorizontal :size="14" />
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
        :force-expanded="forceExpanded"
        :depth="depth + 1"
        @select="$emit('select', $event)"
        @create-child="$emit('create-child', $event)"
        @more-options="(id, ev) => $emit('more-options', id, ev)"
        @contextmenu="(ev, n) => $emit('contextmenu', ev, n)"
        @rename-save="(id, title) => $emit('rename-save', id, title)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-vue-next';
import type { PageTreeNode } from '@mind-hub/shared';
import MindPageIcon from './ui/MindPageIcon.vue';

defineOptions({
  name: 'PageTreeItem',
});

const props = withDefaults(
  defineProps<{
    node: PageTreeNode;
    activePageId: string;
    depth: number;
    renamingId?: string;
    forceExpanded?: boolean | null;
  }>(),
  {
    renamingId: '',
    forceExpanded: null,
  },
);

const emit = defineEmits<{
  (e: 'select', pageId: string): void;
  (e: 'create-child', parentId: string): void;
  (e: 'more-options', pageId: string, event?: MouseEvent): void;
  (e: 'contextmenu', event: MouseEvent, node: PageTreeNode): void;
  (e: 'rename-save', pageId: string, newTitle: string): void;
}>();

const expanded = ref(props.forceExpanded ?? true);
const renameBuffer = ref(props.node.title);
const renameInputRef = ref<HTMLInputElement | null>(null);

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

function isImageUrl(val: string): boolean {
  return (
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('data:image/') ||
    val.startsWith('/')
  );
}

function handleRowClick(): void {
  if (!isRenaming.value) {
    emit('select', props.node.id);
  }
}

function handleContextMenu(event: MouseEvent): void {
  emit('contextmenu', event, props.node);
  emit('more-options', props.node.id, event);
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
  color: var(--mind-text-primary, #111827);
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
