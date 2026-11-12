<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, watch, type Component } from 'vue';
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
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
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

import type { MindEditorProps, MindEditorEmits, SlashMenuItem, PageReference } from '../types.js';
import FrontmatterHeader from './FrontmatterHeader.vue';
import BlockGutter from './BlockGutter.vue';
import SlashMenu from './SlashMenu.vue';
import PageMentionPopover from './PageMentionPopover.vue';
import BubbleFormattingMenu from './BubbleFormattingMenu.vue';
import MermaidBlockView from './MermaidBlockView.vue';
import CalloutBlockView from './CalloutBlockView.vue';

import { GlobalDragHandle } from '../extensions/drag-handle.js';
import { SlashCommand, executeSlashItem } from '../extensions/slash-command.js';
import { PageMention } from '../extensions/page-mention.js';
import { MermaidNode } from '../extensions/mermaid-node.js';
import { CalloutNode } from '../extensions/callout-node.js';
import { MarkdownShortcuts } from '../extensions/markdown-shortcuts.js';

const props = withDefaults(defineProps<MindEditorProps>(), {
  modelValue: '',
  frontmatter: () => ({}),
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
}>({
  visible: false,
  top: 0,
  nodePos: 0,
});

const isGutterHovered = ref(false);
const isGutterMenuOpen = ref(false);

function handleGutterHover(hovered: boolean) {
  isGutterHovered.value = hovered;
}

function handleGutterMenuToggle(isOpen: boolean) {
  isGutterMenuOpen.value = isOpen;
}

function handleCanvasMouseLeave(event: MouseEvent) {
  const related = event.relatedTarget as HTMLElement | null;
  if (
    related &&
    (related.closest('.mind-block-gutter-shell') ||
      related.closest('.mind-editor-canvas-container'))
  ) {
    return;
  }
  if (!isGutterHovered.value && !isGutterMenuOpen.value) {
    gutterState.value.visible = false;
  }
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
    id: 'code-block',
    title: 'Bloco de código',
    shortcut: '```',
    description: 'Trecho de código com formatação monoespaçada',
    category: 'advanced',
    icon: markRaw(Code),
    keywords: ['codigo', 'code', 'snippet'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
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

const activeSlashItems = computed(() => [
  ...defaultSlashItems,
  ...(props.customSlashItems ?? []),
]);

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

const editor = useEditor({
  editable: !props.readOnly,
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
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
        if (!pos) {
          if (!isGutterHovered.value && !isGutterMenuOpen.value) {
            gutterState.value.visible = false;
          }
          return;
        }
        gutterState.value = {
          visible: true,
          top: pos.top,
          nodePos: pos.nodePos,
        };
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
    MarkdownShortcuts,
  ],
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML());
    emit('update:json', ed.getJSON());
  },
});

// Synchronize external modelValue changes
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return;
    if (typeof val === 'object' && val !== null) {
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
  }
);

// Gutter actions
function handleAddBlockBelow(): void {
  if (!editor.value) return;
  const pos = gutterState.value.nodePos;
  editor.value.chain().focus().insertContentAt(pos + 1, { type: 'paragraph' }).run();
}

function handleGutterAction(action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete'): void {
  if (!editor.value) return;
  const pos = gutterState.value.nodePos;
  const { state, view } = editor.value;
  const $pos = state.doc.resolve(pos);
  const node = $pos.nodeAfter || $pos.parent;
  if (!node) return;

  if (action === 'delete') {
    editor.value.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
    gutterState.value.visible = false;
  } else if (action === 'duplicate') {
    editor.value.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
  } else if (action === 'moveUp') {
    const beforePos = $pos.before();
    if (beforePos > 0) {
      const prevNode = state.doc.resolve(beforePos).nodeBefore;
      if (prevNode) {
        const tr = state.tr;
        tr.delete(pos, pos + node.nodeSize);
        tr.insert(beforePos - prevNode.nodeSize, node);
        view.dispatch(tr);
      }
    }
  } else if (action === 'moveDown') {
    const afterPos = pos + node.nodeSize;
    if (afterPos < state.doc.content.size) {
      const nextNode = state.doc.resolve(afterPos).nodeAfter;
      if (nextNode) {
        const tr = state.tr;
        tr.delete(pos, pos + node.nodeSize);
        tr.insert(pos + nextNode.nodeSize, node);
        view.dispatch(tr);
      }
    }
  }
}

