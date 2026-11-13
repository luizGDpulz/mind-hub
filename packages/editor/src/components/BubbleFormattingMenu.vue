<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { BubbleMenu, isTextSelection } from '@tiptap/vue-3';
import type { Editor } from '@tiptap/core';
import '@tiptap/starter-kit';
import '@tiptap/extension-link';
import '@tiptap/extension-underline';
import '@tiptap/extension-task-list';
import '../extensions/callout-node.js';
import { BlockSelectionPluginKey } from '../extensions/block-selection.js';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Eraser,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListTodo,
  Quote,
  AlertCircle,
  FileCode2,
  Check,
  X,
} from 'lucide-vue-next';

interface BubbleFormattingMenuProps {
  editor: Editor;
  disabled?: boolean;
  tippyOptions?: Record<string, unknown>;
}

const props = withDefaults(defineProps<BubbleFormattingMenuProps>(), {
  disabled: false,
  tippyOptions: () => ({
    duration: 100,
    placement: 'top',
    zIndex: 60,
  }),
});

const isTurnIntoOpen = ref(false);
const isLinkInputOpen = ref(false);
const linkUrl = ref('');
const linkInputRef = ref<HTMLInputElement | null>(null);

function shouldShow({ editor }: { editor: Editor }): boolean {
  if (props.disabled || !editor || !editor.isEditable) return false;
  const { state } = editor;
  const selectedBlocks = BlockSelectionPluginKey.getState(state)?.positions ?? [];
  if (selectedBlocks.length > 0) return false;
  const { selection } = state;
  // Non-empty text selection
  return !selection.empty && isTextSelection(selection);
}

const currentBlockLabel = computed(() => {
  if (!props.editor) return 'Texto';
  if (props.editor.isActive('heading', { level: 1 })) return 'Título 1';
  if (props.editor.isActive('heading', { level: 2 })) return 'Título 2';
  if (props.editor.isActive('heading', { level: 3 })) return 'Título 3';
  if (props.editor.isActive('bulletList')) return 'Marcadores';
  if (props.editor.isActive('taskList')) return 'Tarefas';
  if (props.editor.isActive('blockquote')) return 'Citação';
  if (props.editor.isActive('callout')) return 'Frase de destaque';
  if (props.editor.isActive('codeBlock')) return 'Código';
  return 'Texto';
});

function toggleTurnInto(): void {
  isTurnIntoOpen.value = !isTurnIntoOpen.value;
  isLinkInputOpen.value = false;
}

function turnIntoParagraph(): void {
  props.editor.chain().focus().setParagraph().run();
  isTurnIntoOpen.value = false;
}

function turnIntoHeading(level: 1 | 2 | 3): void {
  props.editor.chain().focus().toggleHeading({ level }).run();
  isTurnIntoOpen.value = false;
}

function turnIntoBulletList(): void {
  props.editor.chain().focus().toggleBulletList().run();
  isTurnIntoOpen.value = false;
}

function turnIntoTaskList(): void {
  props.editor.chain().focus().toggleTaskList().run();
  isTurnIntoOpen.value = false;
}

function turnIntoBlockquote(): void {
  props.editor.chain().focus().toggleBlockquote().run();
  isTurnIntoOpen.value = false;
}

function turnIntoCallout(): void {
  props.editor.chain().focus().toggleCallout().run();
  isTurnIntoOpen.value = false;
}

function turnIntoCodeBlock(): void {
  props.editor.chain().focus().toggleCodeBlock().run();
  isTurnIntoOpen.value = false;
}

// Marks
function toggleBold(): void {
  props.editor.chain().focus().toggleBold().run();
}

function toggleItalic(): void {
  props.editor.chain().focus().toggleItalic().run();
}

function toggleUnderline(): void {
  props.editor.chain().focus().toggleUnderline().run();
}

function toggleStrike(): void {
  props.editor.chain().focus().toggleStrike().run();
}

function toggleCode(): void {
  props.editor.chain().focus().toggleCode().run();
}

function clearFormatting(): void {
  props.editor.chain().focus().unsetAllMarks().clearNodes().run();
}

