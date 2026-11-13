<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useEditor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3';
import type { NodeViewProps } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

import {
  DEFAULT_NOTE_TAGS,
  type MindEditorProps,
  type MindEditorEmits,
  type PageReference,
  type SlashMenuItem,
} from '../types.js';
import FrontmatterHeader from './FrontmatterHeader.vue';
import NoteTitleBar from './NoteTitleBar.vue';
import BlockGutter from './BlockGutter.vue';
import SlashMenu from './SlashMenu.vue';
import PageMentionPopover from './PageMentionPopover.vue';
import BubbleFormattingMenu from './BubbleFormattingMenu.vue';
import MermaidBlockView from './MermaidBlockView.vue';
import CalloutBlockView from './CalloutBlockView.vue';

import { useEditorFrontmatter } from '../composables/useEditorFrontmatter.js';
import { useBlockGutterCoordinator } from '../composables/useBlockGutterCoordinator.js';
import { useMarqueeSelection } from '../composables/useMarqueeSelection.js';
import { GlobalDragHandle } from '../extensions/drag-handle.js';
import {
  BlockSelection,
  clearBlockSelection,
  deleteBlocksAtPositions,
  duplicateBlocksAtPositions,
  setBlockSelection,
} from '../extensions/block-selection.js';
import { BlockColor, normalizeContainerBlockColors } from '../extensions/block-color.js';
import { SlashCommand, executeSlashItem } from '../extensions/slash-command.js';
import { createDefaultSlashItems } from '../extensions/slash-items.js';
import { PageMention } from '../extensions/page-mention.js';
import { MermaidNode } from '../extensions/mermaid-node.js';
import { CalloutNode } from '../extensions/callout-node.js';
import { MarkdownShortcuts } from '../extensions/markdown-shortcuts.js';

const props = withDefaults(defineProps<MindEditorProps>(), {
  modelValue: '',
  title: undefined,
  showTitle: false,
  titlePlaceholder: 'Sem título',
  frontmatter: () => ({}),
  defaultTags: () => [...DEFAULT_NOTE_TAGS],
  basicBlocksOnly: false,
  readOnly: false,
  placeholder: 'Pressione / para inserir blocos',
  pages: () => [],
  enableFrontmatterHeader: true,
  showProperties: undefined,
});

const emit = defineEmits<MindEditorEmits>();

const {
  frontmatterHeaderRef,
  frontmatterInitialCollapsed,
  isFrontmatterVisible,
  openProperties,
  handleRemoveProperties,
} = useEditorFrontmatter({
  enableFrontmatterHeader: () => props.enableFrontmatterHeader,
  readOnly: () => props.readOnly,
  showProperties: () => props.showProperties,
  frontmatter: () => props.frontmatter,
  emitUpdateShowProperties: (val) => emit('update:showProperties', val),
  emitUpdateFrontmatter: (meta) => emit('update:frontmatter', meta),
});

const isEditorFocused = ref(false);
const selectedBlockPositions = ref<number[]>([]);

// Slash & Page Mention Popover State
const slashMenuState = ref<{
  visible: boolean;
  query: string;
  coords: { top: number; left: number };
  range: { from: number; to: number };
}>({
  visible: false,
  query: '',
  coords: { top: 0, left: 0 },
  range: { from: 0, to: 0 },
});

const pageMentionState = ref<{
  visible: boolean;
  query: string;
  coords: { top: number; left: number };
  range: { from: number; to: number };
}>({
  visible: false,
  query: '',
  coords: { top: 0, left: 0 },
  range: { from: 0, to: 0 },
});

const defaultSlashItems = createDefaultSlashItems({
  onGenerateAiNotes: () => emit('generateAiNotes'),
  onInsertDatabaseBlock: () => emit('insertDatabaseBlock'),
  onCreateSubpage: () => emit('createSubpage'),
});

const activeSlashItems = computed(() => {
  const base = props.basicBlocksOnly
    ? defaultSlashItems.filter((item) => item.category === 'basic')
    : defaultSlashItems;
  return [...base, ...(props.customSlashItems ?? [])];
});

const MermaidConfigured = MermaidNode.extend({
  addNodeView() {
    return VueNodeViewRenderer(MermaidBlockView as unknown as Component<NodeViewProps>);
  },
});

const CalloutConfigured = CalloutNode.extend({
  addNodeView() {
    return VueNodeViewRenderer(CalloutBlockView as unknown as Component<NodeViewProps>);
  },
});

// Track internal edits to prevent resetting selection while typing
let isInternalUpdate = false;
const isMarqueeLockActive = ref(false);

