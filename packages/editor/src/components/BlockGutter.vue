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

    <!-- Actions Popover Menu (Move, Duplicate, Delete, Turn Into) -->
    <div
      v-if="showMenu"
      class="block-actions-popover"
      data-testid="block-actions-popover"
    >
      <div class="popover-section">
        <button
          type="button"
          class="popover-item"
          data-testid="action-move-up"
          @click="handleAction('moveUp')"
        >
          <ArrowUp :size="14" />
          <span>Mover para cima</span>
          <span class="shortcut">Alt+↑</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="action-move-down"
          @click="handleAction('moveDown')"
        >
          <ArrowDown :size="14" />
          <span>Mover para baixo</span>
          <span class="shortcut">Alt+↓</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="action-duplicate"
          @click="handleAction('duplicate')"
        >
          <Copy :size="14" />
          <span>Duplicar bloco</span>
        </button>
        <button
          type="button"
          class="popover-item is-danger"
          data-testid="action-delete"
          @click="handleAction('delete')"
        >
          <Trash2 :size="14" />
          <span>Excluir bloco</span>
          <span class="shortcut">Del</span>
        </button>
      </div>

      <div class="popover-divider" />

      <!-- Turn Into Section -->
      <div class="popover-section">
        <div class="section-title">Transformar em...</div>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-paragraph"
          @click="handleTurnInto('paragraph')"
        >
          <Type :size="14" />
          <span>Texto</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-h1"
          @click="handleTurnInto('h1')"
        >
          <Heading1 :size="14" />
          <span>Título 1</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-h2"
          @click="handleTurnInto('h2')"
        >
          <Heading2 :size="14" />
          <span>Título 2</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-h3"
          @click="handleTurnInto('h3')"
        >
          <Heading3 :size="14" />
          <span>Título 3</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-bulletList"
          @click="handleTurnInto('bulletList')"
        >
          <List :size="14" />
          <span>Lista com marcadores</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-taskList"
          @click="handleTurnInto('taskList')"
        >
          <CheckSquare :size="14" />
          <span>Lista de tarefas</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-callout"
          @click="handleTurnInto('callout')"
        >
          <AlertCircle :size="14" />
          <span>Callout / Destaque</span>
        </button>
        <button
          type="button"
          class="popover-item"
          data-testid="turn-into-mermaid"
          @click="handleTurnInto('mermaid')"
        >
          <GitFork :size="14" />
          <span>Diagrama Mermaid</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
  List,
  CheckSquare,
  AlertCircle,
  GitFork,
} from 'lucide-vue-next';

withDefaults(
  defineProps<{
    visible?: boolean;
    top?: number;
    left?: number;
    nodeType?: string;
  }>(),
  {
    visible: false,
    top: 0,
    left: 0,
    nodeType: 'paragraph',
  }
);

const emit = defineEmits<{
  (e: 'addBlock'): void;
  (e: 'dragStart'): void;
  (e: 'dragEnd'): void;
  (e: 'action', action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete'): void;
  (e: 'turnInto', type: string): void;
  (e: 'hover', isHovered: boolean): void;
  (e: 'menuToggle', isOpen: boolean): void;
}>();

const isGripHovered = ref(false);
const showMenu = ref(false);

function handleShellMouseEnter() {
  emit('hover', true);
}

function handleShellMouseLeave() {
  emit('hover', false);
}

function toggleMenu() {
  showMenu.value = !showMenu.value;
  emit('menuToggle', showMenu.value);
}

function handleAction(action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete') {
  showMenu.value = false;
  emit('menuToggle', false);
  emit('action', action);
}

function handleTurnInto(type: string) {
  showMenu.value = false;
  emit('menuToggle', false);
  emit('turnInto', type);
}
</script>

<style scoped>
.mind-block-gutter-shell {
  position: absolute;
  left: -48px;
  display: flex;
  align-items: center;
  gap: 2px;
  z-index: 50;
  padding-right: 18px;
  margin-right: -18px;
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
  background-color: #f1f1ef;
  color: #37352f;
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
  background-color: #24292f;
  color: #ffffff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.725rem;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip-row strong {
  color: #a5d8ff;
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
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  width: 220px;
  z-index: 100;
  padding: 6px;
  font-family: system-ui, -apple-system, sans-serif;
}

.popover-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-divider {
  height: 1px;
  background-color: #f1f1ef;
  margin: 6px 0;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: #9b9a97;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 8px;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border-radius: 4px;
  background: none;
  border: none;
  color: #37352f;
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease;
}

.popover-item:hover {
  background-color: #f8f9fa;
}

.popover-item.is-danger:hover {
  background-color: #ffe3e3;
  color: #c92a2a;
}

.shortcut {
  margin-left: auto;
  font-size: 0.7rem;
  color: #9b9a97;
}
</style>
