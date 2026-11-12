<template>
  <div
    v-if="visible"
    class="mind-block-gutter-shell"
    data-testid="block-gutter-shell"
    :style="{ top: `${top}px` }"
    @mouseenter="handleShellMouseEnter"
    @mouseleave="handleShellMouseLeave"
  >
    <!-- Add Block Below Button (+) -->
    <button
      type="button"
      class="gutter-btn gutter-add-btn"
      title="Adicionar linha abaixo (/)"
      aria-label="Add block below"
      data-testid="block-gutter-add-btn"
      @click="emit('addBlock')"
    >
      <Plus :size="14" />
    </button>

    <!-- Block Grip & Actions Handle (⠿) -->
    <div
      class="gutter-grip-wrapper"
      @mouseenter="isGripHovered = true"
      @mouseleave="isGripHovered = false"
    >
      <button
        type="button"
        class="gutter-btn gutter-grip-btn"
        draggable="true"
        title="Arraste para mover / Clique para menu"
        aria-label="Drag block or open menu"
        data-testid="block-gutter-handle-btn"
        @click="toggleMenu"
        @dragstart="emit('dragStart')"
        @dragend="emit('dragEnd')"
      >
        <GripVertical :size="14" />
      </button>

      <!-- Notion-like Tooltip on Hover -->
      <div
        v-if="isGripHovered && !showMenu"
        class="gutter-tooltip"
        data-testid="gutter-grip-tooltip"
      >
        <div class="tooltip-row"><strong>Arraste</strong> para mover</div>
        <div class="tooltip-row"><strong>Clique</strong> para menu de ações</div>
      </div>
    </div>

    <!-- Actions Popover Menu (Light Mode Notion-style with Search + Submenus) -->
    <div
      v-if="showMenu"
      class="block-actions-popover"
      data-testid="block-actions-popover"
      @keydown.esc.stop="closeMenu"
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
          <div class="section-title">Bloco</div>

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
                v-for="item in turnIntoOptions"
                :key="item.type"
                type="button"
                class="popover-item"
                :class="{ 'is-active': isCurrentBlockType(item.type) }"
                :data-testid="`turn-into-${item.type}`"
                @click="handleTurnInto(item.type)"
              >
                <component :is="item.icon" :size="14" class="item-icon" />
                <span class="item-label">{{ item.label }}</span>
                <Check v-if="isCurrentBlockType(item.type)" :size="13" class="item-check" />
              </button>
            </div>
          </div>

          <!-- Cor > -->
          <div
            class="popover-submenu-anchor"
            @mouseenter="openSubmenu('color')"
          >
            <button
              type="button"
              class="popover-item"
              :class="{ 'is-active': activeSubmenu === 'color' }"
              data-testid="menu-trigger-color"
              @mouseenter="openSubmenu('color')"
              @click="toggleSubmenu('color')"
            >
              <PaintRoller :size="14" class="item-icon" />
              <span class="item-label">Cor</span>
              <span
                v-if="activeColorIndicator"
                class="active-color-pill"
                :style="activeColorIndicator"
              >
                A
              </span>
              <ChevronRight :size="13" class="chevron-right" />
            </button>

            <div
              v-if="activeSubmenu === 'color'"
              class="popover-submenu popover-submenu-color"
              data-testid="submenu-color"
            >
              <div class="section-title">Cor do texto</div>
              <button
                v-for="color in BLOCK_COLOR_PALETTE"
                :key="`text-${color.id}`"
                type="button"
                class="popover-item"
                :class="{ 'is-active': isTextColorActive(color.id) }"
                :data-testid="`text-color-${color.id}`"
                @click="handleSetColor({ textColor: color.id })"
              >
                <span
                  class="color-swatch-letter"
                  :style="{ color: color.textColor }"
                >
                  A
                </span>
                <span class="item-label">{{ color.label }}</span>
                <Check v-if="isTextColorActive(color.id)" :size="13" class="item-check" />
              </button>

              <div class="popover-divider" />

              <div class="section-title">Cor de fundo</div>
              <button
                v-for="color in BLOCK_COLOR_PALETTE"
                :key="`bg-${color.id}`"
                type="button"
                class="popover-item"
                :class="{ 'is-active': isBgColorActive(color.id) }"
                :data-testid="`bg-color-${color.id}`"
                @click="handleSetColor({ backgroundColor: color.id })"
              >
                <span
                  class="color-swatch-bg"
                  :style="{
                    backgroundColor:
                      color.backgroundColor === 'transparent' ? '#ffffff' : color.backgroundColor,
                    color: '#37352f',
                  }"
                >
                  A
                </span>
                <span class="item-label">{{ color.label }}</span>
                <Check v-if="isBgColorActive(color.id)" :size="13" class="item-check" />
              </button>
            </div>
          </div>
        </div>

        <div class="popover-divider" />

        <!-- Reorder & Block Actions -->
        <div class="popover-section">
          <button
            type="button"
            class="popover-item"
            data-testid="action-duplicate"
            @mouseenter="activeSubmenu = null"
            @click="handleAction('duplicate')"
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
            @click="handleAction('moveUp')"
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
            @click="handleAction('moveDown')"
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
            @click="handleAction('delete')"
          >
            <Trash2 :size="14" class="item-icon" />
            <span class="item-label">Excluir bloco</span>
            <span class="shortcut">Del</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount, type Component } from 'vue';
