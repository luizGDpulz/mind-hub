<template>
  <Teleport to="body">
    <Transition name="mind-modal-fade">
      <div
        v-if="modelValue"
        class="mind-modal-backdrop"
        tabindex="-1"
        data-testid="mind-modal-backdrop"
        @click="handleBackdropClick"
        @keydown.esc="handleEsc"
      >
        <div
          class="mind-modal-card"
          :style="{ maxWidth }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? 'mind-modal-title' : undefined"
          data-testid="mind-modal-card"
          @click.stop
        >
          <!-- Header -->
          <div class="mind-modal-header" data-testid="mind-modal-header">
            <slot name="header">
              <div class="mind-modal-titles">
                <h3 v-if="title" id="mind-modal-title" class="mind-modal-title">
                  {{ title }}
                </h3>
                <p v-if="subtitle" class="mind-modal-subtitle">
                  {{ subtitle }}
                </p>
              </div>
            </slot>
            <button
              type="button"
              class="mind-modal-close-btn"
              aria-label="Fechar modal"
              title="Fechar (Esc)"
              data-testid="modal-close-btn"
              @click="close"
            >
              ✕
            </button>
          </div>

          <!-- Body -->
          <div class="mind-modal-body" data-testid="mind-modal-body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="mind-modal-footer" data-testid="mind-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    subtitle?: string;
    maxWidth?: string;
    closeOnEsc?: boolean;
    closeOnBackdrop?: boolean;
  }>(),
  {
    title: '',
    subtitle: '',
    maxWidth: '540px',
    closeOnEsc: true,
    closeOnBackdrop: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

function close(): void {
  emit('update:modelValue', false);
  emit('close');
}

function handleBackdropClick(): void {
  if (props.closeOnBackdrop) {
    close();
  }
}

function handleEsc(e: KeyboardEvent): void {
  if (props.closeOnEsc && e.key === 'Escape') {
    close();
  }
}

function handleGlobalKeydown(e: KeyboardEvent): void {
  if (props.modelValue && props.closeOnEsc && e.key === 'Escape') {
    close();
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      document.addEventListener('keydown', handleGlobalKeydown);
    } else {
      document.removeEventListener('keydown', handleGlobalKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
.mind-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(2px);
}

.mind-modal-card {
  width: 100%;
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  overflow: hidden;
  animation: mind-card-pop 0.14s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes mind-card-pop {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.mind-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px 20px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-canvas, #ffffff);
}

.mind-modal-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mind-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
  line-height: 1.35;
}

.mind-modal-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--mind-text-muted, #868e96);
  line-height: 1.4;
}

.mind-modal-close-btn {
  background: transparent;
  border: none;
  padding: 4px 8px;
  margin-left: 12px;
  font-size: 14px;
  color: var(--mind-text-muted, #868e96);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
  line-height: 1;
}

.mind-modal-close-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.mind-modal-body {
  padding: 20px;
  overflow-y: auto;
  color: var(--mind-text-primary, #111827);
  font-size: 14px;
}

.mind-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-sidebar, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

/* Transitions */
.mind-modal-fade-enter-active,
.mind-modal-fade-leave-active {
  transition: opacity 0.14s ease;
}

.mind-modal-fade-enter-from,
.mind-modal-fade-leave-to {
  opacity: 0;
}
</style>
