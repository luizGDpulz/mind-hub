<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue';
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
  type EditorFrontmatter,
  type MindEditorProps,
  type MindEditorEmits,
  type PageReference,
  type SlashMenuItem,
  type BlockColorUpdate,
} from '../types.js';
import FrontmatterHeader from './FrontmatterHeader.vue';
import NoteTitleBar from './NoteTitleBar.vue';
import BlockGutter from './BlockGutter.vue';
import SlashMenu from './SlashMenu.vue';
import PageMentionPopover from './PageMentionPopover.vue';
import BubbleFormattingMenu from './BubbleFormattingMenu.vue';
import MermaidBlockView from './MermaidBlockView.vue';
import CalloutBlockView from './CalloutBlockView.vue';

import { useMarqueeSelection } from '../composables/useMarqueeSelection.js';
import { GlobalDragHandle } from '../extensions/drag-handle.js';
import {
  BlockSelection,
  clearBlockSelection,
  deleteBlocksAtPositions,
  duplicateBlocksAtPositions,
  moveSelectedBlocksStep,
  setBlockSelection,
  turnIntoBlocksAtPositions,
} from '../extensions/block-selection.js';
import {
  BlockColor,
  applyBlockColorAtPositions,
  normalizeContainerBlockColors,
} from '../extensions/block-color.js';
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

const frontmatterHeaderRef = ref<InstanceType<typeof FrontmatterHeader> | null>(null);
const localShowProperties = ref(false);
const frontmatterInitialCollapsed = ref(true);

function hasFrontmatterProperties(meta?: EditorFrontmatter): boolean {
  if (!meta) return false;
  for (const [key, val] of Object.entries(meta)) {
    if (key === 'title' || val === undefined) continue;
    if (key === 'tags' && Array.isArray(val) && val.length === 0) continue;
    return true;
  }
  return false;
}

const isFrontmatterVisible = computed<boolean>(() => {
  if (!props.enableFrontmatterHeader) return false;
  if (props.showProperties !== undefined) {
    return props.showProperties || hasFrontmatterProperties(props.frontmatter);
  }
  return localShowProperties.value || hasFrontmatterProperties(props.frontmatter);
});

async function openProperties(focusAdd = true): Promise<void> {
  if (!props.enableFrontmatterHeader || props.readOnly) return;
  frontmatterInitialCollapsed.value = false;
  localShowProperties.value = true;
  emit('update:showProperties', true);
  await nextTick();
  if (focusAdd) {
    await frontmatterHeaderRef.value?.startAddingProperty();
  } else {
    frontmatterHeaderRef.value?.expand();
  }
}

function handleRemoveProperties(): void {
  localShowProperties.value = false;
  frontmatterInitialCollapsed.value = true;
  emit('update:showProperties', false);
  emit('update:frontmatter', {});
}

watch(
  () => props.showProperties,
  async (nextVal, prevVal) => {
    if (nextVal && !prevVal) {
      frontmatterInitialCollapsed.value = false;
      await nextTick();
      frontmatterHeaderRef.value?.expand();
    } else if (nextVal === false) {
      localShowProperties.value = false;
      frontmatterInitialCollapsed.value = true;
    }
  }
);

// Block Gutter State
const gutterState = ref<{
  visible: boolean;
  top: number;
  nodePos: number;
  nodeType: string;
  textColor: string | null;
  bgColor: string | null;
}>({
  visible: false,
  top: 0,
  nodePos: 0,
  nodeType: 'paragraph',
  textColor: null,
  bgColor: null,
});

const isGutterHovered = ref(false);
const isGutterMenuOpen = ref(false);
const isEditorFocused = ref(false);
const selectedBlockPositions = ref<number[]>([]);

const activeGutterSelectedCount = computed(() =>
  selectedBlockPositions.value.includes(gutterState.value.nodePos)
    ? selectedBlockPositions.value.length
    : 0
);

function resolveGutterTargetPositions(): number[] {
  if (
    selectedBlockPositions.value.length > 1 &&
    selectedBlockPositions.value.includes(gutterState.value.nodePos)
  ) {
    return [...selectedBlockPositions.value];
  }
  return [gutterState.value.nodePos];
}

function handleGutterHover(hovered: boolean) {
  isGutterHovered.value = hovered;
}

function handleGutterMenuToggle(isOpen: boolean) {
  isGutterMenuOpen.value = isOpen;
}

