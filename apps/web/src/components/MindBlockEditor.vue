<template>
  <div class="tiptap-editor-shell" data-testid="tiptap-block-editor">
    <!-- Block-Level Left Gutter Controls (+ and ⠿) following active line (Notion-like) -->
    <div class="block-row-shell">
      <div
        v-if="!readOnlyMode"
        class="block-left-gutter is-visible"
        role="toolbar"
        aria-label="Block line controls"
        :style="{ top: `${gutterTop}px` }"
      >
        <button
          type="button"
          class="gutter-icon-btn"
          title="Adicionar linha abaixo (/)"
          aria-label="Add block below"
          data-testid="block-gutter-add-btn"
          @click="handleGutterAddBlock"
        >
          <Plus :size="14" />
        </button>
        <button
          type="button"
          class="gutter-icon-btn"
          title="Ações do bloco e transformar tipo"
          aria-label="Open block actions and turn-into menu"
          data-testid="block-gutter-handle-btn"
          @click="toggleBlockHandleMenu"
        >
          <GripVertical :size="14" />
        </button>
      </div>

      <!-- Floating Left Handle Menu: Move Up/Down, Duplicate, Delete & Turn Into -->
      <div
        v-if="showBlockHandleMenu && !readOnlyMode"
        class="mind-floating-popover block-handle-popover"
        :style="{ top: `${gutterTop}px` }"
        data-testid="block-handle-menu"
      >
        <div class="mind-popover-section-title">AÇÕES DO BLOCO</div>
        <div
          class="mind-popover-row"
          data-testid="block-move-up-btn"
          @click="moveActiveBlock(-1)"
        >
          <span class="mind-icon-box-28">↑</span>
          <div>
            <div class="popover-item-title">Subir bloco</div>
            <div class="popover-item-desc">Mover este bloco para cima</div>
          </div>
        </div>
        <div
          class="mind-popover-row"
          data-testid="block-move-down-btn"
          @click="moveActiveBlock(1)"
        >
          <span class="mind-icon-box-28">↓</span>
          <div>
            <div class="popover-item-title">Descer bloco</div>
            <div class="popover-item-desc">Mover este bloco para baixo</div>
          </div>
        </div>
        <div
          class="mind-popover-row"
          data-testid="block-duplicate-btn"
          @click="duplicateActiveBlock"
        >
          <span class="mind-icon-box-28"><Copy :size="14" /></span>
          <div class="popover-item-title">Duplicar bloco</div>
        </div>
        <div
          class="mind-popover-row text-danger-row"
          data-testid="block-delete-btn"
          @click="deleteActiveBlock"
        >
          <span class="mind-icon-box-28"><Trash2 :size="14" /></span>
          <div class="popover-item-title">Excluir bloco</div>
        </div>

        <div class="mind-popover-section-title">TRANSFORMAR EM (TURN INTO)</div>
        <div
          v-for="cmd in basicSlashCommands"
          :key="`turn-${cmd.id}`"
          class="mind-popover-row"
          :data-testid="`turn-into-${cmd.id}`"
          @click="turnActiveLineInto(cmd.id)"
        >
          <span class="mind-icon-box-28">{{ cmd.monogram ?? 'A' }}</span>
          <div class="popover-item-title">{{ cmd.label }}</div>
        </div>
      </div>

      <!-- Notion-like Floating Bubble Menu for Selected Text Formatting -->
      <div
        v-if="showBubbleMenu && !readOnlyMode"
        class="mind-floating-popover mind-bubble-menu"
        :style="{ top: `${bubbleMenuCoords.top}px`, left: `${bubbleMenuCoords.left}px` }"
        data-testid="editor-bubble-menu"
        role="toolbar"
        aria-label="Barra flutuante de formatação"
      >
        <div class="bubble-menu-row">
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('bold') }"
            title="Negrito (Ctrl+B)"
            @click="editor?.chain().focus().toggleBold().run()"
          >
            <Bold :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('italic') }"
            title="Itálico (Ctrl+I)"
            @click="editor?.chain().focus().toggleItalic().run()"
          >
            <Italic :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('underline') }"
            title="Sublinhado (Ctrl+U)"
            @click="editor?.chain().focus().toggleUnderline().run()"
          >
            <UnderlineIcon :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('strike') }"
            title="Tachado (Ctrl+Shift+S)"
            @click="editor?.chain().focus().toggleStrike().run()"
          >
            <Strikethrough :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('code') }"
            title="Código inline"
            @click="editor?.chain().focus().toggleCode().run()"
          >
            <Code :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('link') }"
            title="Inserir/Editar Link"
            @click="handleToggleLink"
          >
            <LinkIcon :size="14" />
          </button>

          <span class="bubble-menu-sep" />

          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
            title="Título H1"
            @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
          >
            <Heading1 :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
            title="Título H2"
            @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
          >
            <Heading2 :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
            title="Título H3"
            @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
          >
            <Heading3 :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('bulletList') }"
            title="Lista com marcadores"
            @click="editor?.chain().focus().toggleBulletList().run()"
          >
            <List :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('taskList') }"
            title="Lista de tarefas"
            @click="editor?.chain().focus().toggleTaskList().run()"
          >
            <ListTodo :size="14" />
          </button>
          <button
            type="button"
            class="bubble-menu-btn"
            :class="{ 'is-active': editor?.isActive('blockquote') }"
            title="Citação / Callout"
            @click="editor?.chain().focus().toggleBlockquote().run()"
          >
            <Quote :size="14" />
          </button>
        </div>
      </div>

      <!-- FLOATING SLASH COMMAND MENU (Notion-like with Keyboard Navigation) -->
      <div
        v-if="showSlashMenu && !readOnlyMode"
        class="mind-floating-popover slash-command-popover"
        :style="slashPopoverStyle"
        data-testid="slash-command-menu"
      >
        <div class="slash-filter-bar">
          <span class="slash-prefix">/</span>
          <input
            ref="slashInputRef"
            v-model="slashFilter"
            type="text"
            placeholder="Filtrar blocos (H1, Tarefa, Código, Tabela, Subpágina)..."
            class="slash-filter-input"
            data-testid="slash-filter-input"
            @keydown="handleSlashInputKeydown"
          />
        </div>

        <div class="slash-commands-list" role="listbox">
          <div
            v-for="(cmd, idx) in filteredSlashCommands"
            :key="cmd.id"
            class="mind-popover-row"
            :class="{ 'is-selected': idx === selectedSlashIndex }"
            :data-testid="`slash-item-${cmd.id}`"
            role="option"
            :aria-selected="idx === selectedSlashIndex"
            @mouseenter="selectedSlashIndex = idx"
            @click="applySlashCommand(cmd.id)"
          >
            <span class="mind-icon-box-32">{{ cmd.monogram ?? 'A' }}</span>
            <div class="popover-text-col">
              <div class="popover-item-title">{{ cmd.label }}</div>
              <div class="popover-item-desc">{{ cmd.description }}</div>
            </div>
          </div>
          <div v-if="filteredSlashCommands.length === 0" class="slash-empty-state">
            Nenhum bloco encontrado para "{{ slashFilter }}"
          </div>
        </div>
      </div>

      <!-- FLOATING @ MENTION MENU (Users & Pages with Keyboard Navigation) -->
      <div
        v-if="showMentionMenu && !readOnlyMode"
        class="mind-floating-popover mention-popover"
        :style="mentionPopoverStyle"
        data-testid="mention-menu-popover"
      >
        <div class="slash-filter-bar">
          <span class="slash-prefix">@</span>
          <input
            ref="mentionInputRef"
            v-model="mentionFilter"
            type="text"
            placeholder="Mencionar pessoa ou página..."
            class="slash-filter-input"
            data-testid="mention-filter-input"
            @keydown="handleMentionInputKeydown"
          />
        </div>

        <div class="mind-popover-section-title">USUÁRIOS</div>
        <div
          v-for="(user, idx) in filteredMentionUsers"
          :key="user.id"
          class="mind-popover-row"
          :class="{ 'is-selected': mentionTargetType === 'user' && idx === selectedMentionIndex }"
          :data-testid="`mention-user-${user.id}`"
          @click="insertUserMention(user.name)"
        >
          <span class="mention-user-avatar">{{ user.initials }}</span>
          <span class="popover-item-title">{{ user.name }}</span>
        </div>

        <div class="mind-popover-section-title">PÁGINAS</div>
        <div
          v-for="(pageItem, idx) in filteredMentionPages"
          :key="pageItem.id"
          class="mind-popover-row"
          :class="{ 'is-selected': mentionTargetType === 'page' && idx === selectedMentionIndex }"
          :data-testid="`mention-page-${pageItem.id}`"
          @click="insertPageMention(pageItem.icon, pageItem.title)"
        >
          <span class="mind-icon-box-28">{{ pageItem.icon }}</span>
          <span class="popover-item-title">{{ pageItem.title }}</span>
        </div>
      </div>

      <!-- Single Tiptap v2 Rich Block Canvas (prevents DOM detachment, closes #37) -->
      <div
        class="tiptap-canvas"
        :class="{ 'read-mode-surface': readOnlyMode }"
        :data-testid="readOnlyMode ? 'editor-read-mode' : 'editor-edit-mode'"
        @keydown="handleCanvasKeydown"
      >
        <editor-content :editor="editor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import {
  Bold,
  Code,
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListTodo,
  Plus,
  Quote,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-vue-next';
import {
  createEditorExtensions,
  createEditorSchema,
  toSchemaSafeDoc,
} from '../editor/editor-extensions.js';
import {
  DEFAULT_SLASH_COMMANDS,
  type DiagramKind,
  type SlashCommandDefinition,
  type TiptapDoc,
  type TiptapNode,
} from '@mind-hub/shared';

const props = defineProps<{
  modelValue: TiptapDoc;
  markdownValue: string;
  readOnlyMode?: boolean;
  mentionPages?: ReadonlyArray<{ id: string; title: string; icon: string }>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', doc: TiptapDoc): void;
  (e: 'update:markdownValue', md: string): void;
  (e: 'insert-database-block'): void;
  (e: 'insert-diagram-block', kind: DiagramKind): void;
  (e: 'create-subpage'): void;
}>();

const showSlashMenu = ref(false);
const showMentionMenu = ref(false);
const showBlockHandleMenu = ref(false);
const showBubbleMenu = ref(false);
const bubbleMenuCoords = ref<{ top: number; left: number }>({ top: 0, left: 0 });
const slashFilter = ref('');
const mentionFilter = ref('');
const selectedSlashIndex = ref(0);
const selectedMentionIndex = ref(0);
const mentionTargetType = ref<'user' | 'page'>('user');
const activeBlockIndex = ref(0);
const gutterTop = ref(4);

const slashInputRef = ref<HTMLInputElement | null>(null);
const mentionInputRef = ref<HTMLInputElement | null>(null);

let isLocalInput = false;
let emitDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastEmittedJsonString = '';

const basicSlashCommands = computed<SlashCommandDefinition[]>(() =>
  DEFAULT_SLASH_COMMANDS.filter(
    (c) => c.category === 'basic' || c.category === 'code' || c.category === 'rich',
  ),
);

const filteredSlashCommands = computed<SlashCommandDefinition[]>(() => {
  const q = slashFilter.value.trim().toLowerCase();
  if (!q) return [...DEFAULT_SLASH_COMMANDS];
  return DEFAULT_SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q),
  );
});