const editor = useEditor({
  editable: !props.readOnly,
  content: props.modelValue,
  editorProps: {
    handleKeyDown: (_view, event) => {
      gutterCoordinator.hideGutterOnKeydown(event);
      return false;
    },
  },
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      dropcursor: false,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { 'data-type': 'taskItem' },
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'mind-link' },
    }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === 'paragraph' || node.type.name === 'heading' ? props.placeholder : '',
      showOnlyCurrent: true,
      showOnlyWhenEditable: true,
      includeChildren: true,
    }),
    GlobalDragHandle.configure({
      onPositionChange: (pos) => gutterCoordinator.handleGutterPositionChange(pos),
      getSelectedPositions: () => selectedBlockPositions.value,
      onGroupMoved: (newPositions) => {
        if (editor.value) {
          setBlockSelection(editor.value.view, newPositions);
        }
      },
    }),
    BlockSelection.configure({
      onSelectionChange: (positions) => {
        selectedBlockPositions.value = positions;
      },
    }),
    SlashCommand.configure({
      items: [...defaultSlashItems, ...(props.customSlashItems ?? [])],
      onOpen: (data) => {
        slashMenuState.value = {
          visible: true,
          query: data.query,
          coords: { top: data.coords.bottom, left: data.coords.left },
          range: data.range,
        };
      },
      onClose: () => {
        slashMenuState.value.visible = false;
      },
      onUpdate: (data) => {
        slashMenuState.value.query = data.query;
      },
    }),
    PageMention.configure({
      pages: props.pages,
      onOpen: (data) => {
        pageMentionState.value = {
          visible: true,
          query: data.query,
          coords: { top: data.coords.bottom ?? data.coords.top, left: data.coords.left },
          range: data.range,
        };
      },
      onClose: () => {
        pageMentionState.value.visible = false;
      },
      onUpdate: (data) => {
        pageMentionState.value.query = data.query;
      },
      onNavigate: (pageId) => emit('selectPage', pageId),
    }),
    MermaidConfigured,
    CalloutConfigured,
    BlockColor,
    MarkdownShortcuts.configure({
      shouldTriggerFrontmatter: () =>
        props.enableFrontmatterHeader && !isFrontmatterVisible.value && !props.readOnly,
      onTriggerFrontmatter: () => {
        void openProperties(true);
      },
    }),
  ],
  onCreate: ({ editor: ed }) => {
    normalizeContainerBlockColors(ed);
  },
  onFocus: () => {
    isEditorFocused.value = true;
  },
  onBlur: () => {
    isEditorFocused.value = false;
  },
  onUpdate: ({ editor: ed }) => {
    isInternalUpdate = true;
    emit('update:modelValue', ed.getHTML());
    emit('update:json', ed.getJSON());
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        isInternalUpdate = false;
      });
    } else {
      setTimeout(() => {
        isInternalUpdate = false;
      }, 0);
    }
  },
});

const gutterCoordinator = useBlockGutterCoordinator({
  editor,
  selectedBlockPositions,
  isMarqueeLocked: () => isMarqueeLockActive.value,
});

const {
  gutterState,
  isGutterHovered,
  activeGutterSelectedCount,
  resetGutterState,
  handleGutterHover,
  handleGutterMenuToggle,
  handleAddBlockBelow,
  handleGutterAction,
  handleGutterSetColor,
  handleGutterTurnInto,
} = gutterCoordinator;

// Notion-style External Marquee Box Selection vs Internal Text Selection
const {
  isPointerDown,
  marqueeState,
  marqueeRectStyle,
  handleRootMouseDown,
  cleanupListeners: cleanupMarqueeListeners,
} = useMarqueeSelection({
  editor,
  readOnly: () => props.readOnly,
  selectedBlockPositions,
});

watch(
  [() => marqueeState.value.active, isPointerDown],
  ([marqueeActive, pointerDown]) => {
    const locked = marqueeActive || pointerDown;
    isMarqueeLockActive.value = locked;
    if (locked) {
      gutterState.value.visible = false;
      isGutterHovered.value = false;
    }
  },
  { immediate: true }
);

// Synchronize external modelValue & readOnly changes
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value || isInternalUpdate || editor.value.isFocused) return;

    if (typeof val === 'object' && val !== null) {
      if (JSON.stringify(val) === JSON.stringify(editor.value.getJSON())) return;
      editor.value.commands.setContent(val, false);
      normalizeContainerBlockColors(editor.value);
    } else if (typeof val === 'string' && val !== editor.value.getHTML()) {
      editor.value.commands.setContent(val, false);
      normalizeContainerBlockColors(editor.value);
    }
  }
);

watch(
  () => props.readOnly,
  (isReadOnly) => {
    editor.value?.setEditable(!isReadOnly);
    if (isReadOnly) {
      resetGutterState();
    }
  }
);

// Slash & Mention popover selection handlers
function handleSlashSelect(item: SlashMenuItem): void {
  if (!editor.value) return;
  executeSlashItem(editor.value, item, slashMenuState.value.range);
  slashMenuState.value.visible = false;
}

function closeSlashMenu(): void {
  slashMenuState.value.visible = false;
}

function handlePageSelect(page: PageReference): void {
  if (!editor.value) return;
  const { from, to } = pageMentionState.value.range;
  editor.value
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({
      type: 'pageMention',
      attrs: { pageId: page.id, title: page.title, icon: page.icon },
    })
    .insertContent(' ')
    .run();
  pageMentionState.value.visible = false;
}