// Slash Menu State
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

// Page Mention Popover State
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

// Modular Default Slash Menu Items
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

// Internal update tracker to prevent cursor jumping to start on keystrokes
let isInternalUpdate = false;

const editor = useEditor({
  editable: !props.readOnly,
  content: props.modelValue,
  editorProps: {
    handleKeyDown: (_view, event) => {
      if (
        !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'].includes(event.key) &&
        !event.ctrlKey &&
        !event.metaKey &&
        !isGutterMenuOpen.value
      ) {
        isGutterHovered.value = false;
        gutterState.value.visible = false;
      }
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
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'mind-link',
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === 'paragraph' || node.type.name === 'heading' ? props.placeholder : '',
      showOnlyCurrent: true,
      showOnlyWhenEditable: true,
      includeChildren: true,
    }),
    GlobalDragHandle.configure({
      onPositionChange: (pos) => {
        if (isMarqueeLockActive.value) {
          gutterState.value.visible = false;
          return;
        }
        if (isGutterMenuOpen.value) {
          return;
        }
        if (!pos) {
          if (!isGutterHovered.value) {
            gutterState.value.visible = false;
          }
          return;
        }
        gutterState.value = {
          visible: true,
          top: pos.top,
          nodePos: pos.nodePos,
          nodeType: pos.nodeType,
          textColor: pos.textColor ?? null,
          bgColor: pos.bgColor ?? null,
        };
      },
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
      onNavigate: (pageId) => {
        emit('selectPage', pageId);
      },
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

// Synchronize external modelValue changes
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return;

    // Never reset content or cursor position while user is actively typing or editing!
    if (isInternalUpdate) return;
    if (editor.value.isFocused) return;

    if (typeof val === 'object' && val !== null) {
      const currentJson = editor.value.getJSON();
      if (JSON.stringify(val) === JSON.stringify(currentJson)) {
        return;
      }
      editor.value.commands.setContent(val, false);
      normalizeContainerBlockColors(editor.value);
    } else if (typeof val === 'string') {
      const current = editor.value.getHTML();
      if (val !== current) {
        editor.value.commands.setContent(val, false);
        normalizeContainerBlockColors(editor.value);
      }
    }
  }
);

// Synchronize readOnly mode
watch(
  () => props.readOnly,
  (isReadOnly) => {
    editor.value?.setEditable(!isReadOnly);
    if (isReadOnly) {
      gutterState.value.visible = false;
      isGutterHovered.value = false;
      isGutterMenuOpen.value = false;
    }
  }
);

// Gutter actions
function handleAddBlockBelow(): void {
  if (!editor.value) return;
  const pos = gutterState.value.nodePos;
  const node = editor.value.state.doc.nodeAt(pos);
  const insertPos = node ? pos + node.nodeSize : pos + 1;
  const isListItem = node?.type.name === 'listItem' || node?.type.name === 'taskItem';
  const contentToInsert = isListItem
    ? {
        type: node.type.name,
        attrs: node.type.name === 'taskItem' ? { checked: false } : undefined,
        content: [{ type: 'paragraph' }],
      }
    : { type: 'paragraph' };
  const cursorOffset = isListItem ? 2 : 1;

  editor.value
    .chain()
    .focus()
    .insertContentAt(insertPos, contentToInsert)
    .setTextSelection(insertPos + cursorOffset)
    .run();
}

function handleGutterAction(action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete'): void {
  if (!editor.value) return;
  const targets = resolveGutterTargetPositions();
  const { view } = editor.value;

  if (action === 'delete') {
    if (deleteBlocksAtPositions(view, targets)) {
      gutterState.value.visible = false;
      isGutterHovered.value = false;
    }
  } else if (action === 'duplicate') {
    duplicateBlocksAtPositions(view, targets);
  } else if (action === 'moveUp' || action === 'moveDown') {
    const dir = action === 'moveUp' ? 'up' : 'down';
    const result = moveSelectedBlocksStep(view, targets, dir);
    if (result.moved && result.newPositions.length > 0) {
      gutterState.value.nodePos = result.newPositions[0]!;
      if (targets.length > 1) {
        setBlockSelection(view, result.newPositions);
      }
    }
  }
}

function handleGutterSetColor(update: BlockColorUpdate): void {
  if (!editor.value) return;
  const targets = resolveGutterTargetPositions();
  const applied = applyBlockColorAtPositions(editor.value, targets, update);
  if (!applied) return;

  if (update.textColor !== undefined) {
    gutterState.value.textColor =
      update.textColor === 'default' || update.textColor === null ? null : update.textColor;
  }
  if (update.backgroundColor !== undefined) {
    gutterState.value.bgColor =
      update.backgroundColor === 'default' || update.backgroundColor === null
        ? null
        : update.backgroundColor;
  }
}

function handleGutterTurnInto(type: string): void {
  if (!editor.value) return;
  const targets = resolveGutterTargetPositions();

  if (type === 'mermaid') {
    const pos = targets[0] ?? gutterState.value.nodePos;
    editor.value
      .chain()
      .focus()
      .setTextSelection(Math.min(pos + 1, editor.value.state.doc.content.size))
      .insertContent({ type: 'mermaid' })
      .run();
    return;
  }

  const res = turnIntoBlocksAtPositions(editor.value, targets, type);
  if (res.converted && res.newPositions.length > 0) {
    gutterState.value.nodePos = res.newPositions[0]!;
    gutterState.value.nodeType = type;
  }
}

// Slash menu actions
function handleSlashSelect(item: SlashMenuItem): void {
  if (!editor.value) return;
  executeSlashItem(editor.value, item, slashMenuState.value.range);
  slashMenuState.value.visible = false;
}

function closeSlashMenu(): void {
  slashMenuState.value.visible = false;
}

// Page mention actions
function handlePageSelect(page: PageReference): void {
  if (!editor.value) return;
  const { from, to } = pageMentionState.value.range;
  editor.value
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({
      type: 'pageMention',
      attrs: {
        pageId: page.id,
        title: page.title,
        icon: page.icon,
      },
    })
    .insertContent(' ')
    .run();
  pageMentionState.value.visible = false;
}

function closePageMention(): void {
  pageMentionState.value.visible = false;
}

// Note title handlers (kept strictly independent from block nodes; DB Page.title owns note identity)
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

const isMarqueeLockActive = computed(
  () => marqueeState.value.active || isPointerDown.value
);

watch(isMarqueeLockActive, (locked) => {
  if (locked) {
    gutterState.value.visible = false;
    isGutterHovered.value = false;
  }
});

// Global Save & Group Block Keyboard Shortcuts
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
    <!-- 1. Obsidian-style Frontmatter Properties Header (hidden on blank note until triggered) -->
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
      <!-- Block Gutter (+ and ⠿) on Left Margin (suppressed while dragging marquee) -->
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

      <!-- Bubble Formatting Menu Inline on Text Selection -->
      <BubbleFormattingMenu
        v-if="editor && !readOnly"
        :editor="editor"
        :disabled="marqueeState.active || isPointerDown || selectedBlockPositions.length > 0"
      />

      <!-- Slash Command Menu Popover -->
      <SlashMenu
        :visible="slashMenuState.visible && !readOnly"
        :top="slashMenuState.coords.top"
        :left="slashMenuState.coords.left"
        :query="slashMenuState.query"
        :items="activeSlashItems"
        @select="handleSlashSelect"
        @close="closeSlashMenu"
      />

      <!-- Page Mention Popover (@ and [[) -->
      <PageMentionPopover
        :visible="pageMentionState.visible && !readOnly"
        :query="pageMentionState.query"
        :coords="pageMentionState.coords"
        :pages="pages"
        @select="handlePageSelect"
        @close="closePageMention"
      />

      <!-- ProseMirror Editor Canvas -->
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

<style scoped>
.mind-editor-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 28px 76px 80px;
  background-color: #ffffff;
  color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
}

.mind-editor-canvas-container {
  position: relative;
  width: 100%;
  min-height: 380px;
}

.mind-editor-content {
  width: 100%;
  outline: none;
}

:deep(.ProseMirror) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  outline: none;
  min-height: 320px;
  line-height: 1.6;
  font-size: 15px;
  color: #111827;
}

/* Each basic block treated as a clean individual pill row with Notion-like breathing room */
:deep(.ProseMirror > p) {
  margin: 0 -10px;
  padding: 4px 10px;
  border-radius: 6px;
  line-height: 1.6;
  min-height: 32px;
  box-sizing: border-box;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror > h1) {
  font-size: 28px;
  line-height: 1.3;
  font-weight: 700;
  color: #111827;
  margin: 8px -10px 0;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror > h2) {
  font-size: 22px;
  line-height: 1.35;
  font-weight: 600;
  color: #111827;
  margin: 6px -10px 0;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror > h3) {
  font-size: 18px;
  line-height: 1.4;
  font-weight: 600;
  color: #111827;
  margin: 4px -10px 0;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror > h4) {
  font-size: 16px;
  line-height: 1.45;
  font-weight: 600;
  color: #111827;
  margin: 2px -10px 0;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

:deep(.slash-ghost-hint) {
  color: #adb5bd;
  pointer-events: none;
  user-select: none;
  margin-left: 2px;
  font-style: normal;
  font-weight: 400;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #dee2e6;
  color: #495057;
  padding: 6px 12px 6px 14px;
  margin: 2px -10px;
  border-radius: 0 6px 6px 0;
  font-style: normal;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror blockquote[data-block-color]) {
  border-left-color: currentColor;
}

:deep(.ProseMirror pre) {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  margin: 2px -10px;
  overflow-x: auto;
  transition: background-color 0.12s ease;
}

/* List items rendered as independent full-row rounded pills (including marker 1. / 2. / •) */
:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  padding-left: 0;
  margin: 0;
}

:deep(.ProseMirror li > ul),
:deep(.ProseMirror li > ol) {
  padding-left: 24px;
  margin: 6px 0 0;
}

:deep(.ProseMirror ol) {
  counter-reset: mind-ol;
}

:deep(.ProseMirror ol > li),
:deep(.ProseMirror ul:not([data-type="taskList"]) > li) {
  position: relative;
  margin: 0 -10px;
  padding: 4px 10px 4px 34px;
  border-radius: 6px;
  line-height: 1.6;
  min-height: 32px;
  box-sizing: border-box;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror ul:not([data-type="taskList"]) > li) {
  padding-left: 28px;
}

:deep(.ProseMirror ol > li) {
  counter-increment: mind-ol;
}

:deep(.ProseMirror ol > li::before) {
  content: counter(mind-ol) ".";
  position: absolute;
  left: 10px;
  top: 4px;
  width: 20px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
  color: inherit;
  user-select: none;
  pointer-events: none;
}

:deep(.ProseMirror ul:not([data-type="taskList"]) > li::before) {
  content: "•";
  position: absolute;
  left: 10px;
  top: 4px;
  width: 14px;
  font-size: 16px;
  line-height: 1.5;
  color: inherit;
  user-select: none;
  pointer-events: none;
}

:deep(.ProseMirror li > p),
:deep(.ProseMirror li > div > p),
:deep(.ProseMirror blockquote > p),
:deep(.ProseMirror td > p),
:deep(.ProseMirror th > p) {
  margin: 0;
  padding: 0;
  border-radius: 0;
  min-height: 0;
}

:deep(.ProseMirror li > p[data-block-bg]),
:deep(.ProseMirror li > div > p[data-block-bg]) {
  background-color: transparent !important;
}

:deep(.ProseMirror ul[data-type="taskList"]) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  padding-left: 0;
  margin: 0;
}

:deep(.ProseMirror li[data-type="taskItem"]) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 -10px;
  padding: 4px 10px;
  border-radius: 6px;
  line-height: 1.6;
  min-height: 32px;
  box-sizing: border-box;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror li[data-type="taskItem"] > label) {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  height: 24px;
  user-select: none;
}

