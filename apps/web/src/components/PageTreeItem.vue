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
        class="q-mr-xs text-grey-5"
        @click.stop="expanded = !expanded"
      />
      <span v-else class="tree-spacer q-mr-xs" />

      <span class="q-mr-sm text-body2">{{ node.icon }}</span>
      <span class="ellipsis col text-body2 tree-node-title">{{ node.title }}</span>

      <q-btn
        flat
        dense
        round
        size="xs"
        icon="add"
        class="tree-action-btn text-grey-5"
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

.tree-node-row {
  transition: background-color 0.14s ease, color 0.14s ease;
}

.tree-node-row:hover {
  background: rgba(99, 102, 241, 0.12);
}

.tree-node-active {
  background: rgba(99, 102, 241, 0.22);
  color: #a5b4fc;
  font-weight: 600;
}

.tree-action-btn {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.tree-node-row:hover .tree-action-btn {
  opacity: 1;
}
</style>
