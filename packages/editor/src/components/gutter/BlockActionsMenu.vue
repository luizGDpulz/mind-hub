<template>
  <div
    ref="popoverRef"
    class="block-actions-popover"
    :class="{ 'is-flipped-right': popoverFlipRight }"
    :style="popoverPositionStyle"
    data-testid="block-actions-popover"
    @keydown.esc.stop="emit('close')"
  >
    <!-- Search Bar -->
    <div class="popover-search-wrap">
      <Search :size="13" class="popover-search-icon" />
      <input
        ref="searchInputRef"
        v-model="actionQuery"
        type="text"
        class="popover-search-input"
        data-testid="block-menu-search-input"
        placeholder="Pesquisar ações..."
      />
    </div>

    <!-- Flat Filtered Search Mode -->
    <div v-if="isFiltering" class="popover-search-results" data-testid="block-menu-search-results">
      <div v-if="filteredEntries.length === 0" class="popover-empty-search">
        Nenhuma ação encontrada
      </div>
      <button
        v-for="entry in filteredEntries"
        :key="entry.key"
        type="button"
        class="popover-item"
        :class="{ 'is-danger': entry.danger }"
        :data-testid="entry.testId"
        @click="entry.run()"
      >
        <span
          v-if="entry.kind === 'textColor'"
          class="color-swatch-letter"
          :style="{ color: entry.swatchText }"
        >
          A
        </span>
        <span
          v-else-if="entry.kind === 'bgColor'"
          class="color-swatch-bg"
          :style="{
            backgroundColor: entry.swatchBg === 'transparent' ? '#ffffff' : entry.swatchBg,
            color: '#37352f',
          }"
        >
          A
        </span>
        <component :is="entry.icon" v-else :size="14" class="item-icon" />
        <span class="item-label">{{ entry.label }}</span>
        <Check v-if="entry.active" :size="13" class="item-check" />
        <span v-else-if="entry.shortcut" class="shortcut">{{ entry.shortcut }}</span>
      </button>
    </div>

    <!-- Standard Cascading Menu Mode -->
    <template v-else>
      <div class="popover-section">
        <div class="section-title">{{ menuSectionTitle }}</div>

        <!-- Transformar em > -->
        <div
          class="popover-submenu-anchor"
          @mouseenter="openSubmenu('turnInto')"
        >
          <button
            type="button"
            class="popover-item"
            :class="{ 'is-active': activeSubmenu === 'turnInto' }"
            data-testid="menu-trigger-turn-into"
            @mouseenter="openSubmenu('turnInto')"
            @click="toggleSubmenu('turnInto')"
          >
            <Repeat2 :size="14" class="item-icon" />
            <span class="item-label">Transformar em</span>
            <ChevronRight :size="13" class="chevron-right" />
          </button>

          <div
            v-if="activeSubmenu === 'turnInto'"
            class="popover-submenu popover-submenu-turn-into"
            data-testid="submenu-turn-into"
          >
            <div class="section-title">Transformar em</div>
            <button
              v-for="item in visibleTurnIntoOptions"
              :key="item.type"
              type="button"
              class="popover-item"
              :class="{ 'is-active': isCurrentBlockType(item.type) }"
              :data-testid="`turn-into-${item.type}`"
              @click="emit('turnInto', item.type)"
            >
              <component :is="item.icon" :size="14" class="item-icon" />
              <span class="item-label">{{ item.label }}</span>
              <Check v-if="isCurrentBlockType(item.type)" :size="13" class="item-check" />
            </button>
          </div>
        </div>

        <!-- Cor > -->
        <BlockColorSubmenu
          :active="activeSubmenu === 'color'"
          :normalized-text-color="normalizedTextColor"
          :normalized-bg-color="normalizedBgColor"
          :last-used-text-color="lastUsedTextColor"
          :last-used-bg-color="lastUsedBgColor"
          @open="openSubmenu('color')"
          @toggle="toggleSubmenu('color')"
          @select-color="emit('setColor', $event)"
        />
      </div>

      <div class="popover-divider" />

      <!-- Reorder & Block Actions -->
      <div class="popover-section">
        <button
          type="button"
          class="popover-item"
          data-testid="action-duplicate"
          @mouseenter="activeSubmenu = null"
          @click="emit('action', 'duplicate')"
        >
          <Copy :size="14" class="item-icon" />
          <span class="item-label">Duplicar</span>
          <span class="shortcut">Ctrl+D</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="action-move-up"
          @mouseenter="activeSubmenu = null"
          @click="emit('action', 'moveUp')"
        >
          <ArrowUp :size="14" class="item-icon" />
          <span class="item-label">Mover para cima</span>
          <span class="shortcut">Alt+↑</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="action-move-down"
          @mouseenter="activeSubmenu = null"
          @click="emit('action', 'moveDown')"
        >
          <ArrowDown :size="14" class="item-icon" />
          <span class="item-label">Mover para baixo</span>
          <span class="shortcut">Alt+↓</span>
        </button>
      </div>

      <div class="popover-divider" />

      <div class="popover-section">
        <button
          type="button"
          class="popover-item is-danger"
          data-testid="action-delete"
          @mouseenter="activeSubmenu = null"
          @click="emit('action', 'delete')"
        >
          <Trash2 :size="14" class="item-icon" />
          <span class="item-label">{{ deleteActionLabel }}</span>
          <span class="shortcut">Del</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted } from 'vue';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Repeat2,
  ChevronRight,
  Check,
  Search,
} from 'lucide-vue-next';
import BlockColorSubmenu from './BlockColorSubmenu.vue';
import type { BlockColorId, BlockColorUpdate } from '../../types.js';
import { normalizeBlockColorValue } from '../../extensions/block-color.js';
import {
  BLOCK_TURN_INTO_OPTIONS,
  buildFilteredActionEntries,
  isGutterCurrentBlockType,
  type FilteredActionEntry,
  type GutterActionType,
  type GutterSubmenuName,
} from './gutter-helpers.js';

