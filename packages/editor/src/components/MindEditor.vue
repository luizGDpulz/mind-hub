<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useEditor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3';
import type { NodeViewProps } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
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
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  AlertCircle,
  Code,
  Workflow,
  Table as TableIcon,
  Minus,
  LayoutGrid,
  FilePlus,
  Sparkles,
  CodeXml,
} from 'lucide-vue-next';

import {
  DEFAULT_NOTE_TAGS,
  type MindEditorProps,
  type MindEditorEmits,
  type SlashMenuItem,
  type PageReference,
  type BlockColorUpdate,
} from '../types.js';
import FrontmatterHeader from './FrontmatterHeader.vue';
import BlockGutter from './BlockGutter.vue';
import SlashMenu from './SlashMenu.vue';
import PageMentionPopover from './PageMentionPopover.vue';
import BubbleFormattingMenu from './BubbleFormattingMenu.vue';
import MermaidBlockView from './MermaidBlockView.vue';
import CalloutBlockView from './CalloutBlockView.vue';

import { GlobalDragHandle } from '../extensions/drag-handle.js';
import {
  BlockColor,
  applyBlockColorAtPos,
  syncBlockColorsAtSelection,
} from '../extensions/block-color.js';
import { SlashCommand, executeSlashItem } from '../extensions/slash-command.js';
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
  placeholder: "Pressione '/' para comandos ou comece a digitar...",
  pages: () => [],
  enableFrontmatterHeader: true,
});

const emit = defineEmits<MindEditorEmits>();

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

const dropIndicatorState = ref<{
  visible: boolean;
  top: number;
}>({
  visible: false,
  top: 0,
});

const isGutterHovered = ref(false);
const isGutterMenuOpen = ref(false);

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

