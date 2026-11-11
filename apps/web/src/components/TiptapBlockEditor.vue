<template>
  <div class="tiptap-editor-shell" data-testid="tiptap-block-editor">
    <!-- Block-Level Left Gutter Controls (+ and ⠿) + Active Block Indicator -->
    <div class="block-row-shell">
      <div
        class="block-left-gutter is-visible"
        role="toolbar"
        aria-label="Block line controls"
      >
        <button
          type="button"
          class="gutter-icon-btn"
          title="Adicionar bloco abaixo (/)"
          aria-label="Add block below"
          data-testid="block-gutter-add-btn"
          @click="handleGutterAddBlock"
        >
          +
        </button>
        <button
          type="button"
          class="gutter-icon-btn"
          title="Arrastar, subir/descer ou mudar comando da linha"
          aria-label="Open block actions and turn-into menu"
          data-testid="block-gutter-handle-btn"
          @click="showBlockHandleMenu = !showBlockHandleMenu"
        >
          ⠿
        </button>
      </div>

      <!-- Floating Left Handle Menu: Move Up/Down & Turn Into (Mudar Comando da Linha) -->
      <div
        v-if="showBlockHandleMenu"
        class="mind-floating-popover block-handle-popover"
        data-testid="block-handle-menu"
      >
        <div class="mind-popover-section-title">LINE ORDER (LINHA #{{ activeBlockIndex + 1 }})</div>
        <div
          class="mind-popover-row"
          data-testid="block-move-up-btn"
          @click="moveActiveBlock(-1)"
        >
          <span class="mind-icon-box-28">↑</span>
          <div>
            <div class="popover-item-title">Move line up</div>
            <div class="popover-item-desc">Subir o bloco atual uma posição</div>
          </div>
        </div>
        <div
          class="mind-popover-row"
          data-testid="block-move-down-btn"
          @click="moveActiveBlock(1)"
        >
          <span class="mind-icon-box-28">↓</span>
          <div>
            <div class="popover-item-title">Move line down</div>
            <div class="popover-item-desc">Descer o bloco atual uma posição</div>
          </div>
        </div>

        <div class="mind-popover-section-title">TURN INTO (MUDAR COMANDO DA LINHA)</div>
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

        <div class="mind-popover-section-title">ACTIONS</div>
        <div
          class="mind-popover-row"
          data-testid="block-duplicate-btn"
          @click="duplicateActiveBlock"
        >
          <span class="mind-icon-box-28">⧉</span>
          <div class="popover-item-title">Duplicate line</div>
        </div>
        <div
          class="mind-popover-row"
          data-testid="block-delete-btn"
          @click="deleteActiveBlock"
        >
          <span class="mind-icon-box-28">🗑</span>
          <div class="popover-item-title">Delete line</div>
        </div>
      </div>

      <!-- FLOATING SLASH COMMAND MENU (09-slash-command-menu.png) -->
      <div
        v-if="showSlashMenu"
        class="mind-floating-popover slash-command-popover"
        :style="slashPopoverStyle"
        data-testid="slash-command-menu"
      >
        <div class="slash-filter-bar">
          <span class="slash-prefix">/</span>
          <input
            v-model="slashFilter"
            type="text"
            placeholder="Filter commands (Text, Heading 1, To-do, Mermaid, Draw.io)..."
            class="slash-filter-input"
            data-testid="slash-filter-input"
          />
        </div>

        <div class="mind-popover-section-title">Basic</div>
        <div
          v-for="(cmd, idx) in filteredSlashCommands"
          :key="cmd.id"
          class="mind-popover-row"
          :class="{ 'is-selected': idx === 0 }"
          :data-testid="`slash-item-${cmd.id}`"
          @click="applySlashCommand(cmd.id)"
        >
          <span class="mind-icon-box-32">{{ cmd.monogram ?? 'A' }}</span>
          <div class="popover-text-col">
            <div class="popover-item-title">{{ cmd.label }}</div>
            <div class="popover-item-desc">{{ cmd.description }}</div>
          </div>
        </div>
      </div>

      <!-- FLOATING @ MENTION MENU (08-mention-menu-popover.png) -->
      <div
        v-if="showMentionMenu"
        class="mind-floating-popover mention-popover"
        :style="mentionPopoverStyle"
        data-testid="mention-menu-popover"
      >
        <div class="slash-filter-bar">
          <span class="slash-prefix">@</span>
          <input
            v-model="mentionFilter"
            type="text"
            placeholder="Co..."
            class="slash-filter-input"
            data-testid="mention-filter-input"
          />
        </div>

        <div class="mind-popover-section-title">USERS</div>
        <div
          v-for="user in filteredMentionUsers"
          :key="user.id"
          class="mind-popover-row"
          :data-testid="`mention-user-${user.id}`"
          @click="insertUserMention(user.name)"
        >
          <span class="mention-user-avatar">{{ user.initials }}</span>
          <span class="popover-item-title">{{ user.name }}</span>
        </div>

        <div class="mind-popover-section-title">PAGES</div>
        <div
          v-for="(pageItem, idx) in filteredMentionPages"
          :key="pageItem.id"
          class="mind-popover-row"
          :class="{ 'is-selected': idx === 1 }"
          :data-testid="`mention-page-${pageItem.id}`"
          @click="insertPageMention(pageItem.icon, pageItem.title)"
        >
          <span class="mind-icon-box-28">{{ pageItem.icon }}</span>
          <span class="popover-item-title">{{ pageItem.title }}</span>
        </div>
      </div>

      <!-- Single Tiptap v2 Rich Block Canvas (prevents DOM detachment on read/edit toggle, closes #37) -->
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
}>();

const showSlashMenu = ref(false);
const showMentionMenu = ref(false);
const showBlockHandleMenu = ref(false);
const slashFilter = ref('');
const mentionFilter = ref('');
const activeBlockIndex = ref(0);

const docBlocksCount = computed<number>(() => props.modelValue.content.length || 1);

const activeBlockTypeName = computed<string>(() => {
  const node = props.modelValue.content[activeBlockIndex.value];
  if (!node) return 'Text';
  if (node.type === 'heading') return `Heading ${node.attrs?.level ?? 1}`;
  if (node.type === 'taskList') return 'To-do list';
  if (node.type === 'bulletList') return 'Bullet list';
  if (node.type === 'codeBlock') return 'Code block';
  if (node.type === 'table') return 'Table';
  if (node.type === 'blockquote') return 'Callout';
  return 'Text';
});

const basicSlashCommands = computed<SlashCommandDefinition[]>(() =>
  DEFAULT_SLASH_COMMANDS.filter((c) => c.category === 'basic' || c.category === 'code' || c.category === 'rich'),
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

/**
 * Never hand the editor a document it cannot represent: ProseMirror would drop
 * the whole content and render an empty page (#34). Unknown marks/nodes are
 * stripped (text preserved) and, as last resort, raw Markdown is shown.
 */
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

const editor = useEditor({
  content: resolveSafeDoc(props.modelValue, props.markdownValue),
  editable: !props.readOnlyMode,
  extensions: editorExtensions,
  onUpdate: ({ editor: activeEditor }) => {
    const json = activeEditor.getJSON() as TiptapDoc;
    emit('update:modelValue', json);
  },
});

watch(
  () => props.readOnlyMode,
  (isRead) => {
    editor.value?.setEditable(!isRead);
  },
);

watch(
  () => props.modelValue,
  (newDoc) => {
    if (activeBlockIndex.value >= newDoc.content.length) {
      activeBlockIndex.value = Math.max(0, newDoc.content.length - 1);
    }
    if (!editor.value) return;
    const currentJson = JSON.stringify(editor.value.getJSON());
    const incomingJson = JSON.stringify(newDoc);
    if (currentJson !== incomingJson) {
      editor.value.commands.setContent(resolveSafeDoc(newDoc, props.markdownValue), false);
    }
  },
);

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
    // fallback if selection is outside
  }
}