const props = withDefaults(
  defineProps<{
    nodeType?: string;
    nodeTextColor?: string | null;
    nodeBgColor?: string | null;
    basicBlocksOnly?: boolean;
    selectedCount?: number;
    lastUsedTextColor?: string | null;
    lastUsedBgColor?: string | null;
  }>(),
  {
    nodeType: 'paragraph',
    nodeTextColor: null,
    nodeBgColor: null,
    basicBlocksOnly: false,
    selectedCount: 0,
    lastUsedTextColor: null,
    lastUsedBgColor: null,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: GutterActionType): void;
  (e: 'turnInto', type: string): void;
  (e: 'setColor', payload: BlockColorUpdate): void;
}>();

const activeSubmenu = ref<GutterSubmenuName>(null);
const actionQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const popoverFlipRight = ref(false);
const popoverOffsetY = ref(-42);

const popoverPositionStyle = computed(() => ({
  top: `${popoverOffsetY.value}px`,
}));

const menuSectionTitle = computed(() =>
  props.selectedCount > 1 ? `${props.selectedCount} blocos selecionados` : 'Bloco'
);

const deleteActionLabel = computed(() =>
  props.selectedCount > 1 ? `Excluir ${props.selectedCount} blocos` : 'Excluir bloco'
);

const visibleTurnIntoOptions = computed(() =>
  props.basicBlocksOnly
    ? BLOCK_TURN_INTO_OPTIONS.filter((opt) => opt.type !== 'mermaid')
    : BLOCK_TURN_INTO_OPTIONS
);

const normalizedTextColor = computed(() => normalizeBlockColorValue(props.nodeTextColor));
const normalizedBgColor = computed(() => normalizeBlockColorValue(props.nodeBgColor));
const isFiltering = computed(() => actionQuery.value.trim().length > 0);

const filteredEntries = computed<FilteredActionEntry[]>(() => {
  const q = actionQuery.value.trim().toLowerCase();
  if (!q) return [];

  const entries = buildFilteredActionEntries({
    visibleTurnIntoOptions: visibleTurnIntoOptions.value,
    isCurrentBlockType,
    isTextColorActive,
    isBgColorActive,
    deleteActionLabel: deleteActionLabel.value,
    onTurnInto: (type) => emit('turnInto', type),
    onSetColor: (payload) => emit('setColor', payload),
    onAction: (action) => emit('action', action),
  });

  return entries.filter((item) => item.searchTokens.includes(q));
});

function isCurrentBlockType(type: string): boolean {
  return isGutterCurrentBlockType(props.nodeType, type);
}

function isTextColorActive(id: BlockColorId): boolean {
  return (normalizedTextColor.value ?? 'default') === id;
}

function isBgColorActive(id: BlockColorId): boolean {
  return (normalizedBgColor.value ?? 'default') === id;
}

function openSubmenu(name: 'turnInto' | 'color') {
  activeSubmenu.value = name;
}

function toggleSubmenu(name: 'turnInto' | 'color') {
  activeSubmenu.value = activeSubmenu.value === name ? null : name;
}

function adjustPopoverViewportBounds() {
  const el = popoverRef.value;
  if (!el || typeof window === 'undefined') return;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  if (rect.left < 8) {
    popoverFlipRight.value = true;
  }

  let nextTop = popoverOffsetY.value;
  if (rect.bottom > window.innerHeight - 12) {
    nextTop -= rect.bottom - (window.innerHeight - 12);
  }
  if (rect.top + (nextTop - popoverOffsetY.value) < 12) {
    nextTop += 12 - (rect.top + (nextTop - popoverOffsetY.value));
  }
  popoverOffsetY.value = Math.round(nextTop);
}

onMounted(() => {
  nextTick(() => {
    adjustPopoverViewportBounds();
    searchInputRef.value?.focus();
  });
});
</script>

<style scoped src="./gutter-menu.css"></style>