watch(filteredSlashCommands, () => {
  selectedSlashIndex.value = 0;
});

const defaultMentionUsers = [
  { id: 'u-cori', name: 'Cori', initials: 'CO' },
  { id: 'u-philip', name: 'Philip Okugbe', initials: 'PO' },
  { id: 'u-barbara', name: 'Barbara', initials: 'BA' },
  { id: 'u-john', name: 'John', initials: 'JO' },
];

const defaultMentionPages = [
  { id: 'ref-comp', title: 'Competitor Analysis', icon: '🧷' },
  { id: 'ref-val', title: 'Company Values', icon: '💡' },
  { id: 'ref-evt', title: 'Company Events', icon: '🎉' },
];

const filteredMentionUsers = computed(() => {
  const q = mentionFilter.value.trim().toLowerCase();
  if (!q) return defaultMentionUsers;
  return defaultMentionUsers.filter((u) => u.name.toLowerCase().includes(q));
});

const filteredMentionPages = computed(() => {
  const combined = [
    ...defaultMentionPages,
    ...(props.mentionPages ?? []).filter(
      (p) => !defaultMentionPages.some((d) => d.title === p.title),
    ),
  ];
  const q = mentionFilter.value.trim().toLowerCase();
  if (!q) return combined;
  return combined.filter((p) => p.title.toLowerCase().includes(q));
});