// Default Slash Menu Items matching Docmost & Notion design
const defaultSlashItems: SlashMenuItem[] = [
  // Sugestões
  {
    id: 'ai-notes',
    title: 'Anotações IA',
    description: 'Gerar notas inteligentes ou transcrição',
    category: 'suggestions',
    icon: markRaw(Sparkles),
    keywords: ['ia', 'ai', 'anotacoes', 'resumo', 'smart'],
    action: () => emit('generateAiNotes'),
  },
  {
    id: 'html-embed',
    title: 'HTML',
    subtitle: 'Integrações',
    badge: 'Novo',
    description: 'Inserir widget HTML ou integração externa',
    category: 'suggestions',
    icon: markRaw(CodeXml),
    keywords: ['html', 'embed', 'integracao', 'iframe', 'widget'],
    action: (editor) =>
      editor.chain().focus().insertContent({ type: 'codeBlock', attrs: { language: 'html' } }).run(),
  },

  // Blocos básicos
  {
    id: 'paragraph',
    title: 'Texto',
    description: 'Comece a escrever texto puro',
    category: 'basic',
    icon: markRaw(Type),
    keywords: ['texto', 'p', 'paragraph'],
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'h1',
    title: 'Título 1',
    shortcut: '#',
    description: 'Título de seção principal',
    category: 'basic',
    icon: markRaw(Heading1),
    keywords: ['h1', 'heading', 'titulo'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    title: 'Título 2',
    shortcut: '##',
    description: 'Subtítulo de seção',
    category: 'basic',
    icon: markRaw(Heading2),
    keywords: ['h2', 'heading', 'subtitulo'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    title: 'Título 3',
    shortcut: '###',
    description: 'Subtítulo menor',
    category: 'basic',
    icon: markRaw(Heading3),
    keywords: ['h3', 'heading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'h4',
    title: 'Título 4',
    shortcut: '####',
    description: 'Subtítulo nível 4',
    category: 'basic',
    icon: markRaw(Heading4),
    keywords: ['h4', 'heading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: 'bullet-list',
    title: 'Lista com marcadores',
    shortcut: '-',
    description: 'Lista com bullets simples',
    category: 'basic',
    icon: markRaw(List),
    keywords: ['lista', 'bullet', 'ul'],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered-list',
    title: 'Lista numerada',
    shortcut: '1.',
    description: 'Lista sequencial numerada',
    category: 'basic',
    icon: markRaw(ListOrdered),
    keywords: ['lista', 'numerada', 'ordenada', 'ordered', 'ol', 'numeros'],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task-list',
    title: 'Lista de tarefas',
    shortcut: '[]',
    description: 'Checklist interativo com caixas de seleção',
    category: 'basic',
    icon: markRaw(ListTodo),
    keywords: ['tarefa', 'task', 'todo', 'check'],
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    title: 'Citação',
    shortcut: '>',
    description: 'Destacar uma citação em bloco',
    category: 'basic',
    icon: markRaw(Quote),
    keywords: ['citacao', 'quote'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code-block',
    title: 'Bloco de código',
    shortcut: '```',
    description: 'Trecho de código com formatação monoespaçada',
    category: 'basic',
    icon: markRaw(Code),
    keywords: ['codigo', 'code', 'snippet'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    title: 'Divisor',
    shortcut: '---',
    description: 'Linha horizontal divisória',
    category: 'basic',
    icon: markRaw(Minus),
    keywords: ['divisor', 'linha', 'hr', 'separador'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },

  // Mídia e Avançado
  {
    id: 'callout',
    title: 'Destaque / Callout',
    description: 'Caixa de alerta, dica ou nota pastel',
    category: 'highlight',
    icon: markRaw(AlertCircle),
    keywords: ['callout', 'nota', 'dica', 'alerta', 'aviso'],
    action: (editor) => editor.chain().focus().setCallout().run(),
  },
  {
    id: 'mermaid',
    title: 'Diagrama Mermaid',
    description: 'Fluxogramas e diagramas interativos SVG',
    category: 'media',
    icon: markRaw(Workflow),
    keywords: ['mermaid', 'diagrama', 'fluxo', 'chart'],
    action: (editor) =>
      editor.chain().focus().insertContent({ type: 'mermaid' }).run(),
  },
  {
    id: 'table',
    title: 'Tabela',
    description: 'Tabela simples com linhas e colunas',
    category: 'advanced',
    icon: markRaw(TableIcon),
    keywords: ['tabela', 'table', 'grid'],
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'database',
    title: 'Banco de Dados',
    description: 'Inserir visualização de tarefas em tabela e kanban',
    category: 'advanced',
    icon: markRaw(LayoutGrid),
    keywords: ['banco', 'database', 'tarefas', 'kanban', 'tasks'],
    action: () => emit('insertDatabaseBlock'),
  },
  {
    id: 'subpage',
    title: 'Subpágina',
    description: 'Criar uma nova subpágina aninhada',
    category: 'advanced',
    icon: markRaw(FilePlus),
    keywords: ['subpagina', 'subpage', 'pagina', 'nota'],
    action: () => emit('createSubpage'),
  },
];

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
      placeholder: props.placeholder,
    }),
    GlobalDragHandle.configure({
      onPositionChange: (pos) => {
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
      onDropIndicatorChange: (indicator) => {
        dropIndicatorState.value = indicator ?? { visible: false, top: 0 };
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
    MarkdownShortcuts,
  ],
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
    } else if (typeof val === 'string') {
      const current = editor.value.getHTML();
      if (val !== current) {
        editor.value.commands.setContent(val, false);
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
  const pos = gutterState.value.nodePos;
  const { state, view } = editor.value;
  const node = state.doc.nodeAt(pos);
  if (!node) return;

  if (action === 'delete') {
    editor.value.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
    gutterState.value.visible = false;
  } else if (action === 'duplicate') {
    editor.value.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
  } else if (action === 'moveUp') {
    if (pos > 0) {
      const $pos = state.doc.resolve(pos);
      const prevNode = $pos.nodeBefore;
      if (prevNode) {
        const prevPos = pos - prevNode.nodeSize;
        const tr = state.tr;
        tr.delete(pos, pos + node.nodeSize);
        tr.insert(prevPos, node);
        view.dispatch(tr);
        gutterState.value.nodePos = prevPos;
      }
    }
  } else if (action === 'moveDown') {
    const afterPos = pos + node.nodeSize;
    if (afterPos < state.doc.content.size) {
      const $after = state.doc.resolve(afterPos);
      const nextNode = $after.nodeAfter;
      if (nextNode) {
        const tr = state.tr;
        tr.delete(pos, pos + node.nodeSize);
        tr.insert(pos + nextNode.nodeSize, node);
        view.dispatch(tr);
        gutterState.value.nodePos = pos + nextNode.nodeSize;
      }
    }
  }
}

function handleGutterSetColor(update: BlockColorUpdate): void {
  if (!editor.value) return;
  const pos = gutterState.value.nodePos;
  const applied = applyBlockColorAtPos(editor.value, pos, update);
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
  const pos = gutterState.value.nodePos;
  const node = editor.value.state.doc.nodeAt(pos);
  const savedColors: BlockColorUpdate = {
    textColor: (node?.attrs?.blockTextColor as BlockColorUpdate['textColor']) ?? null,
    backgroundColor:
      (node?.attrs?.blockBackgroundColor as BlockColorUpdate['backgroundColor']) ?? null,
  };

  let textOffset = pos;
  let cur: PmNode | null = node ?? null;
  while (cur && !cur.isTextblock && cur.firstChild) {
    cur = cur.firstChild;
    textOffset += 1;
  }
  const cursorPos = cur?.isTextblock
    ? Math.min(textOffset + 1, editor.value.state.doc.content.size)
    : pos + 1;

  editor.value.chain().focus().setTextSelection(cursorPos).run();

  if (node?.type.name === 'listItem' && type !== 'bulletList' && type !== 'orderedList') {
    editor.value.chain().focus().liftListItem('listItem').run();
  } else if (node?.type.name === 'taskItem' && type !== 'taskList') {
    editor.value.chain().focus().liftListItem('taskItem').run();
  } else if (node?.type.name === 'blockquote' && type !== 'blockquote') {
    editor.value.chain().focus().lift('blockquote').run();
  } else if (node?.type.name === 'callout' && type !== 'callout') {
    editor.value.chain().focus().unsetCallout().run();
  }

  if (type === 'h1') editor.value.chain().focus().setHeading({ level: 1 }).run();
  else if (type === 'h2') editor.value.chain().focus().setHeading({ level: 2 }).run();
  else if (type === 'h3') editor.value.chain().focus().setHeading({ level: 3 }).run();
  else if (type === 'h4') editor.value.chain().focus().setHeading({ level: 4 }).run();
  else if (type === 'bulletList') {
    if (!editor.value.isActive('bulletList')) editor.value.chain().focus().toggleBulletList().run();
  } else if (type === 'orderedList') {
    if (!editor.value.isActive('orderedList')) editor.value.chain().focus().toggleOrderedList().run();
  } else if (type === 'taskList') {
    if (!editor.value.isActive('taskList')) editor.value.chain().focus().toggleTaskList().run();
  } else if (type === 'blockquote') {
    if (!editor.value.isActive('blockquote')) editor.value.chain().focus().toggleBlockquote().run();
  } else if (type === 'codeBlock') {
    if (!editor.value.isActive('codeBlock')) editor.value.chain().focus().toggleCodeBlock().run();
  } else if (type === 'callout') editor.value.chain().focus().setCallout().run();
  else if (type === 'mermaid') editor.value.chain().focus().insertContent({ type: 'mermaid' }).run();
  else editor.value.chain().focus().setParagraph().run();

  if (type !== 'mermaid' && (savedColors.textColor || savedColors.backgroundColor)) {
    syncBlockColorsAtSelection(editor.value, savedColors);
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

// Note title handlers (kept strictly independent from block nodes)
function handleTitleInput(event: Event): void {
  const nextTitle = (event.target as HTMLInputElement).value;
  emit('update:title', nextTitle);
  if (props.frontmatter) {
    emit('update:frontmatter', { ...props.frontmatter, title: nextTitle });
  }
}

function focusEditorStart(): void {
  editor.value?.chain().focus('start').run();
}

// Global Save Keyboard Shortcut (Ctrl+S / Cmd+S)
function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    emit('save');
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div
    class="mind-editor-root"
    data-testid="mind-editor-root"
    @keydown="handleKeydown"
  >
    <!-- Separate Note Title Header (outside ProseMirror block canvas) -->
    <div v-if="showTitle" class="mind-note-title-bar" data-testid="mind-note-title-bar">
      <input
        :value="title ?? frontmatter?.title ?? ''"
        type="text"
        class="mind-note-title-input"
        data-testid="mind-note-title-input"
        :placeholder="titlePlaceholder"
        :readonly="readOnly"
        aria-label="Título da nota"
        @input="handleTitleInput"
        @keydown.enter.prevent="focusEditorStart"
        @keydown.down.prevent="focusEditorStart"
      >
    </div>

    <!-- Frontmatter Header (Collapsed by default; Visual & Raw YAML modes) -->
    <FrontmatterHeader
      v-if="enableFrontmatterHeader && frontmatter"
      :model-value="frontmatter"
      :default-tags="defaultTags"
      :read-only="readOnly"
      @update:model-value="emit('update:frontmatter', $event)"
    />

    <!-- Editor Canvas Surface -->
    <div
      class="mind-editor-canvas-container"
      :class="{ 'is-readonly': readOnly }"
    >
      <!-- Block Gutter (+ and ⠿) on Left Margin -->
      <BlockGutter
        v-if="editor && !readOnly"
        :visible="gutterState.visible"
        :top="gutterState.top"
        :node-type="gutterState.nodeType"
        :node-text-color="gutterState.textColor"
        :node-bg-color="gutterState.bgColor"
        :basic-blocks-only="basicBlocksOnly"
        @add-block="handleAddBlockBelow"
        @action="handleGutterAction"
        @turn-into="handleGutterTurnInto"
        @set-color="handleGutterSetColor"
        @hover="handleGutterHover"
        @menu-toggle="handleGutterMenuToggle"
      />

      <!-- Notion-like Horizontal Drop Indicator Bar (expanded left gutter reach) -->
      <div
        v-if="dropIndicatorState.visible"
        class="mind-drop-indicator"
        data-testid="block-drop-indicator"
        :style="{ top: `${dropIndicatorState.top}px` }"
      >
        <span class="mind-drop-indicator-dot" />
      </div>

      <!-- Bubble Formatting Menu Inline on Text Selection -->
      <BubbleFormattingMenu
        v-if="editor && !readOnly"
        :editor="editor"
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
}

.mind-note-title-bar {
  margin-bottom: 10px;
}

.mind-note-title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: #111827;
  padding: 2px 0;
  margin: 0;
  font-family: inherit;
}

.mind-note-title-input::placeholder {
  color: #ced4da;
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
  outline: none;
  min-height: 320px;
  line-height: 1.6;
  font-size: 15px;
  color: #111827;
}

/* Each basic block treated as a clean individual pill row (no shift when colored) */
:deep(.ProseMirror > p) {
  margin: 2px -10px;
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
  margin: 14px -10px 4px;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror > h2) {
  font-size: 22px;
  line-height: 1.35;
  font-weight: 600;
  color: #111827;
  margin: 12px -10px 3px;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror > h3) {
  font-size: 18px;
  line-height: 1.4;
  font-weight: 600;
  color: #111827;
  margin: 10px -10px 2px;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background-color 0.12s ease;
}

:deep(.ProseMirror > h4) {
  font-size: 16px;
  line-height: 1.45;
  font-weight: 600;
  color: #111827;
  margin: 8px -10px 2px;
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
  margin: 6px -10px;
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
  margin: 8px -10px;
  overflow-x: auto;
  transition: background-color 0.12s ease;
}

/* List items rendered as independent full-row rounded pills (including marker 1. / 2. / •) */
:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  list-style: none;
  padding-left: 0;
  margin: 2px 0;
}

:deep(.ProseMirror li > ul),
:deep(.ProseMirror li > ol) {
  padding-left: 24px;
  margin: 2px 0 0;
}

:deep(.ProseMirror ol) {
  counter-reset: mind-ol;
}

:deep(.ProseMirror ol > li),
:deep(.ProseMirror ul:not([data-type="taskList"]) > li) {
  position: relative;
  margin: 2px -10px;
  padding: 4px 10px 4px 34px;
  border-radius: 6px;
  line-height: 1.6;
  min-height: 32px;
  box-sizing: border-box;
  transition: background-color 0.12s ease;
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
  left: 12px;
  top: 4px;
  width: 16px;
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

:deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
  margin: 2px 0;
}

:deep(.ProseMirror li[data-type="taskItem"]) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 2px -10px;
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
  border: none;
  border-top: 1px solid #e9ecef;
  margin: 20px 0;
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

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #868e96;
  pointer-events: none;
  height: 0;
}

/* Ergonomic Left-Expanded Drop Indicator */
.mind-drop-indicator {
  position: absolute;
  left: -20px;
  right: -10px;
  height: 3px;
  background-color: #1971c2;
  border-radius: 2px;
  pointer-events: none;
  z-index: 40;
  transform: translateY(-50%);
  box-shadow: 0 0 0 1px rgba(25, 113, 194, 0.14);
}

.mind-drop-indicator-dot {
  position: absolute;
  left: -4px;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background-color: #ffffff;
  border: 2px solid #1971c2;
  transform: translateY(-50%);
  box-sizing: border-box;
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
</style>