function handleCanvasKeydown(event: KeyboardEvent): void {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
    nextTick(() => {
      updateCursorCoords();
      showSlashMenu.value = true;
      showMentionMenu.value = false;
      showBlockHandleMenu.value = false;
    });
  } else if (event.key === '@' && !event.ctrlKey && !event.metaKey) {
    nextTick(() => {
      updateCursorCoords();
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

function toggleSlashPopover(): void {
  updateCursorCoords();
  showSlashMenu.value = !showSlashMenu.value;
  showMentionMenu.value = false;
  showBlockHandleMenu.value = false;
}

function toggleMentionPopover(): void {
  updateCursorCoords();
  showMentionMenu.value = !showMentionMenu.value;
  showSlashMenu.value = false;
  showBlockHandleMenu.value = false;
}

function handleGutterAddBlock(): void {
  const blocks = [...props.modelValue.content];
  const insertAt = Math.min(blocks.length, activeBlockIndex.value + 1);
  blocks.splice(insertAt, 0, {
    type: 'paragraph',
    content: [{ type: 'text', text: '' }],
  });
  activeBlockIndex.value = insertAt;
  emit('update:modelValue', { type: 'doc', content: blocks });
  popoverCoords.value = { top: (activeBlockIndex.value + 1) * 32, left: 36 };
  showSlashMenu.value = true;
  showBlockHandleMenu.value = false;
}

function moveActiveBlock(delta: -1 | 1): void {
  const blocks = [...props.modelValue.content];
  const from = activeBlockIndex.value;
  const to = from + delta;
  if (to < 0 || to >= blocks.length) {
    showBlockHandleMenu.value = false;
    return;
  }
  const moved = blocks[from];
  const target = blocks[to];
  if (!moved || !target) return;
  blocks[from] = target;
  blocks[to] = moved;
  activeBlockIndex.value = to;
  emit('update:modelValue', { type: 'doc', content: blocks });
  showBlockHandleMenu.value = false;
}

function extractBlockPlainText(node: TiptapNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (!node.content) return '';
  return node.content.map((c) => extractBlockPlainText(c)).join(' ').trim();
}

function turnActiveLineInto(commandId: string): void {
  const blocks = [...props.modelValue.content];
  const idx = activeBlockIndex.value;
  const current = blocks[idx];
  const text = extractBlockPlainText(current) || 'Novo bloco';

  let replacement: TiptapNode = {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };

  switch (commandId) {
    case 'texto':
      replacement = { type: 'paragraph', content: [{ type: 'text', text }] };
      break;
    case 'h1':
      replacement = { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text }] };
      break;
    case 'h2':
      replacement = { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] };
      break;
    case 'h3':
      replacement = { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text }] };
      break;
    case 'tarefa':
      replacement = {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          },
        ],
      };
      break;
    case 'lista':
    case 'numerada':
      replacement = {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          },
        ],
      };
      break;
    case 'codigo':
      replacement = {
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [{ type: 'text', text }],
      };
      break;
    case 'citacao':
      replacement = {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      };
      break;
    case 'divisor':
      replacement = { type: 'horizontalRule' };
      break;
  }

  blocks[idx] = replacement;
  emit('update:modelValue', { type: 'doc', content: blocks });
  showBlockHandleMenu.value = false;
}