const editorExtensions = createEditorExtensions();
const editorSchema = createEditorSchema(editorExtensions);

function resolveSafeDoc(doc: TiptapDoc, markdown: string): TiptapDoc {
  const result = toSchemaSafeDoc(doc, editorSchema, markdown);
  if (result.dropped.length > 0 || result.usedMarkdownFallback) {
    console.warn('[mind-hub/editor] document sanitized before render', {
      dropped: result.dropped,
      usedMarkdownFallback: result.usedMarkdownFallback,
    });
  }
  return result.doc;
}

const popoverCoords = ref<{ top: number; left: number }>({ top: 40, left: 24 });

const slashPopoverStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${popoverCoords.value.top}px`,
  left: `${popoverCoords.value.left}px`,
  zIndex: 60,
}));

const mentionPopoverStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${popoverCoords.value.top}px`,
  left: `${popoverCoords.value.left}px`,
  zIndex: 60,
}));

function updateCursorCoords(): void {
  if (!editor.value) return;
  try {
    const { from } = editor.value.state.selection;
    const coords = editor.value.view.coordsAtPos(from);
    const container = editor.value.view.dom.closest('.tiptap-editor-shell') as HTMLElement | null;
    if (container && coords) {
      const rect = container.getBoundingClientRect();
      const top = Math.max(10, coords.bottom - rect.top + 6);
      const left = Math.max(10, Math.min(coords.left - rect.left, rect.width - 340));
      popoverCoords.value = { top, left };
    }
  } catch {
    // fallback
  }
}

