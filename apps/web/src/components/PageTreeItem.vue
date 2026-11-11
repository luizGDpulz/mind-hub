<template>
  <div class="tree-node-wrapper">
    <div
      class="tree-node-row row items-center no-wrap q-px-sm q-py-xs rounded-borders cursor-pointer"
      :class="{ 'tree-node-active': activePageId === node.id }"
      :style="{ paddingLeft: `${depth * 14 + 8}px` }"
      @click="$emit('select', node.id)"
    >
      <q-btn
        v-if="node.children.length > 0"
        flat
        dense
        round
        size="xs"
        :icon="expanded ? 'expand_more' : 'chevron_right'"
        class="q-mr-xs tree-chevron"
        @click.stop="expanded = !expanded"
      />
      <span v-else class="tree-spacer q-mr-xs" />

      <span class="q-mr-sm text-body2">{{ node.icon || (node.children.length > 0 ? '📁' : '📄') }}</span>
      <span class="ellipsis col tree-node-title">{{ node.title }}</span>

      <q-btn
        flat
        dense
        round
        size="xs"
        icon="add"
        class="tree-action-btn"
        title="Criar subpágina"
        @click.stop="$emit('create-child', node.id)"
      />
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
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
}>();

const expanded = ref(true);
</script>

<style scoped>
.tree-spacer {
  display: inline-block;
  width: 20px;
}

.tree-chevron {
  color: var(--mind-text-muted);
}

.tree-node-row {
  border-radius: 6px;
  color: var(--mind-text-secondary);
  font-size: 13.5px;
  min-height: 30px;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.tree-node-row:hover {
  background: var(--mind-bg-hover);
}

.tree-node-active {
  background: var(--mind-bg-active);
  color: var(--mind-text-primary);
  font-weight: 500;
}

.tree-node-title {
  font-size: 13.5px;
  line-height: 1.35;
}

.tree-action-btn {
  opacity: 0;
  color: var(--mind-text-muted);
  transition: opacity 0.12s ease;
}

.tree-node-row:hover .tree-action-btn,
.tree-node-row:focus-within .tree-action-btn {
  opacity: 1;
}
</style>
