<template>
  <div
    ref="menuRef"
    class="table-axis-popover"
    :class="{ 'is-submenu-left': submenuFlipLeft }"
    :style="menuStyle"
    role="menu"
    :aria-label="axis === 'row' ? 'Ações da linha da tabela' : 'Ações da coluna da tabela'"
    data-testid="table-axis-popover"
    @mousedown.stop
    @click.stop
    @keydown="handleMenuKeydown"
  >
    <!-- Search Bar -->
    <div class="popover-search-wrap">
      <input
        ref="searchInputRef"
        v-model="actionQuery"
        type="text"
        class="popover-search-input table-axis-search-input"
        data-testid="table-axis-search-input"
        placeholder="Pesquisar ações..."
      />
    </div>

    <!-- Filtered Search Mode -->
    <div v-if="isFiltering" class="popover-search-results" data-testid="table-axis-search-results">
      <div v-if="filteredEntries.length === 0" class="popover-empty-search">
        Nenhuma ação encontrada
      </div>
      <button
        v-for="entry in filteredEntries"
        :key="entry.key"
        type="button"
        role="menuitem"
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
        <span
          v-if="entry.kind === 'toggle'"
          class="mind-switch"
          :class="{ 'is-checked': entry.checked }"
        >
          <span class="mind-switch-thumb" />
        </span>
        <Check v-else-if="entry.active" :size="13" class="item-check" />
        <span v-else-if="entry.shortcut" class="shortcut">{{ entry.shortcut }}</span>
      </button>
    </div>

    <!-- Standard Menu Mode -->
    <div v-else class="popover-section">
      <!-- Header Toggle (Row 0 or Col 0) -->
      <button
        v-if="axis === 'row' && axisIndex === 0"
        type="button"
        role="menuitemcheckbox"
        :aria-checked="headerRow"
        class="popover-item"
        data-testid="table-axis-toggle-header-row"
        @mouseenter="colorSubmenuOpen = false"
        @click="emit('toggleHeaderRow')"
      >
        <PanelTop :size="14" class="item-icon" />
        <span class="item-label">Linha do cabeçalho</span>
        <span class="mind-switch" :class="{ 'is-checked': headerRow }">
          <span class="mind-switch-thumb" />
        </span>
      </button>

      <button
        v-if="axis === 'col' && axisIndex === 0"
        type="button"
        role="menuitemcheckbox"
        :aria-checked="headerColumn"
        class="popover-item"
        data-testid="table-axis-toggle-header-col"
        @mouseenter="colorSubmenuOpen = false"
        @click="emit('toggleHeaderColumn')"
      >
        <PanelLeft :size="14" class="item-icon" />
        <span class="item-label">Coluna do cabeçalho</span>
        <span class="mind-switch" :class="{ 'is-checked': headerColumn }">
          <span class="mind-switch-thumb" />
        </span>
      </button>

      <!-- Color Submenu (Text & Background for all cells in row/col) -->
      <BlockColorSubmenu
        :active="colorSubmenuOpen"
        :normalized-text-color="normalizedTextColor"
        :normalized-bg-color="normalizedBgColor"
        :last-used-text-color="lastUsedTextColor"
        :last-used-bg-color="lastUsedBgColor"
        @open="colorSubmenuOpen = true"
        @toggle="colorSubmenuOpen = !colorSubmenuOpen"
        @select-color="emit('setColor', $event)"
      />

      <!-- Insert Before / After -->
      <button
        type="button"
        role="menuitem"
        class="popover-item"
        data-testid="table-axis-insert-before"
        @mouseenter="colorSubmenuOpen = false"
        @click="emit('insertBefore')"
      >
        <component :is="axis === 'row' ? ArrowUp : ArrowLeft" :size="14" class="item-icon" />
        <span class="item-label">{{ axis === 'row' ? 'Inserir acima' : 'Inserir à esquerda' }}</span>
      </button>

      <button
        type="button"
        role="menuitem"
        class="popover-item"
        data-testid="table-axis-insert-after"
        @mouseenter="colorSubmenuOpen = false"
        @click="emit('insertAfter')"
      >
        <component :is="axis === 'row' ? ArrowDown : ArrowRight" :size="14" class="item-icon" />
        <span class="item-label">{{ axis === 'row' ? 'Inserir abaixo' : 'Inserir à direita' }}</span>
      </button>

      <!-- Duplicate -->
      <button
        type="button"
        role="menuitem"
        class="popover-item"
        data-testid="table-axis-duplicate"
        @mouseenter="colorSubmenuOpen = false"
        @click="emit('duplicate')"
      >
        <Copy :size="14" class="item-icon" />
        <span class="item-label">Duplicar</span>
        <span class="shortcut">Ctrl+D</span>
      </button>

      <!-- Clear Contents -->
      <button
        type="button"
        role="menuitem"
        class="popover-item"
        data-testid="table-axis-clear"
        @mouseenter="colorSubmenuOpen = false"
        @click="emit('clearContents')"
      >
        <CircleX :size="14" class="item-icon" />
        <span class="item-label">Apagar conteúdo</span>
      </button>

      <!-- Delete Row / Column -->
      <button
        type="button"
        role="menuitem"
        class="popover-item is-danger"
        data-testid="table-axis-delete"
        @mouseenter="colorSubmenuOpen = false"
        @click="emit('deleteAxis')"
      >
        <Trash2 :size="14" class="item-icon" />
        <span class="item-label">Excluir</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type Component } from 'vue';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CircleX,
  Copy,
  PanelLeft,
  PanelTop,
  Trash2,
} from 'lucide-vue-next';
import BlockColorSubmenu from '../gutter/BlockColorSubmenu.vue';
import {
  BLOCK_COLOR_PALETTE,
  normalizeBlockColorValue,
} from '../../extensions/block-color.js';
import type { BlockColorId, BlockColorUpdate } from '../../types.js';

