<template>
  <div
    v-if="modelValue"
    class="mind-apps-menu-backdrop"
    @click.self="$emit('update:modelValue', false)"
  >
    <div
      class="mind-apps-menu-card"
      data-testid="sidebar-apps-popover"
      :style="popoverStyle"
    >
      <div class="apps-menu-list">
        <!-- Biblioteca -->
        <button
          type="button"
          class="apps-menu-item is-disabled"
          title="Biblioteca de documentos (Em breve)"
        >
          <Library :size="16" class="apps-menu-icon" />
          <span class="apps-menu-title">Biblioteca</span>
          <span class="apps-menu-badge">Em breve</span>
        </button>

        <!-- Anotações IA -->
        <button
          type="button"
          class="apps-menu-item"
          data-testid="apps-ai-notes-btn"
          @click="handleAction('ai-notes')"
        >
          <Sparkles :size="16" class="apps-menu-icon" />
          <span class="apps-menu-title">Anotações IA</span>
        </button>

        <!-- Habilidades -->
        <button
          type="button"
          class="apps-menu-item is-disabled"
          title="Habilidades e Prompts (Em breve)"
        >
          <TrendingUp :size="16" class="apps-menu-icon" />
          <span class="apps-menu-title">Habilidades</span>
          <span class="apps-menu-badge">Em breve</span>
        </button>

        <!-- Minhas tarefas -->
        <button
          type="button"
          class="apps-menu-item"
          data-testid="apps-tasks-btn"
          @click="handleAction('tasks')"
        >
          <CheckSquare :size="16" class="apps-menu-icon" />
          <span class="apps-menu-title">Minhas tarefas</span>
        </button>

        <!-- Marketplace -->
        <button
          type="button"
          class="apps-menu-item is-disabled"
          title="Marketplace de templates (Em breve)"
        >
          <Store :size="16" class="apps-menu-icon" />
          <span class="apps-menu-title">Marketplace</span>
          <span class="apps-menu-badge">Em breve</span>
        </button>

        <div class="apps-menu-divider" />

        <!-- Lixeira (Highlighted & Active per user request) -->
        <button
          type="button"
          class="apps-menu-item is-trash"
          data-testid="apps-trash-btn"
          @click="handleAction('trash')"
        >
          <Trash2 :size="16" class="apps-menu-icon trash-icon" />
          <span class="apps-menu-title">Lixeira</span>
          <span v-if="trashCount > 0" class="trash-badge">{{ trashCount }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Library,
  Sparkles,
  TrendingUp,
  CheckSquare,
  Store,
  Trash2,
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    trashCount?: number;
    top?: number;
    left?: number;
  }>(),
  {
    trashCount: 0,
    top: 48,
    left: 170,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'open-trash'): void;
  (e: 'open-ai'): void;
  (e: 'open-tasks'): void;
}>();

const popoverStyle = computed(() => ({
  top: `${props.top}px`,
  left: `${props.left}px`,
}));

function handleAction(action: 'trash' | 'ai-notes' | 'tasks'): void {
  emit('update:modelValue', false);
  if (action === 'trash') {
    emit('open-trash');
  } else if (action === 'ai-notes') {
    emit('open-ai');
  } else if (action === 'tasks') {
    emit('open-tasks');
  }
}
</script>

<style scoped>
.mind-apps-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: transparent;
}

.mind-apps-menu-card {
  position: absolute;
  width: 220px;
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  box-shadow: var(--mind-shadow-popover, 0 8px 24px rgba(0, 0, 0, 0.12));
  padding: 6px;
  display: flex;
  flex-direction: column;
  animation: mindMenuFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: inherit;
}

@keyframes mindMenuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.apps-menu-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.apps-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--mind-text-primary, #212529);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease;
}

.apps-menu-item:hover:not(.is-disabled) {
  background: var(--mind-bg-hover, #f1f3f5);
}

.apps-menu-item.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.apps-menu-icon {
  color: var(--mind-text-secondary, #495057);
  flex-shrink: 0;
}

.apps-menu-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.apps-menu-badge {
  font-size: 10.5px;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--mind-bg-surface-subtle, #f8f9fa);
  color: var(--mind-text-muted, #868e96);
}

.apps-menu-divider {
  height: 1px;
  background: var(--mind-border-subtle, #e9ecef);
  margin: 4px 4px;
}

.apps-menu-item.is-trash:hover {
  background: #fff5f5;
  color: #c92a2a;
}

.apps-menu-item.is-trash:hover .trash-icon {
  color: #c92a2a;
}

.trash-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  background: var(--mind-bg-surface-subtle, #f8f9fa);
  color: var(--mind-text-muted, #868e96);
  border-radius: 999px;
}
</style>