function duplicateActiveBlock(): void {
  const blocks = [...props.modelValue.content];
  const current = blocks[activeBlockIndex.value];
  if (!current) return;
  const cloned = JSON.parse(JSON.stringify(current)) as TiptapNode;
  blocks.splice(activeBlockIndex.value + 1, 0, cloned);
  activeBlockIndex.value += 1;
  emit('update:modelValue', { type: 'doc', content: blocks });
  showBlockHandleMenu.value = false;
}

function deleteActiveBlock(): void {
  const blocks = [...props.modelValue.content];
  if (blocks.length <= 1) {
    blocks[0] = { type: 'paragraph', content: [] };
  } else {
    blocks.splice(activeBlockIndex.value, 1);
    activeBlockIndex.value = Math.max(0, activeBlockIndex.value - 1);
  }
  emit('update:modelValue', { type: 'doc', content: blocks });
  showBlockHandleMenu.value = false;
}

function applySlashCommand(commandId: string): void {
  if (commandId === 'database') {
    emit('insert-database-block');
    showSlashMenu.value = false;
    slashFilter.value = '';
    return;
  }
  if (commandId === 'mermaid' || commandId === 'excalidraw' || commandId === 'drawio') {
    emit('insert-diagram-block', commandId);
    showSlashMenu.value = false;
    slashFilter.value = '';
    return;
  }

  const ed = editor.value;
  if (ed) {
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
    ed.chain().focus().insertContent(`${icon} ${title} `).run();
  }
  showMentionMenu.value = false;
  mentionFilter.value = '';
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
.tiptap-editor-shell {
  position: relative;
}

.block-handle-popover {
  position: absolute;
  left: 52px;
  top: 0;
  width: 270px;
  max-height: 360px;
  overflow-y: auto;
}

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

.mention-user-avatar {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: #e7f5ff;
  color: #1971c2;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.read-mode-surface {
  opacity: 0.96;
}
</style>
