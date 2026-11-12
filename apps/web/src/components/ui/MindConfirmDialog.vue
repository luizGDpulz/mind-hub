<template>
  <MindModal
    :model-value="modelValue"
    :title="title"
    max-width="440px"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleCancel"
  >
    <div class="confirm-dialog-content" data-testid="confirm-dialog-content">
      <div v-if="danger" class="confirm-icon-box is-danger">
        <component :is="AlertTriangle" :size="20" />
      </div>
      <div v-else class="confirm-icon-box is-info">
        <component :is="Info" :size="20" />
      </div>

      <div class="confirm-text-area">
        <div class="confirm-message">{{ message }}</div>
        <slot />
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="confirm-cancel-btn"
        :data-testid="cancelTestId"
        @click="handleCancel"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="confirm-action-btn"
        :class="{ 'is-danger': danger, 'is-primary': !danger }"
        :data-testid="confirmTestId"
        @click="handleConfirm"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </MindModal>
</template>

<script setup lang="ts">
import { AlertTriangle, Info } from 'lucide-vue-next';
import MindModal from './MindModal.vue';

withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    confirmTestId?: string;
    cancelTestId?: string;
  }>(),
  {
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    danger: true,
    confirmTestId: 'confirm-dialog-btn',
    cancelTestId: 'cancel-dialog-btn',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function handleConfirm(): void {
  emit('confirm');
  emit('update:modelValue', false);
}

function handleCancel(): void {
  emit('cancel');
  emit('update:modelValue', false);
}
</script>

<style scoped>
.confirm-dialog-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.confirm-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.confirm-icon-box.is-danger {
  background: #fff5f5;
  color: #c92a2a;
  border: 1px solid #ffc9c9;
}

.confirm-icon-box.is-info {
  background: #e7f5ff;
  color: var(--mind-accent-primary, #1971c2);
  border: 1px solid #a5d8ff;
}

.confirm-text-area {
  flex: 1;
}

.confirm-message {
  font-size: 14px;
  color: var(--mind-text-secondary, #37352f);
  line-height: 1.5;
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

.confirm-action-btn.is-danger {
  background: #c92a2a;
  color: #ffffff;
}

.confirm-action-btn.is-danger:hover {
  background: #b02525;
}

.confirm-action-btn.is-primary {
  background: var(--mind-accent-primary, #1971c2);
  color: #ffffff;
}

.confirm-action-btn.is-primary:hover {
  background: var(--mind-accent-hover, #1864ab);
}
</style>