// Link handling
function openLinkInput(): void {
  if (props.editor.isActive('link')) {
    props.editor.chain().focus().unsetLink().run();
    isLinkInputOpen.value = false;
    return;
  }
  const previousUrl = props.editor.getAttributes('link').href as string | undefined;
  linkUrl.value = previousUrl || '';
  isLinkInputOpen.value = true;
  isTurnIntoOpen.value = false;
  nextTick(() => {
    linkInputRef.value?.focus();
  });
}

function applyLink(): void {
  const url = linkUrl.value.trim();
  if (!url) {
    props.editor.chain().focus().unsetLink().run();
  } else {
    props.editor.chain().focus().setLink({ href: url }).run();
  }
  isLinkInputOpen.value = false;
  linkUrl.value = '';
}

function cancelLink(): void {
  isLinkInputOpen.value = false;
  linkUrl.value = '';
}
</script>

<template>
  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :tippy-options="tippyOptions"
    :should-show="shouldShow"
  >
    <div
      class="mind-bubble-menu-toolbar"
      data-testid="bubble-formatting-menu"
      @mousedown.prevent
    >
      <!-- Turn Into Dropdown Button -->
      <div class="mind-toolbar-dropdown-anchor">
        <button
          type="button"
          class="mind-turn-into-btn"
          data-testid="bubble-turn-into-btn"
          title="Transformar tipo de bloco"
          @click.stop="toggleTurnInto"
        >
          <span>{{ currentBlockLabel }}</span>
          <ChevronDown class="mind-turn-into-chevron" />
        </button>

        <div
          v-if="isTurnIntoOpen"
          class="mind-turn-into-dropdown"
          data-testid="bubble-turn-into-dropdown"
        >
          <div class="mind-dropdown-header">Transformar em</div>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-paragraph"
            @click="turnIntoParagraph"
          >
            <span>Texto normal</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-h1"
            @click="turnIntoHeading(1)"
          >
            <Heading1 class="mind-item-icon" />
            <span>Título 1</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-h2"
            @click="turnIntoHeading(2)"
          >
            <Heading2 class="mind-item-icon" />
            <span>Título 2</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-h3"
            @click="turnIntoHeading(3)"
          >
            <Heading3 class="mind-item-icon" />
            <span>Título 3</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-bullet-list"
            @click="turnIntoBulletList"
          >
            <List class="mind-item-icon" />
            <span>Lista com marcadores</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-task-list"
            @click="turnIntoTaskList"
          >
            <ListTodo class="mind-item-icon" />
            <span>Lista de tarefas</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-blockquote"
            @click="turnIntoBlockquote"
          >
            <Quote class="mind-item-icon" />
            <span>Citação</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-callout"
            @click="turnIntoCallout"
          >
            <AlertCircle class="mind-item-icon" />
            <span>Destaque / Callout</span>
          </button>
          <button
            type="button"
            class="mind-dropdown-item"
            data-testid="turn-into-code-block"
            @click="turnIntoCodeBlock"
          >
            <FileCode2 class="mind-item-icon" />
            <span>Bloco de código</span>
          </button>
        </div>
      </div>

      <div class="mind-toolbar-divider" />

      <!-- Formatting Marks -->
      <button
        type="button"
        class="mind-format-btn"
        :class="{ 'is-active': editor.isActive('bold') }"
        data-testid="format-bold"
        title="Negrito (Ctrl+B)"
        @click="toggleBold"
      >
        <Bold class="mind-format-icon" />
      </button>

      <button
        type="button"
        class="mind-format-btn"
        :class="{ 'is-active': editor.isActive('italic') }"
        data-testid="format-italic"
        title="Itálico (Ctrl+I)"
        @click="toggleItalic"
      >
        <Italic class="mind-format-icon" />
      </button>

      <button
        type="button"
        class="mind-format-btn"
        :class="{ 'is-active': editor.isActive('underline') }"
        data-testid="format-underline"
        title="Sublinhado (Ctrl+U)"
        @click="toggleUnderline"
      >
        <UnderlineIcon class="mind-format-icon" />
      </button>

      <button
        type="button"
        class="mind-format-btn"
        :class="{ 'is-active': editor.isActive('strike') }"
        data-testid="format-strike"
        title="Tachado"
        @click="toggleStrike"
      >
        <Strikethrough class="mind-format-icon" />
      </button>

      <button
        type="button"
        class="mind-format-btn"
        :class="{ 'is-active': editor.isActive('code') }"
        data-testid="format-code"
        title="Código inline (Ctrl+E)"
        @click="toggleCode"
      >
        <Code class="mind-format-icon" />
      </button>

      <div class="mind-toolbar-divider" />

      <!-- Link Button -->
      <button
        type="button"
        class="mind-format-btn"
        :class="{ 'is-active': editor.isActive('link') }"
        data-testid="format-link"
        title="Adicionar ou remover link (Ctrl+K)"
        @click="openLinkInput"
      >
        <LinkIcon class="mind-format-icon" />
      </button>

      <div class="mind-toolbar-divider" />

      <!-- Clear Formatting Button -->
      <button
        type="button"
        class="mind-format-btn"
        data-testid="format-clear"
        title="Limpar formatação"
        @click="clearFormatting"
      >
        <Eraser class="mind-format-icon" />
      </button>

      <!-- Inline Link Input Popover -->
      <div
        v-if="isLinkInputOpen"
        class="mind-inline-link-popover"
        data-testid="inline-link-popover"
      >
        <input
          ref="linkInputRef"
          v-model="linkUrl"
          type="url"
          placeholder="Cole ou digite a URL..."
          class="mind-link-input"
          data-testid="link-url-input"
          @keydown.enter.prevent="applyLink"
          @keydown.esc.prevent="cancelLink"
        />
        <button
          type="button"
          class="mind-link-action-btn mind-link-confirm"
          data-testid="link-confirm-btn"
          title="Aplicar link"
          @click="applyLink"
        >
          <Check class="mind-link-btn-icon" />
        </button>
        <button
          type="button"
          class="mind-link-action-btn mind-link-cancel"
          data-testid="link-cancel-btn"
          title="Cancelar"
          @click="cancelLink"
        >
          <X class="mind-link-btn-icon" />
        </button>
      </div>
    </div>
  </BubbleMenu>
