<template>
  <div
    v-if="modelValue"
    class="mind-popover-backdrop"
    :style="{ zIndex }"
    data-testid="mind-popover-backdrop"
    @click.self="close"
  >
    <div
      ref="cardRef"
      class="mind-popover-card"
      :class="[`is-direction-${placementDirection}`]"
      :style="cardStyle"
      role="dialog"
      tabindex="-1"
      v-bind="$attrs"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDismissiblePopover } from '../../composables/useDismissiblePopover';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    width?: string;
    maxHeight?: string;
    padding?: string;
    zIndex?: number;
    placementDirection?: 'down' | 'up';
  }>(),
  {
    width: '260px',
    padding: '6px',
    zIndex: 9999,
    placementDirection: 'down',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const cardRef = ref<HTMLElement | null>(null);

function close(): void {
  emit('update:modelValue', false);
}

useDismissiblePopover({
  isOpen: () => props.modelValue,
  onClose: close,
});

const cardStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    width: props.width,
    padding: props.padding,
  };
  if (props.maxHeight) style.maxHeight = props.maxHeight;
  if (props.top !== undefined) style.top = `${props.top}px`;
  if (props.bottom !== undefined) style.bottom = `${props.bottom}px`;
  if (props.left !== undefined) style.left = `${props.left}px`;
  if (props.right !== undefined) style.right = `${props.right}px`;
  return style;
});
</script>

<style scoped>
.mind-popover-backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
}

.mind-popover-card {
  position: fixed;
  max-width: calc(100vw - 24px);
  background: var(--mind-bg-surface, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  font-family: inherit;
}

.mind-popover-card.is-direction-down {
  animation: mindPopoverDown 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}

.mind-popover-card.is-direction-up {
  animation: mindPopoverUp 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes mindPopoverDown {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mindPopoverUp {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
