<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Flame,
  SmilePlus,
} from 'lucide-vue-next';
import type { CalloutType } from '../types.js';
import { normalizeCalloutType } from '../extensions/callout-node.js';
import {
  getBlockColorDisplayHex,
  normalizeBlockColorValue,
} from '../extensions/block-color.js';
import {
  NO_CALLOUT_ICON_VALUE,
  resolveLucideIconComponent,
} from '../extensions/callout-icons.js';
import MindIconPicker from './MindIconPicker.vue';

interface CalloutBlockProps {
  node: {
    attrs: {
      type?: string;
      icon?: string | null;
      [key: string]: unknown;
    };
  };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  deleteNode?: () => void;
  editor?: unknown;
  extension?: unknown;
  getPos?: () => number;
}

const props = withDefaults(defineProps<CalloutBlockProps>(), {
  deleteNode: undefined,
  editor: undefined,
  extension: undefined,
  getPos: undefined,
});

const isDropdownOpen = ref(false);
const anchorRef = ref<HTMLElement | null>(null);

const currentType = computed<CalloutType>(() => {
  return normalizeCalloutType(props.node.attrs.type as string | undefined);
});

const rawIcon = computed<string | null>(() => {
  const val = props.node.attrs.icon;
  return typeof val === 'string' && val.length > 0 ? val : null;
});

const isIconHidden = computed(() => rawIcon.value === NO_CALLOUT_ICON_VALUE);

const lucideIconComponent = computed(() => resolveLucideIconComponent(rawIcon.value));

const emojiIcon = computed<string | null>(() => {
  if (isIconHidden.value || lucideIconComponent.value) return null;
  if (rawIcon.value) return rawIcon.value;
  return currentType.value === 'note' ? '💡' : null;
});

const calloutConfig = computed(() => {
  switch (currentType.value) {
    case 'tip':
      return {
        label: 'Dica',
        bg: '#ebfbee',
        border: '#d3f9d8',
        accent: '#2b8a3e',
        iconComponent: Lightbulb,
      };
    case 'important':
      return {
        label: 'Importante',
        bg: '#fff4e6',
        border: '#ffe8cc',
        accent: '#d9480f',
        iconComponent: Flame,
      };
    case 'warning':
      return {
        label: 'Aviso',
        bg: '#fff9db',
        border: '#ffec99',
        accent: '#e67700',
        iconComponent: AlertTriangle,
      };
    case 'caution':
      return {
        label: 'Cuidado',
        bg: '#fff5f5',
        border: '#ffc9c9',
        accent: '#c92a2a',
        iconComponent: AlertOctagon,
      };
    case 'note':
    default:
      return {
        label: 'Frase de destaque',
        bg: '#f8f9fa',
        border: '#e9ecef',
        accent: '#495057',
        iconComponent: Info,
      };
  }
});

const customTextColor = computed(() => normalizeBlockColorValue(props.node.attrs.blockTextColor));
const customBgColor = computed(() => normalizeBlockColorValue(props.node.attrs.blockBackgroundColor));

const wrapperStyle = computed(() => {
  const bg = customBgColor.value
    ? getBlockColorDisplayHex(customBgColor.value, 'bg')
    : calloutConfig.value.bg;
  const color = customTextColor.value
    ? getBlockColorDisplayHex(customTextColor.value, 'text')
    : undefined;
  return {
    backgroundColor: bg,
    borderColor: customBgColor.value ? 'rgba(0, 0, 0, 0.06)' : calloutConfig.value.border,
    ...(color ? { color } : {}),
  };
});

function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function selectType(type: CalloutType): void {
  props.updateAttributes({ type });
  isDropdownOpen.value = false;
}

function selectIcon(value: string): void {
  props.updateAttributes({ icon: value });
  isDropdownOpen.value = false;
}

function removeIcon(): void {
  props.updateAttributes({ icon: NO_CALLOUT_ICON_VALUE });
  isDropdownOpen.value = false;
}

