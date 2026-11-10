<template>
  <div class="tiptap-editor-shell">
    <!-- Formatting & Block Toolbar -->
    <div class="editor-toolbar row items-center q-gutter-xs q-pa-sm rounded-borders q-mb-md">
      <q-btn
        flat
        dense
        size="sm"
        icon="format_bold"
        :color="editor?.isActive('bold') ? 'indigo-4' : 'grey-5'"
        title="Negrito (Ctrl+B)"
        @click="editor?.chain().focus().toggleBold().run()"
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="format_italic"
        :color="editor?.isActive('italic') ? 'indigo-4' : 'grey-5'"
        title="Itálico (Ctrl+I)"
        @click="editor?.chain().focus().toggleItalic().run()"
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="strikethrough_s"
        :color="editor?.isActive('strike') ? 'indigo-4' : 'grey-5'"
        title="Riscado"
        @click="editor?.chain().focus().toggleStrike().run()"
      />
      <q-separator vertical inset class="q-mx-xs" />
      <q-btn
        flat
        dense
        size="sm"
        label="H1"
        :color="editor?.isActive('heading', { level: 1 }) ? 'indigo-4' : 'grey-5'"
        @click="applySlashCommand('h1')"
      />
      <q-btn
        flat
        dense
        size="sm"
        label="H2"
        :color="editor?.isActive('heading', { level: 2 }) ? 'indigo-4' : 'grey-5'"
        @click="applySlashCommand('h2')"
      />
      <q-btn
        flat
        dense
        size="sm"
        label="H3"
        :color="editor?.isActive('heading', { level: 3 }) ? 'indigo-4' : 'grey-5'"
        @click="applySlashCommand('h3')"
      />
      <q-separator vertical inset class="q-mx-xs" />
      <q-btn
        flat
        dense
        size="sm"
        icon="check_box"
        :color="editor?.isActive('taskList') ? 'indigo-4' : 'grey-5'"
        title="Checklist (/tarefa)"
        @click="applySlashCommand('tarefa')"
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="format_list_bulleted"
        :color="editor?.isActive('bulletList') ? 'indigo-4' : 'grey-5'"
        title="Lista com marcadores (/lista)"
        @click="applySlashCommand('lista')"
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="code"
        :color="editor?.isActive('codeBlock') ? 'indigo-4' : 'grey-5'"
        title="Bloco de Código (/codigo)"
        @click="applySlashCommand('codigo')"
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="table_chart"
        :color="editor?.isActive('table') ? 'indigo-4' : 'grey-5'"
        title="Inserir Tabela (/tabela)"
        @click="applySlashCommand('tabela')"
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="format_quote"
        :color="editor?.isActive('blockquote') ? 'indigo-4' : 'grey-5'"
        title="Citação (/citacao)"
        @click="applySlashCommand('citacao')"
      />

      <q-space />

      <q-btn
        flat
        dense
        size="sm"
        icon="bolt"
        label="/ Comandos"
        color="indigo-4"
        data-testid="slash-menu-trigger"
        @click="showSlashMenu = !showSlashMenu"
      />
      <q-btn-toggle
        v-model="viewMode"
        dense
        unelevated
        size="sm"
        toggle-color="indigo-6"
        :options="[
          { label: 'Blocos', value: 'blocks' },
          { label: 'Markdown', value: 'markdown' },
        ]"
      />
    </div>

    <!-- Floating Slash Commands Palette -->
    <q-card
      v-if="showSlashMenu"
      bordered
      class="slash-palette q-mb-md q-pa-sm"
      data-testid="slash-command-menu"
    >
      <div class="row items-center justify-between q-px-sm q-pb-xs">
        <span class="text-caption text-weight-bold text-indigo-3">
          ⚡ SLASH COMMANDS (Digite ou selecione um bloco)
        </span>
        <q-input
          v-model="slashFilter"
          dense
          borderless
          placeholder="Filtrar comando (/h1, /tarefa, /tabela)..."
          class="col-5"
        />
      </div>
      <div class="row q-col-gutter-xs">
        <div
          v-for="cmd in filteredSlashCommands"
          :key="cmd.id"
          class="col-12 col-sm-4"
        >
          <q-item
            clickable
            dense
            class="rounded-borders slash-item"
            :data-testid="`slash-item-${cmd.id}`"
            @click="applySlashCommand(cmd.id)"
          >
            <q-item-section avatar style="min-width: 32px">
              <q-icon :name="cmd.icon" color="indigo-4" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium text-body2">
                {{ cmd.label }}
                <q-badge color="grey-8" text-color="grey-3" class="q-ml-xs">
                  {{ cmd.command }}
                </q-badge>
              </q-item-label>
              <q-item-label caption class="text-grey-5">
                {{ cmd.description }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </div>
      </div>
    </q-card>

    <!-- Tiptap v2 Rich Block Surface -->
    <div v-show="viewMode === 'blocks'" class="tiptap-canvas" @keydown="handleCanvasKeydown">
      <editor-content :editor="editor" />
    </div>

    <!-- Raw Markdown Sovereignty View -->
    <div v-if="viewMode === 'markdown'" class="markdown-source-view">
      <q-input
        v-model="rawMarkdownBuffer"
        type="textarea"
        autogrow
        outlined
        dark
        font-family="monospace"
        label="Markdown Puro Sincronizado (Soberania de Dados)"
        @update:model-value="handleRawMarkdownChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  DEFAULT_SLASH_COMMANDS,
  type SlashCommandDefinition,
  type TiptapDoc,
} from '@mind-hub/shared';

const props = defineProps<{
  modelValue: TiptapDoc;
  markdownValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', doc: TiptapDoc): void;
  (e: 'update:markdownValue', md: string): void;
}>();

const viewMode = ref<'blocks' | 'markdown'>('blocks');
const showSlashMenu = ref(false);
const slashFilter = ref('');
const rawMarkdownBuffer = ref(props.markdownValue);

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

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Placeholder.configure({
      placeholder: 'Digite "/" para abrir os Slash Commands ou escreva livremente...',
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
  ],
  onUpdate: ({ editor: activeEditor }) => {
    const json = activeEditor.getJSON() as TiptapDoc;
    emit('update:modelValue', json);
  },
});

watch(
  () => props.modelValue,
  (newDoc) => {
    if (!editor.value) return;
    const currentJson = JSON.stringify(editor.value.getJSON());
    const incomingJson = JSON.stringify(newDoc);
    if (currentJson !== incomingJson) {
      editor.value.commands.setContent(newDoc, false);
    }
  },
);

watch(
  () => props.markdownValue,
  (newMd) => {
    rawMarkdownBuffer.value = newMd;
  },
);

function handleCanvasKeydown(event: KeyboardEvent): void {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
    showSlashMenu.value = true;
  } else if (event.key === 'Escape') {
    showSlashMenu.value = false;
  }
}

function applySlashCommand(commandId: string): void {
  const ed = editor.value;
  if (!ed) return;

  const chain = ed.chain().focus();
  switch (commandId) {
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
  showSlashMenu.value = false;
  slashFilter.value = '';
}

function handleRawMarkdownChange(val: string | number | null): void {
  emit('update:markdownValue', String(val ?? ''));
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>