function handleGutterTurnInto(type: string): void {
  if (!editor.value) return;
  const pos = gutterState.value.nodePos;
  editor.value.chain().focus().setTextSelection(pos + 1).run();

  if (type === 'h1') editor.value.chain().focus().toggleHeading({ level: 1 }).run();
  else if (type === 'h2') editor.value.chain().focus().toggleHeading({ level: 2 }).run();
  else if (type === 'h3') editor.value.chain().focus().toggleHeading({ level: 3 }).run();
  else if (type === 'h4') editor.value.chain().focus().toggleHeading({ level: 4 }).run();
  else if (type === 'bulletList') editor.value.chain().focus().toggleBulletList().run();
  else if (type === 'taskList') editor.value.chain().focus().toggleTaskList().run();
  else if (type === 'callout') editor.value.chain().focus().setCallout().run();
  else if (type === 'mermaid') editor.value.chain().focus().insertContent({ type: 'mermaid' }).run();
  else editor.value.chain().focus().setParagraph().run();
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
    <!-- Frontmatter Header (Visual & Raw YAML modes) -->
    <FrontmatterHeader
      v-if="enableFrontmatterHeader && frontmatter"
      :model-value="frontmatter"
      :read-only="readOnly"
      @update:model-value="emit('update:frontmatter', $event)"
    />

    <!-- Editor Canvas Surface -->
    <div
      class="mind-editor-canvas-container"
      :class="{ 'is-readonly': readOnly }"
      @mouseleave="handleCanvasMouseLeave"
    >
      <!-- Block Gutter (+ and ⠿) on Left Margin -->
      <BlockGutter
        v-if="editor && !readOnly"
        :editor="editor"
        :visible="gutterState.visible"
        :top="gutterState.top"
        :node-pos="gutterState.nodePos"
        @add-block="handleAddBlockBelow"
        @action="handleGutterAction"
        @turn-into="handleGutterTurnInto"
        @hover="handleGutterHover"
        @menu-toggle="handleGutterMenuToggle"
      />

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
  padding: 24px 64px 80px;
  background-color: #ffffff;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
  outline: none;
  min-height: 320px;
  line-height: 1.65;
  font-size: 15px;
  color: #111827;
}

:deep(.ProseMirror p) {
  margin: 0 0 8px 0;
}

:deep(.ProseMirror h1) {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 24px 0 8px 0;
}

:deep(.ProseMirror h2) {
  font-size: 22px;
  font-weight: 600;
  color: #111827;
  margin: 20px 0 6px 0;
}

:deep(.ProseMirror h3) {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 16px 0 4px 0;
}

:deep(.ProseMirror h4) {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 14px 0 4px 0;
}

:deep(.slash-ghost-hint) {
  color: #787774;
  pointer-events: none;
  user-select: none;
  margin-left: 2px;
  font-style: normal;
  font-weight: 400;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #dee2e6;
  color: #495057;
  padding-left: 14px;
  margin: 12px 0;
  font-style: normal;
}

:deep(.ProseMirror pre) {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  margin: 12px 0;
  overflow-x: auto;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 22px;
  margin: 8px 0;
}

:deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 4px;
}

:deep(.ProseMirror li[data-type="taskItem"]) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

:deep(.ProseMirror li[data-type="taskItem"] input[type="checkbox"]) {
  margin-top: 5px;
  accent-color: #1971c2;
  cursor: pointer;
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
</style>
