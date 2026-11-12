<template>
  <MindDropdown
    :model-value="modelValue"
    :x="x"
    :y="y"
    width="270px"
    :items="menuItems"
    data-testid="mind-tree-context-menu"
    @update:model-value="$emit('update:modelValue', $event)"
    @select="handleSelect"
    @close="$emit('close')"
  >
    <!-- Notion-like Header -->
    <template #header>
      <div class="tree-context-header">
        <span class="tree-context-caption">Página</span>
        <span v-if="page.title" class="tree-context-page-title" :title="page.title">
          {{ page.title }}
        </span>
      </div>
    </template>

    <!-- Notion-like Audit Footer -->
    <template #footer>
      <div class="tree-context-audit">
        <div class="audit-caption">Última edição</div>
        <div class="audit-author-row">
          <div class="audit-avatar">{{ authorInitial }}</div>
          <span class="audit-author-name">{{ authorDisplayName }}</span>
        </div>
        <div class="audit-time">{{ formattedUpdatedAt }}</div>
      </div>
    </template>
  </MindDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Columns2,
  Copy,
  Edit3,
  ExternalLink,
  FolderInput,
  Link,
  Plus,
  Star,
  StarOff,
  Trash2,
} from 'lucide-vue-next';
import MindDropdown from './MindDropdown.vue';
import type { DropdownMenuItem, TreeContextMenuActionId, TreeContextMenuTarget } from './types.js';

const props = defineProps<{
  modelValue: boolean;
  page: TreeContextMenuTarget;
  x: number;
  y: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'action', actionId: TreeContextMenuActionId, pageId: string): void;
  (e: 'close'): void;
}>();

const authorDisplayName = computed(() => props.page.authorName || 'Luiz Gustavo Dias Pulz');
const authorInitial = computed(() => (authorDisplayName.value[0] || 'L').toUpperCase());

const formattedUpdatedAt = computed(() => {
  if (!props.page.updatedAt) {
    return '12 de nov. de 2026, 16:15';
  }
  try {
    const d = new Date(props.page.updatedAt);
    if (isNaN(d.getTime())) return 'Hoje';
    const day = d.getDate();
    const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} de ${month} de ${year}, ${hours}:${minutes}`;
  } catch {
    return '12 de nov. de 2026, 16:15';
  }
});

const menuItems = computed<DropdownMenuItem[]>(() => [
  // 1. Favoritos
  {
    id: 'toggle-favorite',
    label: props.page.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
    icon: props.page.isFavorite ? StarOff : Star,
    section: 'favorite',
    testId: 'tree-context-action-toggle-favorite',
  },
  // 2. Ações de Gestão do Arquivo
  {
    id: 'copy-link',
    label: 'Copiar link',
    icon: Link,
    section: 'actions',
    testId: 'tree-context-action-copy-link',
  },
  {
    id: 'duplicate',
    label: 'Duplicar',
    icon: Copy,
    shortcut: 'Ctrl+D',
    section: 'actions',
    testId: 'tree-context-action-duplicate',
  },
  {
    id: 'rename',
    label: 'Renomear',
    icon: Edit3,
    shortcut: 'Ctrl+⇧+R',
    section: 'actions',
    testId: 'tree-context-action-rename',
  },
  {
    id: 'move',
    label: 'Mover para',
    icon: FolderInput,
    shortcut: 'Ctrl+⇧+P',
    section: 'actions',
    testId: 'tree-context-action-move',
  },
  {
    id: 'delete',
    label: 'Mover para a lixeira',
    icon: Trash2,
    danger: true,
    section: 'actions',
    testId: 'tree-context-action-delete',
  },
  // 3. Subpáginas
  {
    id: 'create-subpage',
    label: 'Nova subpágina',
    icon: Plus,
    section: 'subpage',
    testId: 'tree-context-action-create-subpage',
  },
  // 4. Modos de Abertura
  {
    id: 'open-new-tab',
    label: 'Abrir em nova guia',
    icon: ExternalLink,
    shortcut: 'Ctrl+⇧+↵',
    section: 'navigation',
    testId: 'tree-context-action-open-new-tab',
  },
  {
    id: 'open-side-by-side',
    label: 'Abrir no modo lado a lado',
    icon: Columns2,
    shortcut: 'Alt+Click',
    section: 'navigation',
    testId: 'tree-context-action-open-side-by-side',
  },
]);

function handleSelect(item: DropdownMenuItem): void {
  emit('action', item.id as TreeContextMenuActionId, props.page.id);
  emit('update:modelValue', false);
  emit('close');
}
</script>

<style scoped>
.tree-context-header {
  padding: 4px 8px 6px 8px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  margin-bottom: 3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-context-caption {
  font-size: 11px;
  font-weight: 500;
  color: var(--mind-text-muted, #868e96);
  letter-spacing: -0.1px;
  line-height: 1.2;
}

.tree-context-page-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.tree-context-audit {
  padding: 6px 8px 4px 8px;
  user-select: none;
  font-family: inherit;
}

.audit-caption {
  font-size: 11px;
  font-weight: 500;
  color: var(--mind-text-muted, #868e96);
  margin-bottom: 4px;
  line-height: 1;
}

.audit-author-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mind-text-secondary, #37352f);
  margin-bottom: 2px;
  line-height: 1.2;
}

.audit-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e7f5ff;
  color: #1971c2;
  font-size: 9.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.audit-author-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audit-time {
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
  padding-left: 22px;
  line-height: 1.2;
}
</style>
