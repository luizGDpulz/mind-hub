<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      ref="dropdownRef"
      class="mind-dropdown-menu"
      :style="menuStyle"
      role="menu"
      tabindex="-1"
      data-testid="mind-dropdown"
      @click.stop
      @keydown.esc="handleClose"
      @keydown.down.prevent="navigateNext"
      @keydown.up.prevent="navigatePrev"
      @keydown.enter.prevent="selectFocused"
    >
      <!-- Optional Header Slot / Title -->
      <div v-if="$slots.header || title" class="mind-dropdown-header-box">
        <slot name="header">
          <div class="mind-dropdown-title">
            {{ title }}
          </div>
        </slot>
      </div>

      <div class="mind-dropdown-items-list">
        <template v-for="(sectionKey, sIdx) in sectionKeys" :key="sectionKey">
          <div v-if="sIdx > 0 && sections[sectionKey]?.length" class="mind-dropdown-divider" />

          <div
            v-for="(item, idx) in sections[sectionKey]"
            :key="item.id"
            class="mind-dropdown-item"
            :class="{
              'is-danger': item.danger,
              'is-disabled': item.disabled,
              'is-focused': focusedIndex === getItemFlatIndex(sectionKey, idx),
            }"
            :data-testid="item.testId || `${itemTestIdPrefix}-${item.id}`"
            role="menuitem"
            @mouseenter="focusedIndex = getItemFlatIndex(sectionKey, idx)"
            @click="handleItemClick(item)"
          >
            <div class="dropdown-item-left">
              <component
                :is="item.icon"
                v-if="item.icon"
                class="dropdown-item-icon"
                :size="15"
                :stroke-width="1.75"
              />
              <span class="dropdown-item-label">{{ item.label }}</span>
            </div>

            <div v-if="item.shortcut" class="dropdown-item-right">
              <span class="dropdown-shortcut-badge">{{ item.shortcut }}</span>
            </div>
          </div>
        </template>

        <slot />
      </div>

      <!-- Optional Footer Slot (e.g. Notion-like last edited audit) -->
      <div v-if="$slots.footer" class="mind-dropdown-footer-box">
        <div class="mind-dropdown-divider" />
        <slot name="footer" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { DropdownMenuItem } from './types.js';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    items?: DropdownMenuItem[];
    x?: number;
    y?: number;
    width?: string;
    title?: string;
    itemTestIdPrefix?: string;
  }>(),
  {
    items: () => [],
    x: 0,
    y: 0,
    width: '260px',
    title: '',
    itemTestIdPrefix: 'dropdown-item',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select', item: DropdownMenuItem): void;
  (e: 'close'): void;
}>();

const dropdownRef = ref<HTMLDivElement | null>(null);
const focusedIndex = ref<number>(-1);
const adjustedX = ref(props.x);
const adjustedY = ref(props.y);

const sections = computed(() => {
  const result: Record<string, DropdownMenuItem[]> = {
    default: [],
  };

  for (const item of props.items) {
    const key = item.section || 'default';
    if (!result[key]) {
      result[key] = [];
    }
    result[key]?.push(item);
  }

  return result;
});

const sectionKeys = computed(() => Object.keys(sections.value));

const flatItems = computed(() => {
  const list: DropdownMenuItem[] = [];
  for (const key of sectionKeys.value) {
    const items = sections.value[key];
    if (items) list.push(...items);
  }
  return list;
});

function getItemFlatIndex(sectionKey: string, itemIdx: number): number {
  let count = 0;
  for (const key of sectionKeys.value) {
    if (key === sectionKey) {
      return count + itemIdx;
    }
    count += sections.value[key]?.length || 0;
  }
  return itemIdx;
}

const menuStyle = computed(() => {
  return {
    top: `${adjustedY.value}px`,
    left: `${adjustedX.value}px`,
    width: props.width,
  };
});

function calculatePosition(): void {
  const el = dropdownRef.value;
  let posX = props.x;
  let posY = props.y;

  if (el) {
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    if (posX + rect.width > viewportW - 12) {
      posX = Math.max(12, viewportW - rect.width - 12);
    }
    if (posY + rect.height > viewportH - 12) {
      posY = Math.max(12, viewportH - rect.height - 12);
    }
  }

  adjustedX.value = posX;
  adjustedY.value = posY;
}

