<template>
  <div class="tree-node-wrapper">
    <div
      class="tree-node-row"
      :class="{
        'tree-node-active': activePageId === node.id,
        'has-children': node.children.length > 0,
      }"
      :style="{ paddingLeft: `${depth * 14 + 10}px` }"
      @click="$emit('select', node.id)"
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
          <img
            v-if="node.icon && isImageUrl(node.icon)"
            :src="node.icon"
            class="tree-custom-img-icon"
            alt=""
          />
          <span v-else>{{ node.icon || (node.children.length > 0 ? '📁' : '📄') }}</span>
        </span>
      </div>

      <span class="tree-node-title">{{ node.title }}</span>

      <!-- Notion-like Action Buttons on Hover: '+' and '...' -->
      <div class="tree-action-buttons" @click.stop>
        <button
          type="button"
          class="tree-action-icon-btn"
          title="Criar subpágina"
          @click.stop="$emit('create-child', node.id)"
        >
          <Plus :size="14" />
        </button>
        <button
          type="button"
          class="tree-action-icon-btn"
          title="Mais opções"
          @click.stop="$emit('more-options', node.id)"
        >
          <MoreHorizontal :size="14" />
        </button>
      </div>
    </div>

    <div v-if="expanded && node.children.length > 0" class="tree-children">
      <PageTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :active-page-id="activePageId"
        :depth="depth + 1"
        @select="$emit('select', $event)"
        @create-child="$emit('create-child', $event)"
        @more-options="$emit('more-options', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-vue-next';
import type { PageTreeNode } from '@mind-hub/shared';

defineOptions({
  name: 'PageTreeItem',
});

defineProps<{
  node: PageTreeNode;
  activePageId: string;
  depth: number;
}>();

defineEmits<{
  (e: 'select', pageId: string): void;
  (e: 'create-child', parentId: string): void;
  (e: 'more-options', pageId: string): void;
}>();

const expanded = ref(true);

function isImageUrl(val: string): boolean {
  return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/') || val.startsWith('/');
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