import {
  Plus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  AlertCircle,
  GitFork,
  Repeat2,
  PaintRoller,
  ChevronRight,
  Check,
  Search,
} from 'lucide-vue-next';
import type { BlockColorId, BlockColorUpdate } from '../types.js';
import {
  BLOCK_COLOR_PALETTE,
  getBlockColorOption,
  normalizeBlockColorId,
} from '../extensions/block-color.js';

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    top?: number;
    left?: number;
    nodeType?: string;
    nodeTextColor?: string | null;
    nodeBgColor?: string | null;
  }>(),
  {
    visible: false,
    top: 0,
    left: 0,
    nodeType: 'paragraph',
    nodeTextColor: null,
    nodeBgColor: null,
  }
);

const emit = defineEmits<{
  (e: 'addBlock'): void;
  (e: 'dragStart'): void;
  (e: 'dragEnd'): void;
  (e: 'action', action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete'): void;
  (e: 'turnInto', type: string): void;
  (e: 'setColor', payload: BlockColorUpdate): void;
  (e: 'hover', isHovered: boolean): void;
  (e: 'menuToggle', isOpen: boolean): void;
}>();

const isGripHovered = ref(false);
const showMenu = ref(false);
const activeSubmenu = ref<'turnInto' | 'color' | null>(null);
const actionQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

const turnIntoOptions: Array<{ type: string; label: string; icon: Component }> = [
  { type: 'paragraph', label: 'Texto', icon: Type },
  { type: 'h1', label: 'Título 1', icon: Heading1 },
  { type: 'h2', label: 'Título 2', icon: Heading2 },
  { type: 'h3', label: 'Título 3', icon: Heading3 },
  { type: 'h4', label: 'Título 4', icon: Heading4 },
  { type: 'bulletList', label: 'Lista com marcadores', icon: List },
  { type: 'orderedList', label: 'Lista numerada', icon: ListOrdered },
  { type: 'taskList', label: 'Lista de tarefas', icon: CheckSquare },
  { type: 'blockquote', label: 'Citação', icon: Quote },
  { type: 'codeBlock', label: 'Bloco de código', icon: Code },
  { type: 'callout', label: 'Callout / Destaque', icon: AlertCircle },
  { type: 'mermaid', label: 'Diagrama Mermaid', icon: GitFork },
];

const normalizedTextColor = computed(() => normalizeBlockColorId(props.nodeTextColor));
const normalizedBgColor = computed(() => normalizeBlockColorId(props.nodeBgColor));

const activeColorIndicator = computed(() => {
  if (!normalizedTextColor.value && !normalizedBgColor.value) return null;
  const textHex = normalizedTextColor.value
    ? getBlockColorOption(normalizedTextColor.value).textColor
    : '#37352f';
  const bgHex = normalizedBgColor.value
    ? getBlockColorOption(normalizedBgColor.value).backgroundColor
    : '#f8f9fa';
  return {
    color: textHex,
    backgroundColor: bgHex,
  };
});

const isFiltering = computed(() => actionQuery.value.trim().length > 0);

interface FilteredActionEntry {
  key: string;
  kind: 'action' | 'turnInto' | 'textColor' | 'bgColor';
  label: string;
  searchTokens: string;
  testId: string;
  icon?: Component;
  swatchText?: string;
  swatchBg?: string;
  shortcut?: string;
  danger?: boolean;
  active?: boolean;
  run: () => void;
}

const filteredEntries = computed<FilteredActionEntry[]>(() => {
  const q = actionQuery.value.trim().toLowerCase();
  if (!q) return [];

  const entries: FilteredActionEntry[] = [
    ...turnIntoOptions.map((opt) => ({
      key: `turn-${opt.type}`,
      kind: 'turnInto' as const,
      label: `Transformar em ${opt.label}`,
      searchTokens: `transformar em ${opt.label} ${opt.type}`.toLowerCase(),
      testId: `turn-into-${opt.type}`,
      icon: opt.icon,
      active: isCurrentBlockType(opt.type),
      run: () => handleTurnInto(opt.type),
    })),
    ...BLOCK_COLOR_PALETTE.map((c) => ({
      key: `text-color-${c.id}`,
      kind: 'textColor' as const,
      label: `Cor do texto: ${c.label}`,
      searchTokens: `cor texto escrita letra ${c.label} ${c.id}`.toLowerCase(),
      testId: `text-color-${c.id}`,
      swatchText: c.textColor,
      active: isTextColorActive(c.id),
      run: () => handleSetColor({ textColor: c.id }),
    })),
    ...BLOCK_COLOR_PALETTE.map((c) => ({
      key: `bg-color-${c.id}`,
      kind: 'bgColor' as const,
      label: `Cor de fundo: ${c.label}`,
      searchTokens: `cor fundo background destaque linha ${c.label} ${c.id}`.toLowerCase(),
      testId: `bg-color-${c.id}`,
      swatchBg: c.backgroundColor,
      active: isBgColorActive(c.id),
      run: () => handleSetColor({ backgroundColor: c.id }),
    })),
    {
      key: 'act-duplicate',
      kind: 'action',
      label: 'Duplicar',
      searchTokens: 'duplicar copiar bloco',
      testId: 'action-duplicate',
      icon: Copy,
      shortcut: 'Ctrl+D',
      run: () => handleAction('duplicate'),
    },
    {
      key: 'act-move-up',
      kind: 'action',
      label: 'Mover para cima',
      searchTokens: 'mover para cima subir',
      testId: 'action-move-up',
      icon: ArrowUp,
      shortcut: 'Alt+↑',
      run: () => handleAction('moveUp'),
    },
    {
      key: 'act-move-down',
      kind: 'action',
      label: 'Mover para baixo',
      searchTokens: 'mover para baixo descer',
      testId: 'action-move-down',
      icon: ArrowDown,
      shortcut: 'Alt+↓',
      run: () => handleAction('moveDown'),
    },
    {
      key: 'act-delete',
      kind: 'action',
      label: 'Excluir bloco',
      searchTokens: 'excluir apagar remover deletar bloco',
      testId: 'action-delete',
      icon: Trash2,
      shortcut: 'Del',
      danger: true,
      run: () => handleAction('delete'),
    },
  ];

  return entries.filter((item) => item.searchTokens.includes(q));
});

function isCurrentBlockType(type: string): boolean {
  if (props.nodeType === 'listItem' && type === 'bulletList') return true;
  if (props.nodeType === 'taskItem' && type === 'taskList') return true;
  return props.nodeType === type;
}

function isTextColorActive(id: BlockColorId): boolean {
  return (normalizedTextColor.value ?? 'default') === id;
}

function isBgColorActive(id: BlockColorId): boolean {
  return (normalizedBgColor.value ?? 'default') === id;
}

function handleShellMouseEnter() {
  emit('hover', true);
}

function handleShellMouseLeave() {
  emit('hover', false);
}

function openSubmenu(name: 'turnInto' | 'color') {
  activeSubmenu.value = name;
}

function toggleSubmenu(name: 'turnInto' | 'color') {
  activeSubmenu.value = activeSubmenu.value === name ? null : name;
}

function closeMenu() {
  showMenu.value = false;
  activeSubmenu.value = null;
  actionQuery.value = '';
  emit('menuToggle', false);
}

function toggleMenu() {
  if (showMenu.value) {
    closeMenu();
    return;
  }
  showMenu.value = true;
  activeSubmenu.value = null;
  actionQuery.value = '';
  emit('menuToggle', true);
  nextTick(() => {
    searchInputRef.value?.focus();
  });
}

function handleAction(action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete') {
  closeMenu();
  emit('action', action);
}

function handleTurnInto(type: string) {
  closeMenu();
  emit('turnInto', type);
}

function handleSetColor(payload: BlockColorUpdate) {
  closeMenu();
  emit('setColor', payload);
}

function handleDocumentClick(e: MouseEvent) {
  if (!showMenu.value) return;
  const target = e.target as HTMLElement | null;
  if (target && !target.closest('.mind-block-gutter-shell')) {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick);
});
</script>

