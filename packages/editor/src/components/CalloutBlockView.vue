<script setup lang="ts">
import { computed, ref } from 'vue';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Flame,
  ChevronDown,
  X,
} from 'lucide-vue-next';
import type { CalloutType } from '../types.js';
import { normalizeCalloutType } from '../extensions/callout-node.js';

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

const currentType = computed<CalloutType>(() => {
  return normalizeCalloutType(props.node.attrs.type as string | undefined);
});

const currentIcon = computed<string | null>(() => {
  return (props.node.attrs.icon as string | null) || null;
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
        label: 'Nota',
        bg: '#e7f5ff',
        border: '#d0ebff',
        accent: '#1971c2',
        iconComponent: Info,
      };
  }
});

const typesList: Array<{ type: CalloutType; label: string; icon: typeof Info }> = [
  { type: 'note', label: 'Nota', icon: Info },
  { type: 'tip', label: 'Dica', icon: Lightbulb },
  { type: 'important', label: 'Importante', icon: Flame },
  { type: 'warning', label: 'Aviso', icon: AlertTriangle },
  { type: 'caution', label: 'Cuidado', icon: AlertOctagon },
];

function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function selectType(type: CalloutType): void {
  props.updateAttributes({ type });
  isDropdownOpen.value = false;
}

function setCustomIcon(emoji: string): void {
  props.updateAttributes({ icon: emoji });
  isDropdownOpen.value = false;
}

function clearCustomIcon(): void {
  props.updateAttributes({ icon: null });
}
</script>

<template>
  <NodeViewWrapper
    class="mind-callout-wrapper"
    :data-callout-type="currentType"
    :style="{
      backgroundColor: calloutConfig.bg,
      borderColor: calloutConfig.border,
    }"
  >
    <div class="mind-callout-header">
      <div class="mind-callout-badge-container">
        <button
          type="button"
          class="mind-callout-type-btn"
          :style="{ color: calloutConfig.accent }"
          data-testid="callout-type-btn"
          title="Alterar tipo de destaque"
          @click.stop="toggleDropdown"
        >
          <span v-if="currentIcon" class="mind-callout-emoji">{{ currentIcon }}</span>
          <component
            :is="calloutConfig.iconComponent"
            v-else
            class="mind-callout-icon"
          />
          <span class="mind-callout-label">{{ calloutConfig.label }}</span>
          <ChevronDown class="mind-callout-chevron" />
        </button>

        <!-- Dropdown Seletor de Tipo e Ícone -->
        <div
          v-if="isDropdownOpen"
          class="mind-callout-dropdown"
          data-testid="callout-dropdown"
        >
          <div class="mind-dropdown-title">Tipo de destaque</div>
          <div class="mind-dropdown-list">
            <button
              v-for="item in typesList"
              :key="item.type"
              type="button"
              class="mind-dropdown-item"
              :class="{ 'is-active': item.type === currentType }"
              :data-testid="`callout-option-${item.type}`"
              @click="selectType(item.type)"
            >
              <component :is="item.icon" class="mind-dropdown-item-icon" />
              <span>{{ item.label }}</span>
            </button>
          </div>

          <div class="mind-dropdown-divider" />

          <div class="mind-dropdown-title">Ícone rápido</div>
          <div class="mind-emoji-row">
            <button
              v-for="emoji in ['💡', '📌', '⚠️', '🔥', '🚀', '🎯']"
              :key="emoji"
              type="button"
              class="mind-emoji-btn"
              @click="setCustomIcon(emoji)"
            >
              {{ emoji }}
            </button>
            <button
              v-if="currentIcon"
              type="button"
              class="mind-emoji-btn mind-emoji-clear"
              title="Restaurar ícone padrão"
              @click="clearCustomIcon"
            >
              <X class="mind-clear-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Conteúdo do Bloco Editável -->
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
  flex-direction: column;
  gap: 8px;
  border-width: 1px;
  border-style: solid;
  border-radius: 8px;
  padding: 12px 14px;
  margin: 14px 0;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.mind-callout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mind-callout-badge-container {
  position: relative;
  display: inline-flex;
}

.mind-callout-type-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.mind-callout-type-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.mind-callout-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.mind-callout-emoji {
  font-size: 14px;
  line-height: 1;
}

.mind-callout-chevron {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}

.mind-callout-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  width: 180px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 6px;
}

.mind-dropdown-title {
  font-size: 11px;
  font-weight: 600;
  color: #868e96;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 6px;
}

.mind-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mind-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  color: #111827;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease;
}

.mind-dropdown-item:hover,
.mind-dropdown-item.is-active {
  background-color: #f1f3f5;
}

.mind-dropdown-item-icon {
  width: 14px;
  height: 14px;
  color: #495057;
}

.mind-dropdown-divider {
  height: 1px;
  background-color: #e9ecef;
  margin: 6px 0;
}

.mind-emoji-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
}

.mind-emoji-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.mind-emoji-btn:hover {
  background-color: #f1f3f5;
}

.mind-emoji-clear {
  color: #868e96;
}

.mind-clear-icon {
  width: 14px;
  height: 14px;
}

.mind-callout-content {
  color: #111827;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.mind-callout-content p) {
  margin: 0 0 6px 0;
}

:deep(.mind-callout-content p:last-child) {
  margin-bottom: 0;
}
</style>
