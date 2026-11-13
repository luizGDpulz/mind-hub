<template>
  <div
    ref="menuRootRef"
    class="mind-action-menu-popover"
    data-testid="mind-action-menu"
  >
    <!-- Search action input (Notion-like) -->
    <div class="action-search-bar">
      <span class="action-search-icon">🔍</span>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Pesquisar ações..."
        class="action-search-input"
        data-testid="action-menu-search-input"
        @keydown.esc="$emit('close')"
      />
    </div>

    <!-- Actions List -->
    <div class="action-menu-scrollable">
      <template v-for="(sectionKey, sIdx) in sectionKeys" :key="sectionKey">
        <div v-if="sIdx > 0 && sections[sectionKey]?.length" class="action-menu-divider" />

        <div
          v-for="item in sections[sectionKey]"
          :key="item.id"
          class="action-menu-row"
          :class="{
            'is-danger': item.danger,
            'is-disabled': item.disabled
          }"
          :data-testid="`action-item-${item.id}`"
          @click="handleItemClick(item)"
        >
          <div class="action-left-col">
            <component
              :is="item.icon"
              v-if="item.icon"
              class="action-item-icon"
              :size="16"
              :stroke-width="1.75"
            />
            <span class="action-item-label">{{ item.label }}</span>
          </div>

          <div class="action-right-col">
            <span v-if="item.shortcut" class="action-shortcut-badge">{{ item.shortcut }}</span>
            <div
              v-else-if="item.toggle"
              class="action-toggle-switch"
              :class="{ 'is-on': item.active }"
              data-testid="action-toggle-switch"
            >
              <div class="toggle-knob" />
            </div>
          </div>
        </div>
      </template>

      <div v-if="filteredActions.length === 0" class="action-menu-empty">
        Nenhuma ação encontrada
      </div>
    </div>

    <!-- Metadata Footer (Notion-like) -->
    <div v-if="pageMeta" class="action-menu-footer" data-testid="action-menu-footer">
      <div class="meta-label">Última edição</div>
      <div class="meta-author-row">
        <span class="meta-avatar">{{ authorInitial }}</span>
        <span class="meta-author-name">{{ pageMeta.lastEditedAuthor || 'Você' }}</span>
      </div>
      <div v-if="pageMeta.lastEditedDate" class="meta-date">
        {{ pageMeta.lastEditedDate }}
      </div>
      <div v-if="pageMeta.wordCount !== undefined" class="meta-word-count">
        {{ pageMeta.wordCount }} {{ pageMeta.wordCount === 1 ? 'palavra' : 'palavras' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useDismissiblePopover } from '../../composables/useDismissiblePopover';
import type { ActionMenuItem, ActionMenuPageMeta } from './types.js';

const props = defineProps<{
  items: ActionMenuItem[];
  pageMeta?: ActionMenuPageMeta;
}>();

const emit = defineEmits<{
  (e: 'select', item: ActionMenuItem): void;
  (e: 'close'): void;
}>();

const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);
const menuRootRef = ref<HTMLDivElement | null>(null);

const filteredActions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return props.items;
  return props.items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      (item.shortcut && item.shortcut.toLowerCase().includes(q)),
  );
});

const sectionKeys = ['actions', 'tools', 'danger'] as const;

const sections = computed(() => {
  const result: Record<string, ActionMenuItem[]> = {
    actions: [],
    tools: [],
    danger: [],
  };
  for (const item of filteredActions.value) {
    const key = item.section || (item.danger ? 'danger' : 'actions');
    if (!result[key]) {
      result[key] = [];
    }
    result[key]?.push(item);
  }
  return result;
});

const authorInitial = computed(() => {
  const name = props.pageMeta?.lastEditedAuthor || 'L';
  return name.trim().charAt(0).toUpperCase();
});

function handleItemClick(item: ActionMenuItem): void {
  if (item.disabled) return;
  if (item.handler) {
    item.handler();
  }
  emit('select', item);
  if (!item.toggle) {
    emit('close');
  }
}

useDismissiblePopover({
  isOpen: () => true,
  containerRef: menuRootRef,
  closeOnOutsideClick: true,
  deferOutsideAttachMs: 10,
  onClose: () => emit('close'),
});

onMounted(() => {
  void nextTick(() => {
    searchInputRef.value?.focus();
  });
});
</script>

<style scoped>
.mind-action-menu-popover {
  position: absolute;
  right: 16px;
  top: 44px;
  width: 290px;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 8px;
  box-shadow: var(--mind-shadow-popover);
  display: flex;
  flex-direction: column;
  z-index: 2500;
  overflow: hidden;
  user-select: none;
}

.action-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--mind-border-subtle);
}

.action-search-icon {
  font-size: 13px;
  opacity: 0.6;
}

.action-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13.5px;
  color: var(--mind-text-primary);
}

.action-menu-scrollable {
  max-height: 380px;
  overflow-y: auto;
  padding: 4px;
}

.action-menu-divider {
  height: 1px;
  background: var(--mind-border-subtle);
  margin: 4px 6px;
}

.action-menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
  color: var(--mind-text-primary);
  transition: background-color 0.1s ease;
}

.action-menu-row:hover:not(.is-disabled) {
  background: var(--mind-bg-hover);
}

.action-left-col {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.action-item-icon {
  color: var(--mind-text-secondary);
  flex-shrink: 0;
}

.action-item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 450;
}

.action-right-col {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.action-shortcut-badge {
  font-size: 11px;
  color: var(--mind-text-muted);
  font-family: inherit;
}

/* Minimalist Toggle Switch */
.action-toggle-switch {
  width: 28px;
  height: 16px;
  background: #dee2e6;
  border-radius: 999px;
  position: relative;
  transition: background-color 0.15s ease;
}

.action-toggle-switch.is-on {
  background: var(--mind-accent-primary);
}

.toggle-knob {
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.action-toggle-switch.is-on .toggle-knob {
  transform: translateX(12px);
}

.action-menu-row.is-danger {
  color: #c92a2a;
}

.action-menu-row.is-danger .action-item-icon {
  color: #c92a2a;
}

.action-menu-row.is-danger:hover:not(.is-disabled) {
  background: #fff5f5;
}

.action-menu-row.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-menu-empty {
  padding: 14px 10px;
  text-align: center;
  font-size: 12.5px;
  color: var(--mind-text-muted);
}

/* Metadata Footer */
.action-menu-footer {
  border-top: 1px solid var(--mind-border-subtle);
  padding: 10px 14px;
  background: #fafbfc;
  font-size: 11.5px;
  color: var(--mind-text-muted);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-label {
  font-weight: 600;
  color: var(--mind-text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.meta-author-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--mind-text-secondary);
  font-weight: 500;
  margin-top: 2px;
}

.meta-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #dee2e6;
  color: var(--mind-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}

.meta-date {
  font-size: 11px;
}

.meta-word-count {
  font-size: 11px;
  color: var(--mind-text-muted);
  margin-top: 2px;
}
</style>
