<template>
  <MindDropdown
    :model-value="modelValue"
    :x="x"
    :y="y"
    width="230px"
    data-testid="mind-tree-context-menu"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <div class="tree-context-header">
      <span class="tree-context-title">{{ page.title }}</span>
    </div>

    <div
      v-for="item in menuActions"
      :key="item.id"
      class="mind-dropdown-item"
      :class="{
        'is-danger': item.danger,
      }"
      :data-testid="`tree-context-action-${item.id}`"
      @click="triggerAction(item.id)"
    >
      <div class="dropdown-item-left">
        <component
          :is="item.icon"
          class="dropdown-item-icon"
          :size="15"
          :stroke-width="1.75"
        />
        <span class="dropdown-item-label">{{ item.label }}</span>
      </div>

      <div v-if="item.shortcut" class="dropdown-item-right">
        <span class="dropdown-shortcut-badge">{{ item.shortcut }}</span>
      </div>
    </div>
  </MindDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Copy,
  Edit3,
  FolderInput,
  Link,
  Plus,
  Star,
  Trash2,
} from 'lucide-vue-next';
import MindDropdown from './MindDropdown.vue';
import type { TreeContextMenuAction, TreeContextMenuActionId } from './types.js';

const props = defineProps<{
  modelValue: boolean;
  page: {
    id: string;
    title: string;
    icon?: string;
    isFavorite?: boolean;
  };
  x: number;
  y: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'action', actionId: TreeContextMenuActionId, pageId: string): void;
  (e: 'close'): void;
}>();

const menuActions = computed<TreeContextMenuAction[]>(() => [
  {
    id: 'rename',
    label: 'Renomear',
    icon: Edit3,
    shortcut: 'F2',
  },
  {
    id: 'duplicate',
    label: 'Duplicar página',
    icon: Copy,
    shortcut: 'Ctrl+D',
  },
  {
    id: 'create-subpage',
    label: 'Nova subpágina',
    icon: Plus,
  },
  {
    id: 'move',
    label: 'Mover para...',
    icon: FolderInput,
    shortcut: 'Ctrl+M',
  },
  {
    id: 'toggle-favorite',
    label: props.page.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
    icon: Star,
  },
  {
    id: 'copy-link',
    label: 'Copiar link',
    icon: Link,
  },
  {
    id: 'delete',
    label: 'Mover para lixeira',
    icon: Trash2,
    shortcut: 'Del',
    danger: true,
  },
]);

function triggerAction(actionId: TreeContextMenuActionId): void {
  emit('action', actionId, props.page.id);
  emit('update:modelValue', false);
  emit('close');
}
</script>

<style scoped>
.tree-context-header {
  padding: 6px 12px 6px 12px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  margin-bottom: 4px;
}

.tree-context-title {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--mind-text-muted, #868e96);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