function updateGutterPosition(): void {
  if (!editor.value) return;
  try {
    const { from } = editor.value.state.selection;
    const coords = editor.value.view.coordsAtPos(from);
    const container = editor.value.view.dom.closest('.tiptap-editor-shell') as HTMLElement | null;
    if (container && coords) {
      const rect = container.getBoundingClientRect();
      gutterTop.value = Math.max(4, coords.top - rect.top - 2);
    }
  } catch {
    // fallback
  }
}

function updateBubbleMenuPosition(): void {
  const ed = editor.value;
  if (!ed || props.readOnlyMode) {
    showBubbleMenu.value = false;
    return;
  }
  const { from, to, empty } = ed.state.selection;
  if (empty || from === to) {
    showBubbleMenu.value = false;
    return;
  }

  try {
    const coords = ed.view.coordsAtPos(from);
    const container = ed.view.dom.closest('.tiptap-editor-shell') as HTMLElement | null;
    if (container && coords) {
      const rect = container.getBoundingClientRect();
      bubbleMenuCoords.value = {
        top: Math.max(0, coords.top - rect.top - 46),
        left: Math.max(10, Math.min(coords.left - rect.left, rect.width - 340)),
      };
    }
    showBubbleMenu.value = true;
  } catch {
    showBubbleMenu.value = true;
  }
}

/**
 * 0ms Latency Engine: Local changes trigger instant ProseMirror mutations;
 * serialization and persistence to store are debounced to eliminate typing lag.
 */
