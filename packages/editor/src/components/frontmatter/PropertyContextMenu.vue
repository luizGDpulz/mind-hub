<template>
  <div
    class="property-context-menu"
    data-testid="property-context-menu"
    @click.stop
  >
    <div
      class="ctx-submenu-anchor"
      @mouseenter="isTypeSubmenuOpen = true"
    >
      <button
        type="button"
        class="ctx-menu-item"
        :class="{ 'is-active': isTypeSubmenuOpen }"
        data-testid="prop-menu-type-trigger"
        @click="isTypeSubmenuOpen = !isTypeSubmenuOpen"
      >
        <Info :size="14" class="ctx-item-icon" />
        <span class="ctx-item-label">Tipo de propriedade</span>
        <ChevronRight :size="13" class="ctx-chevron" />
      </button>

      <div
        v-if="isTypeSubmenuOpen"
        class="ctx-type-submenu"
        data-testid="prop-menu-type-submenu"
      >
        <button
          v-for="opt in PROPERTY_TYPE_OPTIONS"
          :key="opt.id"
          type="button"
          class="ctx-menu-item"
          :class="{ 'is-active': isTypeSelected(opt.id) }"
          :data-testid="`prop-type-option-${opt.id}`"
          @click="emit('changeType', opt.id)"
        >
          <component :is="opt.icon" :size="14" class="ctx-item-icon" />
          <span class="ctx-item-label">{{ opt.label }}</span>
          <Check v-if="isTypeSelected(opt.id)" :size="13" class="ctx-check" />
        </button>
      </div>
    </div>

    <button
      type="button"
      class="ctx-menu-item"
      data-testid="prop-menu-cut"
      @click="emit('cut')"
    >
      <Scissors :size="14" class="ctx-item-icon" />
      <span class="ctx-item-label">Cortar</span>
    </button>

    <button
      type="button"
      class="ctx-menu-item"
      data-testid="prop-menu-copy"
      @click="emit('copy')"
    >
      <Copy :size="14" class="ctx-item-icon" />
      <span class="ctx-item-label">Copiar</span>
    </button>

    <button
      type="button"
      class="ctx-menu-item"
      :class="{ 'is-disabled': !hasClipboard }"
      :disabled="!hasClipboard"
      data-testid="prop-menu-paste"
      @click="emit('paste')"
    >
      <Clipboard :size="14" class="ctx-item-icon" />
      <span class="ctx-item-label">Colar</span>
    </button>

    <div class="ctx-divider" />

    <button
      type="button"
      class="ctx-menu-item is-danger"
      data-testid="prop-menu-remove"
      @click="emit('remove')"
    >
      <Trash2 :size="14" class="ctx-item-icon" />
      <span class="ctx-item-label">Remover</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  Info,
  Scissors,
  Trash2,
} from 'lucide-vue-next';
import type { ObsidianPropertyType } from '../../types.js';
import { PROPERTY_TYPE_OPTIONS } from './frontmatter-helpers.js';

const props = defineProps<{
  explicitType?: ObsidianPropertyType;
  hasClipboard: boolean;
}>();

const emit = defineEmits<{
  (e: 'changeType', nextType: ObsidianPropertyType): void;
  (e: 'cut'): void;
  (e: 'copy'): void;
  (e: 'paste'): void;
  (e: 'remove'): void;
}>();

const isTypeSubmenuOpen = ref(false);

function isTypeSelected(optionId: ObsidianPropertyType): boolean {
  if (!props.explicitType || props.explicitType === 'auto') {
    return optionId === 'auto';
  }
  return props.explicitType === optionId;
}
</script>

<style scoped>
.property-context-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 120;
  width: 210px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.ctx-submenu-anchor {
  position: relative;
}

.ctx-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 8px;
  border-radius: 5px;
  font-size: 12.5px;
  color: #37352f;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.ctx-menu-item:hover:not(:disabled),
.ctx-menu-item.is-active {
  background-color: #f1f3f5;
  color: #212529;
}

.ctx-menu-item.is-danger {
  color: #c92a2a;
}

.ctx-menu-item.is-danger:hover {
  background-color: #fff5f5;
  color: #c92a2a;
}

.ctx-menu-item.is-disabled,
.ctx-menu-item:disabled {
  color: #adb5bd;
  cursor: not-allowed;
}

.ctx-item-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.ctx-item-label {
  flex: 1;
}

.ctx-chevron,
.ctx-check {
  color: #868e96;
  flex-shrink: 0;
}

.ctx-divider {
  height: 1px;
  background-color: #e9ecef;
  margin: 4px 2px;
}

.ctx-type-submenu {
  position: absolute;
  left: calc(100% + 4px);
  top: -4px;
  width: 196px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
}
</style>
