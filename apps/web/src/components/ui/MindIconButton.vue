<template>
  <button
    type="button"
    class="mind-icon-btn"
    :class="[
      `mind-icon-btn--${variant}`,
      { 'is-active': active, 'is-disabled': disabled }
    ]"
    :disabled="disabled"
    :title="tooltipText"
    :aria-label="label"
    @click="handleClick"
  >
    <component :is="icon" class="mind-icon-svg" :size="size" :stroke-width="strokeWidth" />
    <span v-if="text" class="mind-icon-btn-text">{{ text }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    icon: Component;
    label: string;
    text?: string;
    shortcut?: string;
    disabled?: boolean;
    active?: boolean;
    variant?: 'default' | 'ghost' | 'danger';
    size?: number;
    strokeWidth?: number;
  }>(),
  {
    text: '',
    shortcut: '',
    disabled: false,
    active: false,
    variant: 'default',
    size: 16,
    strokeWidth: 1.75,
  },
);

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const tooltipText = computed(() => {
  if (props.shortcut) {
    return `${props.label} (${props.shortcut})`;
  }
  return props.label;
});

function handleClick(e: MouseEvent): void {
  if (!props.disabled) {
    emit('click', e);
  }
}
</script>

<style scoped>
.mind-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--mind-text-secondary);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  white-space: nowrap;
}

.mind-icon-btn:hover:not(.is-disabled) {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.mind-icon-btn:active:not(.is-disabled) {
  background: var(--mind-bg-active);
}

.mind-icon-btn.is-active {
  background: var(--mind-bg-active);
  color: var(--mind-text-primary);
  border-color: var(--mind-border-subtle);
}

.mind-icon-btn--danger {
  color: #c92a2a;
}

.mind-icon-btn--danger:hover:not(.is-disabled) {
  background: #fff5f5;
  color: #c92a2a;
}

.mind-icon-btn.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mind-icon-svg {
  flex-shrink: 0;
}

.mind-icon-btn-text {
  font-size: 13px;
}
</style>
