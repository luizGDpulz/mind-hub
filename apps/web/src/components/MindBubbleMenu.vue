<template>
  <Teleport to="body" :disabled="isTestEnv">
    <div
      v-if="visible && editor"
      class="mind-floating-bubble-menu"
      data-testid="editor-bubble-menu"
      role="toolbar"
      aria-label="Barra flutuante de formatação"
      :style="{ top: `${coords.top}px`, left: `${coords.left}px` }"
    >
      <!-- Inline formatting marks -->
      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('bold') }"
        title="Negrito (Ctrl+B)"
        aria-label="Negrito"
        @mousedown.prevent
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('italic') }"
        title="Itálico (Ctrl+I)"
        aria-label="Itálico"
        @mousedown.prevent
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('underline') }"
        title="Sublinhado (Ctrl+U)"
        aria-label="Sublinhado"
        @mousedown.prevent
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <UnderlineIcon :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('strike') }"
        title="Tachado (Ctrl+Shift+S)"
        aria-label="Tachado"
        @mousedown.prevent
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <Strikethrough :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('code') }"
        title="Código inline"
        aria-label="Código inline"
        @mousedown.prevent
        @click="editor.chain().focus().toggleCode().run()"
      >
        <Code :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('link') }"
        title="Inserir ou editar Link"
        aria-label="Link"
        @mousedown.prevent
        @click="$emit('toggle-link')"
      >
        <LinkIcon :size="14" />
      </button>

      <span class="bubble-sep" />

      <!-- Headings -->
      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        title="Título H1"
        aria-label="Título H1"
        @mousedown.prevent
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        <Heading1 :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        title="Título H2"
        aria-label="Título H2"
        @mousedown.prevent
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <Heading2 :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        title="Título H3"
        aria-label="Título H3"
        @mousedown.prevent
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <Heading3 :size="14" />
      </button>

      <span class="bubble-sep" />

      <!-- Lists & Block types -->
      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        title="Lista com marcadores"
        aria-label="Lista com marcadores"
        @mousedown.prevent
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('taskList') }"
        title="Lista de tarefas (Checklist)"
        aria-label="Lista de tarefas"
        @mousedown.prevent
        @click="editor.chain().focus().toggleTaskList().run()"
      >
        <ListTodo :size="14" />
      </button>

      <button
        type="button"
        class="bubble-btn"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        title="Citação / Callout"
        aria-label="Citação"
        @mousedown.prevent
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <Quote :size="14" />
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListTodo,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-vue-next';

defineProps<{
  editor: any;
  visible: boolean;
  coords: { top: number; left: number };
}>();

defineEmits<{
  (e: 'toggle-link'): void;
}>();

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
</script>

<style scoped>
.mind-floating-bubble-menu {
  position: fixed;
  display: inline-flex;
  align-items: center;
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  padding: 3px 4px;
  gap: 2px;
  z-index: 99999;
  user-select: none;
  white-space: nowrap;
  width: max-content;
  pointer-events: auto;
  animation: bubbleFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes bubbleFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.bubble-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--mind-text-secondary, #495057);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.1s ease, color 0.1s ease;
}

.bubble-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.bubble-btn.is-active {
  background: var(--mind-bg-active, #e7f5ff);
  color: var(--mind-accent-primary, #1971c2);
}

.bubble-sep {
  width: 1px;
  height: 16px;
  background: var(--mind-border-subtle, #e9ecef);
  margin: 0 3px;
}
</style>