</template>

<style scoped>
.mind-bubble-menu-toolbar {
  position: relative;
  display: inline-flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 4px;
  gap: 2px;
}

.mind-toolbar-dropdown-anchor {
  position: relative;
}

.mind-turn-into-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.mind-turn-into-btn:hover {
  background-color: #f1f3f5;
}

.mind-turn-into-chevron {
  width: 12px;
  height: 12px;
  color: #868e96;
}

.mind-turn-into-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 70;
  width: 190px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mind-dropdown-header {
  font-size: 11px;
  font-weight: 600;
  color: #868e96;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 8px;
}

.mind-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;
  color: #111827;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.1s ease;
}

.mind-dropdown-item:hover {
  background-color: #f1f3f5;
}

.mind-item-icon {
  width: 15px;
  height: 15px;
  color: #495057;
}

.mind-toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: #e9ecef;
  margin: 0 2px;
}

.mind-format-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: #495057;
  cursor: pointer;
  transition: background-color 0.1s ease, color 0.1s ease;
}

.mind-format-btn:hover {
  background-color: #f1f3f5;
  color: #111827;
}

.mind-format-btn.is-active {
  background-color: #e7f5ff;
  color: #1971c2;
}

.mind-format-icon {
  width: 15px;
  height: 15px;
}

.mind-inline-link-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 4px 6px;
  width: 280px;
}

.mind-link-input {
  flex: 1;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  color: #111827;
  outline: none;
  background-color: #ffffff;
}

.mind-link-input:focus {
  border-color: #1971c2;
}

.mind-link-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.mind-link-confirm {
  color: #2b8a3e;
}

.mind-link-confirm:hover {
  background-color: #ebfbee;
}

.mind-link-cancel {
  color: #868e96;
}

.mind-link-cancel:hover {
  background-color: #f1f3f5;
}

.mind-link-btn-icon {
  width: 14px;
  height: 14px;
}
</style>