:deep(.ProseMirror li[data-type="taskItem"] input[type="checkbox"]) {
  margin: 0;
  width: 15px;
  height: 15px;
  accent-color: #1971c2;
  cursor: pointer;
}

:deep(.ProseMirror li[data-type="taskItem"] > div) {
  flex: 1 1 auto;
  min-width: 0;
}

:deep(.ProseMirror hr) {
  width: 100%;
  border: none;
  border-top: 1px solid #e9ecef;
  margin: 14px 0;
}

:deep(.mind-link) {
  color: #1971c2;
  text-decoration: underline;
  text-underline-offset: 2px;
}

:deep(.ProseMirror table) {
  border-collapse: collapse;
  width: 100%;
  margin: 14px 0;
}

:deep(.ProseMirror th),
:deep(.ProseMirror td) {
  border: 1px solid #e9ecef;
  padding: 8px 10px;
  font-size: 14px;
  text-align: left;
}

:deep(.ProseMirror th) {
  background-color: #f8f9fa;
  font-weight: 600;
}

:deep(.ProseMirror .is-empty::before) {
  display: none;
}

.is-canvas-focused:not(.is-readonly) :deep(.ProseMirror > p.is-empty::before),
.is-canvas-focused:not(.is-readonly) :deep(.ProseMirror .mind-callout-content > p.is-empty::before),
.is-canvas-focused:not(.is-readonly) :deep(.ProseMirror > h1.is-empty::before),
.is-canvas-focused:not(.is-readonly) :deep(.ProseMirror > h2.is-empty::before),
.is-canvas-focused:not(.is-readonly) :deep(.ProseMirror > h3.is-empty::before),
.is-canvas-focused:not(.is-readonly) :deep(.ProseMirror > h4.is-empty::before) {
  display: inline;
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

:deep(.ProseMirror.is-dragging-block .ProseMirror-dropcursor) {
  display: none !important;
}

/* Mind Light Style Block Colors (Text + Pill Pastel Background) */
:deep(.ProseMirror [data-block-color="gray"]) { color: #6b7280; }
:deep(.ProseMirror [data-block-color="brown"]) { color: #8d5b4c; }
:deep(.ProseMirror [data-block-color="orange"]) { color: #d9480f; }
:deep(.ProseMirror [data-block-color="yellow"]) { color: #b07200; }
:deep(.ProseMirror [data-block-color="green"]) { color: #2b8a3e; }
:deep(.ProseMirror [data-block-color="blue"]) { color: #1971c2; }
:deep(.ProseMirror [data-block-color="purple"]) { color: #7048e8; }
:deep(.ProseMirror [data-block-color="pink"]) { color: #c2255c; }
:deep(.ProseMirror [data-block-color="red"]) { color: #c92a2a; }

:deep(.ProseMirror [data-block-bg="gray"]) { background-color: #f1f3f5; }
:deep(.ProseMirror [data-block-bg="brown"]) { background-color: #f4eeee; }
:deep(.ProseMirror [data-block-bg="orange"]) { background-color: #fff4e6; }
:deep(.ProseMirror [data-block-bg="yellow"]) { background-color: #fff9db; }
:deep(.ProseMirror [data-block-bg="green"]) { background-color: #ebfbee; }
:deep(.ProseMirror [data-block-bg="blue"]) { background-color: #e7f5ff; }
:deep(.ProseMirror [data-block-bg="purple"]) { background-color: #f3f0ff; }
:deep(.ProseMirror [data-block-bg="pink"]) { background-color: #fff0f6; }
:deep(.ProseMirror [data-block-bg="red"]) { background-color: #fff5f5; }

/* Marquee Lasso Box, Dragged Block Highlight & Group Block Selection */
.mind-editor-root.is-marquee-selecting,
.mind-editor-root.is-marquee-selecting :deep(.ProseMirror),
.mind-editor-root.is-marquee-selecting :deep(.ProseMirror *) {
  user-select: none !important;
  -webkit-user-select: none !important;
}

.mind-marquee-box {
  position: fixed;
  pointer-events: none;
  z-index: 90;
  background-color: rgba(25, 113, 194, 0.08);
  border: 1px solid rgba(25, 113, 194, 0.36);
  border-radius: 4px;
}

:deep(.ProseMirror .mind-block-selected),
:deep(.ProseMirror .mind-block-dragging-source) {
  box-shadow: inset 0 0 0 999px rgba(25, 113, 194, 0.13), inset 0 0 0 1px rgba(25, 113, 194, 0.16);
  border-radius: 6px;
}

:deep(.ProseMirror .mind-block-dragging-source) {
  opacity: 0.78;
}

:deep(.ProseMirror .mind-block-drop-before) {
  box-shadow: 0 -2.5px 0 0 rgba(25, 113, 194, 0.58), inset 0 1px 0 0 rgba(25, 113, 194, 0.24);
  border-radius: 6px;
}

:deep(.ProseMirror .mind-block-drop-after) {
  box-shadow: 0 2.5px 0 0 rgba(25, 113, 194, 0.58), inset 0 -1px 0 0 rgba(25, 113, 194, 0.24);
  border-radius: 6px;
}
</style>
