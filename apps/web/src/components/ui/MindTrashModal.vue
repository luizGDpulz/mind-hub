<template>
  <q-dialog
    :model-value="modelValue"
    data-testid="clean-trash-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="mind-trash-modal-card">
      <!-- Modal Header -->
      <div class="trash-modal-header">
        <div class="trash-modal-title-group">
          <Trash2 :size="18" class="trash-header-icon" />
          <span class="trash-modal-title">Lixeira</span>
          <span class="trash-count-badge">{{ deletedPages.length }}</span>
        </div>
        <div class="trash-modal-header-actions">
          <button
            v-if="deletedPages.length > 0"
            type="button"
            class="trash-empty-all-btn"
            :class="{ 'is-confirming': isConfirmingEmpty }"
            data-testid="empty-trash-btn"
            @click="handleEmptyTrashClick"
          >
            <Trash2 :size="13" />
            <span>{{ isConfirmingEmpty ? 'Confirmar esvaziar tudo?' : 'Esvaziar lixeira' }}</span>
          </button>
          <button
            v-if="isConfirmingEmpty"
            type="button"
            class="trash-cancel-confirm-btn"
            title="Cancelar"
            @click="isConfirmingEmpty = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="trash-modal-close-btn"
            aria-label="Fechar modal"
            @click="$emit('update:modelValue', false)"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <!-- Search Filter -->
      <div class="trash-search-container">
        <Search :size="14" class="trash-search-icon" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Buscar notas na lixeira..."
          class="trash-search-input"
          data-testid="trash-search-input"
        />
      </div>

      <!-- Deleted Items List -->
      <div class="trash-items-scrollable">
        <div
          v-for="page in filteredDeletedPages"
          :key="page.id"
          class="trash-item-row"
          :data-testid="`trash-row-${page.id}`"
        >
          <span class="trash-item-icon">{{ page.icon || '📄' }}</span>
          <div class="trash-item-info">
            <div class="trash-item-title">{{ page.title }}</div>
            <div class="trash-item-meta">
              <span v-if="page.sourcePath" class="trash-item-path">{{ page.sourcePath }}</span>
              <span class="trash-item-date">Excluído em {{ formatDate(page.deletedAt) }}</span>
            </div>
          </div>
          <div class="trash-item-actions">
            <button
              type="button"
              class="trash-restore-btn"
              :data-testid="`restore-btn-${page.id}`"
              title="Restaurar nota para o workspace"
              @click="handleRestore(page.id)"
            >
              <RotateCcw :size="13" class="restore-icon" />
              <span>Restaurar</span>
            </button>
            <button
              type="button"
              class="trash-purge-btn"
              :class="{ 'is-confirming': confirmPurgeId === page.id }"
              :data-testid="`purge-btn-${page.id}`"
              :title="confirmPurgeId === page.id ? 'Clique novamente para apagar para sempre' : 'Excluir definitivamente'"
              @click="handlePermanentDelete(page.id)"
            >
              <Trash2 :size="13" />
              <span>{{ confirmPurgeId === page.id ? 'Confirmar exclusão?' : 'Excluir definitivamente' }}</span>
            </button>
            <button
              v-if="confirmPurgeId === page.id"
              type="button"
              class="trash-cancel-purge-btn"
              title="Cancelar exclusão"
              @click="confirmPurgeId = null"
            >
              ✕
            </button>
          </div>
        </div>

        <div v-if="filteredDeletedPages.length === 0" class="trash-empty-state">
          {{ deletedPages.length === 0 ? 'A lixeira está vazia.' : 'Nenhuma nota encontrada com esse filtro.' }}
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search, Trash2, RotateCcw, X } from 'lucide-vue-next';
import type { MindPage } from '@mind-hub/shared';

const props = defineProps<{
  modelValue: boolean;
  deletedPages: MindPage[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'restore', pageId: string): void;
  (e: 'permanent-delete', pageId: string): void;
  (e: 'empty-trash'): void;
}>();

const searchQuery = ref('');
const confirmPurgeId = ref<string | null>(null);
const isConfirmingEmpty = ref(false);

const filteredDeletedPages = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return props.deletedPages;
  return props.deletedPages.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      (p.sourcePath && p.sourcePath.toLowerCase().includes(q)),
  );
});

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Data desconhecida';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function handleRestore(pageId: string): void {
  emit('restore', pageId);
  if (confirmPurgeId.value === pageId) {
    confirmPurgeId.value = null;
  }
}

function handlePermanentDelete(pageId: string): void {
  if (confirmPurgeId.value === pageId) {
    emit('permanent-delete', pageId);
    confirmPurgeId.value = null;
  } else {
    confirmPurgeId.value = pageId;
  }
}

function handleEmptyTrashClick(): void {
  if (isConfirmingEmpty.value) {
    emit('empty-trash');
    isConfirmingEmpty.value = false;
  } else {
    isConfirmingEmpty.value = true;
  }
}
</script>

<style scoped>
.mind-trash-modal-card {
  width: 680px;
  max-width: 95vw;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 10px;
  box-shadow: var(--mind-shadow-popover);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.trash-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--mind-border-subtle);
}

.trash-modal-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trash-header-icon {
  color: var(--mind-text-muted);
}

.trash-modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--mind-text-primary);
}

.trash-count-badge {
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 7px;
  background: var(--mind-bg-surface-subtle);
  color: var(--mind-text-muted);
  border-radius: 999px;
}

.trash-modal-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trash-empty-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mind-text-secondary);
  background: var(--mind-bg-surface-subtle);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.trash-empty-all-btn:hover {
  color: #c92a2a;
  background: #fff5f5;
  border-color: #ffc9c9;
}

.trash-empty-all-btn.is-confirming {
  color: #ffffff;
  background: #e03131;
  border-color: #c92a2a;
}

.trash-cancel-confirm-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--mind-text-muted);
  cursor: pointer;
  padding: 4px 6px;
}

.trash-cancel-confirm-btn:hover {
  color: var(--mind-text-primary);
}

.trash-modal-close-btn {
  background: transparent;
  border: none;
  color: var(--mind-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.trash-modal-close-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.trash-search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--mind-border-subtle);
  background: #fafbfc;
}

.trash-search-icon {
  color: var(--mind-text-muted);
  flex-shrink: 0;
}

.trash-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--mind-text-primary);
}

.trash-items-scrollable {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 12px;
}

.trash-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

.trash-item-row:hover {
  background: var(--mind-bg-hover);
}

.trash-item-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.trash-item-info {
  flex: 1;
  min-width: 0;
}

.trash-item-title {
  font-size: 13.5px;
  font-weight: 550;
  color: var(--mind-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trash-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--mind-text-muted);
  margin-top: 2px;
}

.trash-item-path {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.trash-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.trash-restore-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 500;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-control);
  color: var(--mind-text-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.trash-restore-btn:hover {
  background: var(--mind-bg-hover);
  border-color: var(--mind-border-subtle);
  color: var(--mind-accent-primary);
}

.restore-icon {
  color: var(--mind-text-muted);
}

.trash-purge-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 500;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-control);
  color: var(--mind-text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.trash-purge-btn:hover {
  background: #fff5f5;
  border-color: #ffc9c9;
  color: #c92a2a;
}

.trash-purge-btn.is-confirming {
  background: #e03131;
  border-color: #c92a2a;
  color: #ffffff;
}

.trash-cancel-purge-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  color: var(--mind-text-muted);
  cursor: pointer;
  padding: 2px 4px;
}

.trash-cancel-purge-btn:hover {
  color: var(--mind-text-primary);
}

.trash-empty-state {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--mind-text-muted);
}
</style>