const editor = useEditor({
  content: resolveSafeDoc(props.modelValue, props.markdownValue),
  editable: !props.readOnlyMode,
  extensions: editorExtensions,
  onUpdate: ({ editor: activeEditor }) => {
    isLocalInput = true;
    updateGutterPosition();
    updateBubbleMenuPosition();

    // Check if user is typing after slash in active line
    if (showSlashMenu.value) {
      try {
        const { from } = activeEditor.state.selection;
        const text = activeEditor.state.doc.resolve(from).parent.textContent;
        const slashIdx = text.lastIndexOf('/');
        if (slashIdx !== -1) {
          slashFilter.value = text.slice(slashIdx + 1);
        }
      } catch {
        // ignore
      }
    }

    if (emitDebounceTimer) {
      clearTimeout(emitDebounceTimer);
    }

    emitDebounceTimer = setTimeout(() => {
      const json = activeEditor.getJSON() as TiptapDoc;
      lastEmittedJsonString = JSON.stringify(json);
      emit('update:modelValue', json);
      setTimeout(() => {
        isLocalInput = false;
      }, 50);
    }, 250);
  },
  onSelectionUpdate: () => {
    updateGutterPosition();
    updateBubbleMenuPosition();
  },
});

watch(
  () => props.readOnlyMode,
  (isRead) => {
    editor.value?.setEditable(!isRead);
    if (isRead) {
      showBubbleMenu.value = false;
      showSlashMenu.value = false;
      showMentionMenu.value = false;
      showBlockHandleMenu.value = false;
    }
  },
);

watch(
  () => props.modelValue,
  (newDoc) => {
    // Never interrupt the user while actively typing
    if (isLocalInput) return;
    if (!editor.value) return;
    const incomingJson = JSON.stringify(newDoc);
    if (incomingJson === lastEmittedJsonString) return;
    const currentJson = JSON.stringify(editor.value.getJSON());
    if (currentJson !== incomingJson) {
      editor.value.commands.setContent(resolveSafeDoc(newDoc, props.markdownValue), false);
    }
  },
);

function handleCanvasKeydown(event: KeyboardEvent): void {
  // Slash menu keyboard navigation
  if (showSlashMenu.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedSlashIndex.value =
        (selectedSlashIndex.value + 1) % Math.max(1, filteredSlashCommands.value.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedSlashIndex.value =
        (selectedSlashIndex.value - 1 + filteredSlashCommands.value.length) %
        Math.max(1, filteredSlashCommands.value.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = filteredSlashCommands.value[selectedSlashIndex.value];
      if (target) {
        applySlashCommand(target.id);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      showSlashMenu.value = false;
      return;
    }
  }

  // Mention menu keyboard navigation
  if (showMentionMenu.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedMentionIndex.value =
        (selectedMentionIndex.value + 1) % Math.max(1, filteredMentionUsers.value.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedMentionIndex.value =
        (selectedMentionIndex.value - 1 + filteredMentionUsers.value.length) %
        Math.max(1, filteredMentionUsers.value.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const user = filteredMentionUsers.value[selectedMentionIndex.value];
      if (user) {
        insertUserMention(user.name);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      showMentionMenu.value = false;
      return;
    }
  }

  // Triggering Slash commands
  if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
    nextTick(() => {
      updateCursorCoords();
      selectedSlashIndex.value = 0;
      slashFilter.value = '';
      showSlashMenu.value = true;
      showMentionMenu.value = false;
      showBlockHandleMenu.value = false;
    });
  } else if (event.key === '@' && !event.ctrlKey && !event.metaKey) {
    nextTick(() => {
      updateCursorCoords();
      selectedMentionIndex.value = 0;
      mentionFilter.value = '';
      showMentionMenu.value = true;
      showSlashMenu.value = false;
      showBlockHandleMenu.value = false;
    });
  } else if (event.key === 'Escape') {
    showSlashMenu.value = false;
    showMentionMenu.value = false;
    showBlockHandleMenu.value = false;
  }
}

function handleSlashInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Escape') {
    handleCanvasKeydown(event);
  }
}

function handleMentionInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Escape') {
    handleCanvasKeydown(event);
  }
}