const props = withDefaults(
  defineProps<{
    axis: 'row' | 'col';
    axisIndex: number;
    headerRow: boolean;
    headerColumn: boolean;
    activeTextColor?: string | null;
    activeBgColor?: string | null;
    lastUsedTextColor?: string | null;
    lastUsedBgColor?: string | null;
    top: number;
    left: number;
  }>(),
  {
    activeTextColor: null,
    activeBgColor: null,
    lastUsedTextColor: null,
    lastUsedBgColor: null,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggleHeaderRow'): void;
  (e: 'toggleHeaderColumn'): void;
  (e: 'setColor', payload: BlockColorUpdate): void;
  (e: 'insertBefore'): void;
  (e: 'insertAfter'): void;
  (e: 'duplicate'): void;
  (e: 'clearContents'): void;
  (e: 'deleteAxis'): void;
}>();

const menuRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const actionQuery = ref('');
const colorSubmenuOpen = ref(false);
const adjustedTop = ref(props.top);
const adjustedLeft = ref(props.left);
const submenuFlipLeft = ref(false);

const normalizedTextColor = computed(() => normalizeBlockColorValue(props.activeTextColor));
const normalizedBgColor = computed(() => normalizeBlockColorValue(props.activeBgColor));
const isFiltering = computed(() => actionQuery.value.trim().length > 0);

const menuStyle = computed(() => ({
  top: `${adjustedTop.value}px`,
  left: `${adjustedLeft.value}px`,
}));

interface FilteredTableEntry {
  key: string;
  kind: 'action' | 'toggle' | 'textColor' | 'bgColor';
  label: string;
  searchTokens: string;
  testId: string;
  icon?: Component;
  swatchText?: string;
  swatchBg?: string;
  shortcut?: string;
  danger?: boolean;
  active?: boolean;
  checked?: boolean;
  run: () => void;
}

const filteredEntries = computed<FilteredTableEntry[]>(() => {
  const q = actionQuery.value.trim().toLowerCase();
  if (!q) return [];

  const entries: FilteredTableEntry[] = [];

  if (props.axis === 'row' && props.axisIndex === 0) {
    entries.push({
      key: 'header-row',
      kind: 'toggle',
      label: 'Linha do cabeçalho',
      searchTokens: 'linha cabecalho header titulo',
      testId: 'table-axis-toggle-header-row',
      icon: PanelTop,
      checked: props.headerRow,
      run: () => emit('toggleHeaderRow'),
    });
  }

  if (props.axis === 'col' && props.axisIndex === 0) {
    entries.push({
      key: 'header-col',
      kind: 'toggle',
      label: 'Coluna do cabeçalho',
      searchTokens: 'coluna cabecalho header titulo',
      testId: 'table-axis-toggle-header-col',
      icon: PanelLeft,
      checked: props.headerColumn,
      run: () => emit('toggleHeaderColumn'),
    });
  }

  entries.push(
    {
      key: 'insert-before',
      kind: 'action',
      label: props.axis === 'row' ? 'Inserir acima' : 'Inserir à esquerda',
      searchTokens:
        props.axis === 'row'
          ? 'inserir acima nova linha antes'
          : 'inserir esquerda nova coluna antes',
      testId: 'table-axis-insert-before',
      icon: props.axis === 'row' ? ArrowUp : ArrowLeft,
      run: () => emit('insertBefore'),
    },
    {
      key: 'insert-after',
      kind: 'action',
      label: props.axis === 'row' ? 'Inserir abaixo' : 'Inserir à direita',
      searchTokens:
        props.axis === 'row'
          ? 'inserir abaixo nova linha depois'
          : 'inserir direita nova coluna depois',
      testId: 'table-axis-insert-after',
      icon: props.axis === 'row' ? ArrowDown : ArrowRight,
      run: () => emit('insertAfter'),
    },
    {
      key: 'duplicate',
      kind: 'action',
      label: 'Duplicar',
      searchTokens: 'duplicar copiar clonar',
      testId: 'table-axis-duplicate',
      icon: Copy,
      shortcut: 'Ctrl+D',
      run: () => emit('duplicate'),
    },
    {
      key: 'clear',
      kind: 'action',
      label: 'Apagar conteúdo',
      searchTokens: 'apagar limpar conteudo texto celulas',
      testId: 'table-axis-clear',
      icon: CircleX,
      run: () => emit('clearContents'),
    },
    {
      key: 'delete',
      kind: 'action',
      label: 'Excluir',
      searchTokens: 'excluir remover deletar',
      testId: 'table-axis-delete',
      icon: Trash2,
      danger: true,
      run: () => emit('deleteAxis'),
    },
    ...BLOCK_COLOR_PALETTE.map((c) => ({
      key: `text-${c.id}`,
      kind: 'textColor' as const,
      label: `Cor do texto: ${c.label}`,
      searchTokens: `cor texto letra escrita ${c.label} ${c.id}`.toLowerCase(),
      testId: `text-color-${c.id}`,
      swatchText: c.textColor,
      active: (normalizedTextColor.value ?? 'default') === (c.id as BlockColorId),
      run: () => emit('setColor', { textColor: c.id }),
    })),
    ...BLOCK_COLOR_PALETTE.map((c) => ({
      key: `bg-${c.id}`,
      kind: 'bgColor' as const,
      label: `Cor de fundo: ${c.label}`,
      searchTokens: `cor fundo background preenchimento destaque ${c.label} ${c.id}`.toLowerCase(),
      testId: `bg-color-${c.id}`,
      swatchBg: c.backgroundColor,
      active: (normalizedBgColor.value ?? 'default') === (c.id as BlockColorId),
      run: () => emit('setColor', { backgroundColor: c.id }),
    }))
  );

  return entries.filter((entry) => entry.searchTokens.includes(q));
});

function adjustViewportPosition() {
  const el = menuRef.value;
  if (!el || typeof window === 'undefined') return;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  let deltaX = 0;
  let deltaY = 0;

  if (rect.right > window.innerWidth - 12) {
    deltaX = window.innerWidth - 12 - rect.right;
  }
  if (rect.left + deltaX < 12) {
    deltaX += 12 - (rect.left + deltaX);
  }
  if (rect.bottom > window.innerHeight - 12) {
    deltaY = window.innerHeight - 12 - rect.bottom;
  }
  if (rect.top + deltaY < 12) {
    deltaY += 12 - (rect.top + deltaY);
  }

  adjustedLeft.value = Math.round(props.left + deltaX);
  adjustedTop.value = Math.round(props.top + deltaY);

  // Flip cascading color submenus to left when space on right is tight
  if (rect.left + deltaX + rect.width + 240 > window.innerWidth - 12) {
    submenuFlipLeft.value = true;
  }
}

function handleMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    emit('close');
    return;
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return;
  }

  const menuEl = menuRef.value;
  if (!menuEl) return;
  const items = Array.from(menuEl.querySelectorAll<HTMLButtonElement>(':scope > div > .popover-item, :scope > .popover-section > .popover-submenu-anchor > .popover-item, :scope > .popover-section > .popover-item'));
  if (items.length === 0) return;

  event.preventDefault();
  const currentIdx = items.indexOf(document.activeElement as HTMLButtonElement);
  const delta = event.key === 'ArrowDown' ? 1 : -1;
  const nextIdx =
    currentIdx < 0
      ? delta > 0
        ? 0
        : items.length - 1
      : (currentIdx + delta + items.length) % items.length;
  items[nextIdx]?.focus();
}