<style scoped>
.mind-block-gutter-shell {
  position: absolute;
  left: -48px;
  display: flex;
  align-items: center;
  gap: 2px;
  z-index: 50;
  padding-right: 6px;
  margin-right: -6px;
  user-select: none;
}

.gutter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: #9b9a97;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  padding: 0;
}

.gutter-btn:hover {
  background-color: #f1f3f5;
  color: #111827;
}

.gutter-grip-wrapper {
  position: relative;
}

.gutter-grip-btn {
  cursor: grab;
}

.gutter-grip-btn:active {
  cursor: grabbing;
}

.gutter-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  color: #37352f;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.725rem;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.tooltip-row strong {
  color: #1971c2;
  font-weight: 600;
}

.block-actions-popover {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  width: 228px;
  z-index: 120;
  padding: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.popover-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.popover-search-icon {
  position: absolute;
  left: 8px;
  color: #868e96;
  pointer-events: none;
}

.popover-search-input {
  width: 100%;
  height: 30px;
  padding: 0 8px 0 26px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 12.5px;
  color: #111827;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.popover-search-input::placeholder {
  color: #868e96;
}

.popover-search-input:focus {
  background-color: #ffffff;
  border-color: #1971c2;
}

.popover-search-results {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-empty-search {
  padding: 14px 8px;
  text-align: center;
  font-size: 12px;
  color: #868e96;
}

.popover-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-divider {
  height: 1px;
  background-color: #e9ecef;
  margin: 5px 0;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #868e96;
  letter-spacing: 0.02em;
  padding: 4px 8px 2px;
}

.popover-submenu-anchor {
  position: relative;
}

.popover-submenu {
  position: absolute;
  top: -6px;
  left: calc(100% + 6px);
  width: 215px;
  max-height: 340px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 6px;
  z-index: 140;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Hover bridge between main menu and cascading submenu */
.popover-submenu::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -10px;
  width: 10px;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 5px;
  background: none;
  border: none;
  color: #37352f;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.1s ease, color 0.1s ease;
}

.popover-item:hover,
.popover-item.is-active {
  background-color: #f1f3f5;
  color: #111827;
}

.popover-item.is-danger:hover {
  background-color: #fff5f5;
  color: #c92a2a;
}

.item-icon {
  color: #495057;
  flex-shrink: 0;
}

.popover-item.is-danger:hover .item-icon {
  color: #c92a2a;
}

.item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron-right {
  margin-left: auto;
  color: #868e96;
  flex-shrink: 0;
}

.item-check {
  margin-left: auto;
  color: #1971c2;
  flex-shrink: 0;
}

.active-color-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.color-swatch-letter,
.color-swatch-bg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  line-height: 1;
}

.color-swatch-letter {
  background-color: #ffffff;
}

.shortcut {
  margin-left: auto;
  font-size: 11px;
  color: #868e96;
}
</style>