function handleGutterAddBlock(): void {
  const ed = editor.value;
  if (!ed) return;

  // Insert a new paragraph below current block and set focus
  ed.chain().focus().createParagraphNear().run();
  nextTick(() => {
    updateCursorCoords();
    updateGutterPosition();
    selectedSlashIndex.value = 0;
    slashFilter.value = '';
    showSlashMenu.value = true;
    showBlockHandleMenu.value = false;
  });
}

function toggleBlockHandleMenu(): void {
  updateGutterPosition();
  showBlockHandleMenu.value = !showBlockHandleMenu.value;
  showSlashMenu.value = false;
  showMentionMenu.value = false;
}

function handleToggleLink(): void {
  const ed = editor.value;
  if (!ed) return;
  const previousUrl = ed.getAttributes('link').href as string | undefined;
  const url = window.prompt('URL do link:', previousUrl);
  if (url === null) return;
  if (url === '') {
    ed.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
}

function moveActiveBlock(delta: -1 | 1): void {
  const ed = editor.value;
  if (!ed) return;
  const { $from } = ed.state.selection;
  const currentPos = $from.before(1);
  const node = ed.state.doc.nodeAt(currentPos);
  if (!node) {
    showBlockHandleMenu.value = false;
    return;
  }

  try {
    if (delta === -1) {
      if (currentPos <= 0) {
        showBlockHandleMenu.value = false;
        return;
      }
      const prevPos = ed.state.doc.resolve(currentPos - 1).before(1);
      const tr = ed.state.tr;
      tr.delete(currentPos, currentPos + node.nodeSize);
      tr.insert(prevPos, node);
      ed.view.dispatch(tr);
    } else {
      const nextPos = currentPos + node.nodeSize;
      if (nextPos >= ed.state.doc.content.size) {
        showBlockHandleMenu.value = false;
        return;
      }
      const nextNode = ed.state.doc.nodeAt(nextPos);
      if (!nextNode) {
        showBlockHandleMenu.value = false;
        return;
      }
      const tr = ed.state.tr;
      tr.delete(currentPos, currentPos + node.nodeSize);
      tr.insert(currentPos + nextNode.nodeSize, node);
      ed.view.dispatch(tr);
    }
  } catch {
    // Graceful fallback
  }

  showBlockHandleMenu.value = false;
}

function duplicateActiveBlock(): void {
  const ed = editor.value;
  if (!ed) return;
  const { $from } = ed.state.selection;
  const currentPos = $from.before(1);
  const node = ed.state.doc.nodeAt(currentPos);
  if (!node) return;

  const insertPos = $from.after(1);
  ed.chain().focus().insertContentAt(insertPos, node.toJSON()).run();
  showBlockHandleMenu.value = false;
}

function deleteActiveBlock(): void {
  const ed = editor.value;
  if (!ed) return;
  const { $from } = ed.state.selection;
  const start = $from.before(1);
  const end = $from.after(1);
  ed.chain().focus().deleteRange({ from: start, to: end }).run();
  showBlockHandleMenu.value = false;
}

function turnActiveLineInto(commandId: string): void {
  const ed = editor.value;
  if (!ed) return;

  const chain = ed.chain().focus();
  switch (commandId) {
    case 'texto':
      chain.setParagraph().run();
      break;
    case 'h1':
      chain.toggleHeading({ level: 1 }).run();
      break;
    case 'h2':
      chain.toggleHeading({ level: 2 }).run();
      break;
    case 'h3':
      chain.toggleHeading({ level: 3 }).run();
      break;
    case 'tarefa':
      chain.toggleTaskList().run();
      break;
    case 'lista':
      chain.toggleBulletList().run();
      break;
    case 'numerada':
      chain.toggleOrderedList().run();
      break;
    case 'codigo':
      chain.toggleCodeBlock().run();
      break;
    case 'tabela':
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      break;
    case 'citacao':
      chain.toggleBlockquote().run();
      break;
    case 'divisor':
      chain.setHorizontalRule().run();
      break;
  }
  showBlockHandleMenu.value = false;
}

function applySlashCommand(commandId: string): void {
  const ed = editor.value;
  if (!ed) return;

  // If line contains typed slash and filter query, clear it before running command
  const { from } = ed.state.selection;
  const blockText = ed.state.doc.resolve(from).parent.textContent;
  const slashIdx = blockText.lastIndexOf('/');
  if (slashIdx !== -1) {
    const start = ed.state.selection.$from.start();
    const slashPos = start + slashIdx;
    if (from >= slashPos) {
      ed.chain().focus().deleteRange({ from: slashPos, to: from }).run();
    }
  }

  if (commandId === 'database') {
    emit('insert-database-block');
  } else if (commandId === 'mermaid' || commandId === 'excalidraw' || commandId === 'drawio') {
    emit('insert-diagram-block', commandId);
  } else if (commandId === 'subpage') {
    emit('create-subpage');
  } else {
    turnActiveLineInto(commandId);
  }

  showSlashMenu.value = false;
  slashFilter.value = '';
}

function insertUserMention(userName: string): void {
  const ed = editor.value;
  if (ed) {
    ed.chain().focus().insertContent(`@${userName} `).run();
  }
  showMentionMenu.value = false;
  mentionFilter.value = '';
}

function insertPageMention(icon: string, title: string): void {
  const ed = editor.value;
  if (ed) {
    ed.chain().focus().insertContent(`[[${title}]] `).run();
  }
  showMentionMenu.value = false;
  mentionFilter.value = '';
}

onBeforeUnmount(() => {
  if (emitDebounceTimer) {
    clearTimeout(emitDebounceTimer);
    if (editor.value && isLocalInput) {
      emit('update:modelValue', editor.value.getJSON() as TiptapDoc);
    }
  }
  editor.value?.destroy();
});

defineExpose({
  editor,
  showBubbleMenu,
  showSlashMenu,
  showMentionMenu,
  showBlockHandleMenu,
  applySlashCommand,
  turnActiveLineInto,
  moveActiveBlock,
  duplicateActiveBlock,
  deleteActiveBlock,
});
</script>

<style scoped>
.tiptap-editor-shell {
  position: relative;
}

/* Block Handle Popover */
.block-handle-popover {
  position: absolute;
  left: 48px;
  width: 270px;
  max-height: 380px;
  overflow-y: auto;
  z-index: 100;
}

/* Slash Command Popover */
.slash-command-popover {
  width: 320px;
  max-height: 380px;
  overflow-y: auto;
  margin-bottom: 14px;
}

.mention-popover {
  width: 290px;
  max-height: 340px;
  overflow-y: auto;
  margin-bottom: 14px;
}

.slash-filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 6px;
  border-bottom: 1px solid var(--mind-border-subtle);
  margin-bottom: 4px;
}