function handleClose(): void {
  emit('update:modelValue', false);
  emit('close');
}

function handleItemClick(item: DropdownMenuItem): void {
  if (item.disabled) return;
  if (item.handler) item.handler();
  emit('select', item);
  handleClose();
}

function navigateNext(): void {
  if (flatItems.value.length === 0) return;
  focusedIndex.value = (focusedIndex.value + 1) % flatItems.value.length;
}

function navigatePrev(): void {
  if (flatItems.value.length === 0) return;
  focusedIndex.value = (focusedIndex.value - 1 + flatItems.value.length) % flatItems.value.length;
}

function selectFocused(): void {
  if (focusedIndex.value >= 0 && focusedIndex.value < flatItems.value.length) {
    const item = flatItems.value[focusedIndex.value];
    if (item && !item.disabled) {
      handleItemClick(item);
    }
  }
}

function handleDocumentClick(e: MouseEvent): void {
  const el = dropdownRef.value;
  if (el && !el.contains(e.target as Node)) {
    handleClose();
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      focusedIndex.value = -1;
      adjustedX.value = props.x;
      adjustedY.value = props.y;
      nextTick(() => {
        calculatePosition();
        dropdownRef.value?.focus();
        document.addEventListener('click', handleDocumentClick);
      });
    } else {
      document.removeEventListener('click', handleDocumentClick);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.mind-dropdown-menu {
  position: fixed;
  z-index: 10000;
  min-width: 250px;
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.09), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 4px;
  outline: none;
  font-family: inherit;
  animation: mind-dropdown-pop 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

@keyframes mind-dropdown-pop {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(-3px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.mind-dropdown-header-box {
  padding: 2px 4px 4px 4px;
}

.mind-dropdown-title {
  padding: 4px 8px 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--mind-text-muted, #868e96);
  user-select: none;
  display: block;
  letter-spacing: -0.1px;
}

.mind-dropdown-divider {
  height: 1px;
  background-color: var(--mind-border-subtle, #e9ecef);
  margin: 4px 0;
}

.mind-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 8px;
  margin: 1px 0;
  border-radius: 4px;
  font-size: 13.5px;
  color: var(--mind-text-secondary, #37352f);
  cursor: pointer;
  transition: background-color 0.08s ease, color 0.08s ease;
  user-select: none;
  line-height: 1;
}

.mind-dropdown-item:hover,
.mind-dropdown-item.is-focused {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.dropdown-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.dropdown-item-icon {
  color: var(--mind-text-muted, #787774);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mind-dropdown-item:hover .dropdown-item-icon,
.mind-dropdown-item.is-focused .dropdown-item-icon {
  color: var(--mind-text-primary, #111827);
}

.dropdown-item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13.5px;
  font-weight: 400;
}

.dropdown-item-right {
  display: flex;
  align-items: center;
  margin-left: auto;
  padding-left: 12px;
  flex-shrink: 0;
}

.dropdown-shortcut-badge {
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  background: transparent;
  padding: 0;
  border: none;
}

.mind-dropdown-item:hover .dropdown-shortcut-badge,
.mind-dropdown-item.is-focused .dropdown-shortcut-badge {
  color: var(--mind-text-secondary, #37352f);
}

.mind-dropdown-item.is-danger {
  color: var(--mind-text-secondary, #37352f);
}

.mind-dropdown-item.is-danger .dropdown-item-icon {
  color: var(--mind-text-muted, #787774);
}

.mind-dropdown-item.is-danger:hover,
.mind-dropdown-item.is-danger.is-focused {
  background: #fff5f5;
  color: #c92a2a;
}

.mind-dropdown-item.is-danger:hover .dropdown-item-icon,
.mind-dropdown-item.is-danger.is-focused .dropdown-item-icon {
  color: #c92a2a;
}

.mind-dropdown-item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.mind-dropdown-footer-box {
  margin-top: 2px;
}
</style>