watch(
  () => [props.top, props.left, props.axis, props.axisIndex],
  () => {
    actionQuery.value = '';
    colorSubmenuOpen.value = false;
    adjustedTop.value = props.top;
    adjustedLeft.value = props.left;
    submenuFlipLeft.value = false;
    nextTick(() => {
      adjustViewportPosition();
      searchInputRef.value?.focus();
    });
  }
);

onMounted(() => {
  nextTick(() => {
    adjustViewportPosition();
    searchInputRef.value?.focus();
  });
});
</script>

<style scoped src="../gutter/gutter-menu.css"></style>
<style scoped>
.table-axis-popover {
  position: absolute;
  width: 236px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 6px;
  z-index: 1500;
  pointer-events: auto;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.table-axis-popover :deep(.popover-submenu) {
  z-index: 1520;
  pointer-events: auto;
}

.table-axis-search-input {
  padding-left: 10px;
  border-color: #dee2e6;
}

.table-axis-search-input:focus {
  border-color: #1971c2;
  box-shadow: 0 0 0 1px rgba(25, 113, 194, 0.16);
}

.table-axis-popover.is-submenu-left :deep(.popover-submenu) {
  left: auto;
  right: calc(100% + 6px);
}

.table-axis-popover.is-submenu-left :deep(.popover-submenu::before) {
  left: auto;
  right: -10px;
}
</style>