function handleWindowClick(event: MouseEvent): void {
  if (!isDropdownOpen.value || !anchorRef.value) return;
  const target = event.target instanceof Node ? event.target : null;
  if (target && !anchorRef.value.contains(target)) {
    isDropdownOpen.value = false;
  }
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isDropdownOpen.value) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', handleWindowClick);
  window.addEventListener('keydown', handleWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleWindowClick);
  window.removeEventListener('keydown', handleWindowKeydown);
});
</script>

<template>
  <NodeViewWrapper
    class="mind-callout-wrapper"
    :class="{ 'is-icon-hidden': isIconHidden }"
    :data-callout-type="currentType"
    :data-callout-icon="rawIcon || undefined"
    :data-block-color="customTextColor || undefined"
    :data-block-bg="customBgColor || undefined"
    :style="wrapperStyle"
  >
    <div
      ref="anchorRef"
      class="mind-callout-icon-anchor"
      contenteditable="false"
    >
      <button
        type="button"
        class="mind-callout-type-btn"
        :class="{ 'is-placeholder-trigger': isIconHidden }"
        :style="{ color: calloutConfig.accent }"
        data-testid="callout-type-btn"
        :title="isIconHidden ? 'Adicionar ícone' : 'Alterar ícone ou estilo'"
        :aria-label="calloutConfig.label"
        @click.stop="toggleDropdown"
      >
        <component
          :is="lucideIconComponent"
          v-if="lucideIconComponent"
          class="mind-callout-icon"
        />
        <span
          v-else-if="emojiIcon"
          class="mind-callout-emoji"
        >
          {{ emojiIcon }}
        </span>
        <SmilePlus
          v-else-if="isIconHidden"
          class="mind-callout-icon is-ghost-icon"
        />
        <component
          :is="calloutConfig.iconComponent"
          v-else
          class="mind-callout-icon"
        />
      </button>

      <!-- Notion-style Robust Emoji & Icon Picker Popover -->
      <div
        v-if="isDropdownOpen"
        class="mind-callout-dropdown"
        data-testid="callout-dropdown"
      >
        <MindIconPicker
          :model-value="isIconHidden ? null : rawIcon ?? emojiIcon"
          :callout-type="currentType"
          :show-callout-tone="true"
          :allow-remove="!isIconHidden"
          @select="selectIcon"
          @remove="removeIcon"
          @select-type="selectType"
        />
      </div>
    </div>

    <!-- Conteúdo Editável da Frase de Destaque -->
    <NodeViewContent
      class="mind-callout-content"
      data-testid="callout-content"
    />
  </NodeViewWrapper>
</template>

<style scoped>
.mind-callout-wrapper {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
  border-width: 1px;
  border-style: solid;
  border-radius: 8px;
  padding: 12px 14px;
  margin: 0 -10px;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.mind-callout-icon-anchor {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  margin-top: 1px;
  user-select: none;
}

.mind-callout-type-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  padding: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease, opacity 0.12s ease;
}

.mind-callout-type-btn:hover {
  background-color: rgba(0, 0, 0, 0.06);
}

.mind-callout-wrapper.is-icon-hidden .mind-callout-type-btn.is-placeholder-trigger {
  opacity: 0;
  width: 20px;
}

.mind-callout-wrapper.is-icon-hidden:hover .mind-callout-type-btn.is-placeholder-trigger,
.mind-callout-type-btn.is-placeholder-trigger:focus-visible {
  opacity: 0.7;
  width: 24px;
}

.mind-callout-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.mind-callout-icon.is-ghost-icon {
  width: 15px;
  height: 15px;
  color: #868e96;
}

.mind-callout-emoji {
  font-size: 18px;
  line-height: 1;
}

.mind-callout-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 70;
}

.mind-callout-content {
  flex: 1 1 auto;
  min-width: 0;
  line-height: 1.6;
  font-size: 15px;
}

:deep(.mind-callout-content > p) {
  margin: 0;
  padding: 0;
}

:deep(.mind-callout-content > p + p) {
  margin-top: 6px;
}
</style>
