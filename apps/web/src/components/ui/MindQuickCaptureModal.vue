<template>
  <MindModal
    :model-value="modelValue"
    title="Captura Rápida para o Inbox"
    subtitle="Despeje ideias, anotações ou tarefas sem fricção"
    max-width="480px"
    data-testid="quick-capture-modal"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <div class="quick-capture-form">
      <input
        ref="inputRef"
        v-model="text"
        type="text"
        placeholder="Digite um pensamento, comando ou tarefa rápida..."
        class="quick-capture-input"
        data-testid="quick-insight-input"
        @keyup.enter="handleSubmit"
      />

      <!-- Quick Tag Chips -->
      <div class="quick-tag-selector">
        <span class="quick-tag-label">Tags:</span>
        <button
          v-for="tag in availableTags"
          :key="tag"
          type="button"
          class="quick-tag-pill"
          :class="{ 'is-selected': selectedTag === tag }"
          :data-testid="`quick-tag-${tag}`"
          @click="selectedTag = selectedTag === tag ? '' : tag"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="confirm-cancel-btn"
        data-testid="quick-insight-cancel"
        @click="handleClose"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="confirm-action-btn is-primary"
        :disabled="!text.trim()"
        data-testid="quick-insight-submit"
        @click="handleSubmit"
      >
        Salvar no Inbox
      </button>
    </template>
  </MindModal>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import MindModal from './MindModal.vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', text: string, tags: string[]): void;
  (e: 'close'): void;
}>();

const text = ref('');
const selectedTag = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const availableTags = ['ideia', 'tarefa', 'estudo', 'reuniao'];

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      text.value = '';
      selectedTag.value = '';
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  },
  { immediate: true },
);

function handleSubmit(): void {
  const trimmed = text.value.trim();
  if (!trimmed) return;
  const tags = selectedTag.value ? [selectedTag.value] : [];
  emit('submit', trimmed, tags);
  handleClose();
}

function handleClose(): void {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<style scoped>
.quick-capture-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.quick-capture-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  font-size: 14px;
  color: var(--mind-text-primary, #111827);
  outline: none;
  transition: all 0.12s ease;
}

.quick-capture-input:focus {
  border-color: var(--mind-accent-primary, #1971c2);
  background: #ffffff;
}

.quick-tag-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-tag-label {
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

.quick-tag-pill {
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  color: var(--mind-text-secondary, #37352f);
  font-size: 11.5px;
  padding: 3px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.quick-tag-pill:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.quick-tag-pill.is-selected {
  background: #e7f5ff;
  border-color: #a5d8ff;
  color: var(--mind-accent-primary, #1971c2);
  font-weight: 500;
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

.confirm-action-btn.is-primary:hover:not(:disabled) {
  background: var(--mind-accent-hover, #1864ab);
}

.confirm-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