.slash-prefix {
  font-weight: 700;
  color: var(--mind-text-muted);
  font-size: 13px;
}

.slash-filter-input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 13px;
  color: var(--mind-text-primary);
}

.popover-text-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.popover-item-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--mind-text-primary);
  line-height: 1.3;
}

.popover-item-desc {
  font-size: 11.5px;
  color: var(--mind-text-muted);
  line-height: 1.3;
}

.slash-empty-state {
  padding: 12px;
  font-size: 12.5px;
  color: var(--mind-text-muted);
  text-align: center;
}

.mention-user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--mind-accent-primary);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 700;
  margin-right: 8px;
  flex-shrink: 0;
}

/* Notion-like Floating Bubble Menu */
.mind-bubble-menu {
  display: flex;
  align-items: center;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  box-shadow: var(--mind-shadow-popover);
  padding: 3px 4px;
  gap: 2px;
  z-index: 100;
}

.bubble-menu-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.bubble-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--mind-text-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.bubble-menu-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.bubble-menu-btn.is-active {
  background: var(--mind-bg-active);
  color: var(--mind-accent-primary);
}

.bubble-menu-sep {
  width: 1px;
  height: 16px;
  background: var(--mind-border-subtle);
  margin: 0 3px;
}

.text-danger-row {
  color: var(--mind-pill-pink-text);
}

.text-danger-row:hover {
  background: var(--mind-pill-pink-bg);
}
</style>
