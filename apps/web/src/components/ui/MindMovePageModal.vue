<template>
  <MindModal
    :model-value="modelValue"
    title="Mover página"
    subtitle="Selecione a pasta ou página de destino na hierarquia do espaço"
    max-width="480px"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <div class="move-modal-container" data-testid="mind-move-page-modal">
      <!-- Search Filter -->
      <div class="move-search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Pesquisar pasta de destino..."
          class="move-search-input"
          data-testid="move-search-input"
        />
      </div>

      <!-- Destination List -->
      <div class="move-destinations-list" data-testid="move-destinations-list">
        <!-- Root option -->
        <div
          class="move-destination-item"
          :class="{ 'is-selected': selectedParentId === null }"
          data-testid="move-dest-root"
          @click="selectedParentId = null"
        >
          <span class="move-dest-icon">🏠</span>
          <div class="move-dest-meta">
            <span class="move-dest-title">Raiz do Workspace (Sem página-pai)</span>
            <span class="move-dest-hint">Nível superior da árvore</span>
          </div>
        </div>

        <div class="move-divider" />

        <!-- Eligible Pages -->
        <div
          v-for="target in eligiblePages"
          :key="target.id"
          class="move-destination-item"
          :class="{
            'is-selected': selectedParentId === target.id,
            'is-disabled': isTargetInvalid(target.id),
          }"
          :data-testid="`move-dest-${target.id}`"
          @click="selectTarget(target.id)"
        >
          <span class="move-dest-icon">{{ target.icon || '📄' }}</span>
          <div class="move-dest-meta">
            <span class="move-dest-title">{{ target.title }}</span>
            <span v-if="isTargetInvalid(target.id)" class="move-dest-hint is-warning">
              (Página atual ou subpágina descendente)
            </span>
          </div>
        </div>

        <div v-if="eligiblePages.length === 0" class="move-empty">
          Nenhuma pasta correspondente encontrada.
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="confirm-cancel-btn"
        data-testid="cancel-move-btn"
        @click="close"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="confirm-action-btn is-primary"
        data-testid="confirm-move-btn"
        @click="handleConfirmMove"
      >
        Mover para aqui
      </button>
    </template>
  </MindModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MindPage } from '@mind-hub/shared';
import MindModal from './MindModal.vue';

const props = defineProps<{
  modelValue: boolean;
  pageId: string;
  pages: MindPage[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'move', pageId: string, targetParentId: string | null): void;
  (e: 'close'): void;
}>();

const searchQuery = ref('');
const selectedParentId = ref<string | null>(null);

const currentPage = computed(() => props.pages.find((p) => p.id === props.pageId));

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      searchQuery.value = '';
      selectedParentId.value = currentPage.value?.parentId ?? null;
    }
  },
  { immediate: true },
);

function isDescendant(targetId: string, ancestorId: string): boolean {
  if (targetId === ancestorId) return true;
  let curr = props.pages.find((p) => p.id === targetId);
  while (curr && curr.parentId) {
    if (curr.parentId === ancestorId) return true;
    const nextParentId: string = curr.parentId;
    curr = props.pages.find((p) => p.id === nextParentId);
  }
  return false;
}

function isTargetInvalid(targetId: string): boolean {
  if (targetId === props.pageId) return true;
  return isDescendant(targetId, props.pageId);
}

const eligiblePages = computed(() => {
  const active = props.pages.filter((p) => p.deletedAt === null);
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return active;
  return active.filter((p) => p.title.toLowerCase().includes(q));
});

function selectTarget(targetId: string): void {
  if (isTargetInvalid(targetId)) return;
  selectedParentId.value = targetId;
}

function close(): void {
  emit('update:modelValue', false);
  emit('close');
}

function handleConfirmMove(): void {
  emit('move', props.pageId, selectedParentId.value);
  close();
}
</script>

<style scoped>
.move-modal-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.move-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  font-size: 13.5px;
  color: var(--mind-text-primary, #111827);
  outline: none;
  transition: border-color 0.12s ease;
}

.move-search-input:focus {
  border-color: var(--mind-accent-primary, #1971c2);
  background: #ffffff;
}

.move-destinations-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
  padding: 4px;
}

.move-destination-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  user-select: none;
}

.move-destination-item:hover:not(.is-disabled) {
  background: var(--mind-bg-hover, #f1f3f5);
}

.move-destination-item.is-selected {
  background: var(--mind-bg-active, #e9ecef);
  font-weight: 500;
}

.move-destination-item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.move-dest-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.move-dest-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.move-dest-title {
  font-size: 13.5px;
  color: var(--mind-text-primary, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.move-dest-hint {
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
}

.move-dest-hint.is-warning {
  color: #d9480f;
}

.move-divider {
  height: 1px;
  background: var(--mind-border-subtle, #e9ecef);
  margin: 4px 0;
}

.move-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--mind-text-muted, #868e96);
}

.confirm-cancel-btn {
  background: transparent;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-secondary, #37352f);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.confirm-cancel-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.confirm-action-btn {
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.confirm-action-btn.is-primary {
  background: var(--mind-accent-primary, #1971c2);
  color: #ffffff;
}

.confirm-action-btn.is-primary:hover {
  background: var(--mind-accent-hover, #1864ab);
}
</style>