function closePageMention(): void {
  pageMentionState.value.visible = false;
}

function handleTitleUpdate(nextTitle: string): void {
  emit('update:title', nextTitle);
  if (props.frontmatter && props.frontmatter.title !== undefined) {
    emit('update:frontmatter', { ...props.frontmatter, title: nextTitle });
  }
}

function focusEditorStart(): void {
  editor.value?.chain().focus('start').run();
}

function handleEditorFocusOut(event: FocusEvent): void {
  const nextTarget = event.relatedTarget as Node | null;
  const pmDom = editor.value?.view?.dom;
  if (pmDom && nextTarget && pmDom.contains(nextTarget)) {
    return;
  }
  isEditorFocused.value = false;
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    emit('save');
    return;
  }

  if (props.readOnly || !editor.value || selectedBlockPositions.value.length === 0) {
    return;
  }

  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select')) {
    return;
  }

  if (event.key === 'Escape') {
    clearBlockSelection(editor.value.view);
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    deleteBlocksAtPositions(editor.value.view, selectedBlockPositions.value);
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateBlocksAtPositions(editor.value.view, selectedBlockPositions.value);
  }
}

onBeforeUnmount(() => {
  cleanupMarqueeListeners();
  editor.value?.destroy();
});

defineExpose({
  openProperties,
  handleRootMouseDown,
});
</script>

<template>
  <div
    class="mind-editor-root"
    :class="{
      'is-marquee-selecting': marqueeState.active || isPointerDown,
      'has-block-selection': selectedBlockPositions.length > 0,
    }"
    data-testid="mind-editor-root"
    @keydown="handleKeydown"
    @mousedown="handleRootMouseDown"
  >
    <!-- Marquee Lasso Box Overlay for Block Group Selection -->
    <div
      v-if="marqueeRectStyle"
      class="mind-marquee-box"
      data-testid="mind-marquee-box"
      :style="marqueeRectStyle"
    />

    <!-- 1. Obsidian-style Frontmatter Properties Header -->
    <FrontmatterHeader
      v-if="isFrontmatterVisible"
      ref="frontmatterHeaderRef"
      :model-value="frontmatter ?? {}"
      :initial-collapsed="frontmatterInitialCollapsed"
      :default-tags="defaultTags"
      :read-only="readOnly"
      @update:model-value="emit('update:frontmatter', $event)"
      @remove-properties="handleRemoveProperties"
      @escape-to-editor="focusEditorStart"
    />

    <!-- 2. Separate Note Title Header (below Properties, outside ProseMirror block canvas) -->
    <slot name="title">
      <NoteTitleBar
        v-if="showTitle"
        :model-value="title ?? frontmatter?.title ?? ''"
        :placeholder="titlePlaceholder"
        :read-only="readOnly"
        @update:model-value="handleTitleUpdate"
        @focus-editor="focusEditorStart"
      />
    </slot>

    <!-- Editor Canvas Surface -->
    <div
      class="mind-editor-canvas-container"
      :class="{
        'is-readonly': readOnly,
        'is-canvas-focused': isEditorFocused && !marqueeState.active && selectedBlockPositions.length === 0,
      }"
    >
      <BlockGutter
        v-if="editor && !readOnly"
        :visible="gutterState.visible && !isMarqueeLockActive"
        :top="gutterState.top"
        :node-type="gutterState.nodeType"
        :node-text-color="gutterState.textColor"
        :node-bg-color="gutterState.bgColor"
        :basic-blocks-only="basicBlocksOnly"
        :selected-count="activeGutterSelectedCount"
        @add-block="handleAddBlockBelow"
        @action="handleGutterAction"
        @turn-into="handleGutterTurnInto"
        @set-color="handleGutterSetColor"
        @hover="handleGutterHover"
        @menu-toggle="handleGutterMenuToggle"
      />

      <BubbleFormattingMenu
        v-if="editor && !readOnly"
        :editor="editor"
        :disabled="marqueeState.active || isPointerDown || selectedBlockPositions.length > 0"
      />

      <SlashMenu
        :visible="slashMenuState.visible && !readOnly"
        :top="slashMenuState.coords.top"
        :left="slashMenuState.coords.left"
        :query="slashMenuState.query"
        :items="activeSlashItems"
        @select="handleSlashSelect"
        @close="closeSlashMenu"
      />

      <PageMentionPopover
        :visible="pageMentionState.visible && !readOnly"
        :query="pageMentionState.query"
        :coords="pageMentionState.coords"
        :pages="pages"
        @select="handlePageSelect"
        @close="closePageMention"
      />

      <EditorContent
        :editor="editor"
        class="mind-editor-content"
        data-testid="mind-editor-content"
        @focusin="isEditorFocused = true"
        @focusout="handleEditorFocusOut"
      />
    </div>
  </div>
</template>

<style scoped src="./mind-editor-canvas.css"></style>
