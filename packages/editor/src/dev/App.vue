<script setup lang="ts">
import { ref } from 'vue';
import {
  Sparkles,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Code2,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-vue-next';
import MindEditor from '../components/MindEditor.vue';
import type { EditorFrontmatter, PageReference } from '../types.js';

const todayIso = new Date().toISOString().slice(0, 10);

const basicSampleTitle = 'Blocos Básicos de Markdown';

const basicSampleFrontmatter: EditorFrontmatter = {
  tags: ['estudo', 'referencia'],
  status: 'ativo',
  project: 'Mind Hub',
  created: todayIso,
  updated: todayIso,
};

const basicSampleContent = `
<h2>Títulos e Parágrafos</h2>
<p>Cada bloco é tratado como uma pílula independente — passe o mouse na margem esquerda para usar <strong>+</strong> e <strong>⠿</strong> ou digite <code>/</code> para inserir blocos básicos.</p>

<h3>Lista Numerada com Cores em Pílula</h3>
<ol>
  <li data-block-bg="green" data-block-color="green"><p>Item 1 com fundo pastel e numeração colorida</p></li>
  <li data-block-bg="green" data-block-color="green"><p>Item 2 em pílula separada com gutter alinhado ao meio</p></li>
  <li><p>Item 3 no estilo padrão neutro</p></li>
</ol>

<h3>Lista com Marcadores &amp; Checklist</h3>
<ul>
  <li data-block-bg="blue"><p>Marcador também participa da pílula azul</p></li>
  <li><p>Item normal com atalho <code>- </code></p></li>
</ul>

<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Digitar [] ou [ ] + espaço cria tarefa</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Arrastar blocos pela margem esquerda</p></div></li>
</ul>

<blockquote>
  <p>“Simplicidade é pré-requisito para confiabilidade.” — Edsger W. Dijkstra</p>
</blockquote>

<pre><code class="language-typescript">const editorMode = 'basic-markdown';</code></pre>
<hr>
`.trim();

const mindEditorRef = ref<InstanceType<typeof MindEditor> | null>(null);
const noteTitle = ref<string>('');
const frontmatter = ref<EditorFrontmatter>({});
const showProperties = ref(false);
const content = ref<string>('<p></p>');
const showRawPanel = ref(false);
const copySuccess = ref(false);
const toastMessage = ref<string | null>(null);

const samplePages: PageReference[] = [
  {
    id: 'page-1',
    title: 'Arquitetura do Homelab',
    slug: 'arquitetura-do-homelab',
    summary: 'Infraestrutura da Millennium Falcon, Docker e redes NPM',
  },
  {
    id: 'page-2',
    title: 'Padrões de UI e Design System (Mind Style)',
    slug: 'padroes-de-ui',
    summary: 'Fonte única da verdade para cores pastéis e vetos de IA',
  },
  {
    id: 'page-3',
    title: 'ADR 002 - Arquitetura do Mind Editor',
    slug: 'adr-002-mind-editor',
    summary: 'Decisão de engenharia para motor de blocos open source',
  },
];

function handleFrontmatterUpdate(nextMeta: EditorFrontmatter): void {
  frontmatter.value = nextMeta;
  if (typeof nextMeta.title === 'string' && nextMeta.title !== noteTitle.value) {
    noteTitle.value = nextMeta.title;
  }
}

function addYamlProperties(): void {
  showProperties.value = true;
  void mindEditorRef.value?.openProperties(true);
}

function loadBasicSample(): void {
  noteTitle.value = basicSampleTitle;
  frontmatter.value = { ...basicSampleFrontmatter, tags: [...(basicSampleFrontmatter.tags ?? [])] };
  showProperties.value = true;
  content.value = basicSampleContent;
  showToast('Exemplo de blocos básicos carregado!');
}

function clearEditor(): void {
  noteTitle.value = '';
  frontmatter.value = {};
  showProperties.value = false;
  content.value = '<p></p>';
  showToast('Documento limpo!');
}

function copyHtml(): void {
  navigator.clipboard.writeText(content.value);
  copySuccess.value = true;
  showToast('Conteúdo copiado para a área de transferência!');
  setTimeout(() => {
    copySuccess.value = false;
  }, 2000);
}

function showToast(msg: string): void {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = null;
  }, 2500);
}

function handleSave(): void {
  showToast('Salvo via atalho Ctrl+S');
}
</script>

<template>
  <div class="playground-layout">
    <!-- Topbar Header -->
    <header class="playground-header">
      <div class="header-left">
        <div class="header-brand">
          <BookOpen class="brand-icon" />
          <span class="brand-name">Mind Editor</span>
          <span class="brand-badge">Live Preview & HMR</span>
        </div>
      </div>

      <div class="header-center">
        <div class="live-status-pill">
          <span class="pulse-dot" />
          <span>Vite HMR Ativo • Hot Reload Instantâneo</span>
        </div>
      </div>

      <div class="header-right">
        <button
          v-if="!showProperties"
          type="button"
          class="header-btn"
          data-testid="app-add-properties-btn"
          title="Adicionar propriedades YAML no topo da nota"
          @click="addYamlProperties"
        >
          <SlidersHorizontal class="btn-icon" />
          <span>+ Propriedades</span>
        </button>

        <button
          type="button"
          class="header-btn"
          title="Carregar exemplo apenas com blocos básicos de Markdown"
          @click="loadBasicSample"
        >
          <RefreshCw class="btn-icon" />
          <span>Exemplo Básico</span>
        </button>

        <button
          type="button"
          class="header-btn"
          title="Limpar editor"
          @click="clearEditor"
        >
          <Trash2 class="btn-icon" />
          <span>Limpar</span>
        </button>

        <button
          type="button"
          class="header-btn"
          title="Copiar HTML"
          @click="copyHtml"
        >
          <Check v-if="copySuccess" class="btn-icon text-success" />
          <Copy v-else class="btn-icon" />
          <span>{{ copySuccess ? 'Copiado!' : 'Copiar' }}</span>
        </button>

        <button
          type="button"
          class="header-btn mode-btn"
          :class="{ 'is-active': showRawPanel }"
          title="Alternar inspetor de código"
          @click="showRawPanel = !showRawPanel"
        >
          <Code2 class="btn-icon" />
          <span>{{ showRawPanel ? 'Ocultar Raw' : 'Inspetor Raw' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="playground-main" :class="{ 'with-sidebar': showRawPanel }">
      <!-- Editor Column -->
      <section class="editor-viewport">
        <div class="editor-paper-card">
          <div v-if="!showProperties" class="paper-top-action-row">
            <button
              type="button"
              class="paper-add-properties-btn"
              @click="addYamlProperties"
            >
              <SlidersHorizontal class="btn-icon" />
              <span>Adicionar propriedades</span>
            </button>
          </div>

          <MindEditor
            ref="mindEditorRef"
            v-model="content"
            v-model:title="noteTitle"
            v-model:show-properties="showProperties"
            :show-title="true"
            :basic-blocks-only="true"
            :frontmatter="frontmatter"
            :pages="samplePages"
            placeholder="Pressione / para inserir blocos"
            @update:frontmatter="handleFrontmatterUpdate"
            @save="handleSave"
          />
        </div>
      </section>

      <!-- Raw Inspector Side Panel -->
      <aside v-if="showRawPanel" class="inspector-panel">
        <div class="inspector-header">
          <div class="inspector-title">Inspetor em Tempo Real (AST / HTML)</div>
          <div class="inspector-tag">{{ content.length }} caracteres</div>
        </div>
        <div class="inspector-code-wrap">
          <pre class="inspector-pre"><code>{{ content }}</code></pre>
        </div>
      </aside>
    </main>

    <!-- Toast Notification -->
    <transition name="toast-fade">
      <div v-if="toastMessage" class="playground-toast">
        <Sparkles class="toast-icon" />
        <span>{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.playground-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.playground-header {
  position: sticky;
  top: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e9ecef;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  width: 20px;
  height: 20px;
  color: #1971c2;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}

.brand-badge {
  font-size: 11px;
  font-weight: 600;
  color: #1971c2;
  background-color: #e7f5ff;
  padding: 2px 8px;
  border-radius: 999px;
}

.live-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #ebfbee;
  color: #2b8a3e;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid #d3f9d8;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #2b8a3e;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(43, 138, 62, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(43, 138, 62, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(43, 138, 62, 0); }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #495057;
  cursor: pointer;
  transition: all 0.12s ease;
}

.header-btn:hover {
  background-color: #f1f3f5;
  color: #111827;
}

.header-btn.mode-btn.is-active {
  background-color: #e7f5ff;
  border-color: #d0ebff;
  color: #1971c2;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.text-success {
  color: #2b8a3e;
}

.playground-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 80px;
  display: flex;
  justify-content: center;
}

.editor-paper-card {
  width: 100%;
  max-width: 860px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.paper-top-action-row {
  max-width: 820px;
  margin: 0 auto;
  padding: 16px 76px 0;
  margin-bottom: -16px;
}

.paper-add-properties-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: #868e96;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 6px;
  margin-left: -6px;
  border-radius: 5px;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.14s ease, background-color 0.12s ease, color 0.12s ease;
}

.editor-paper-card:hover .paper-add-properties-btn,
.paper-add-properties-btn:focus-visible {
  opacity: 1;
}

.paper-add-properties-btn:hover {
  background-color: #f8f9fa;
  color: #111827;
}

.inspector-panel {
  width: 380px;
  border-left: 1px solid #e9ecef;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid #e9ecef;
  background-color: #f8f9fa;
}

.inspector-title {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.inspector-tag {
  font-size: 11px;
  color: #868e96;
}

.inspector-code-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background-color: #f8f9fa;
}

.inspector-pre {
  margin: 0;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-all;
}

.playground-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #111827;
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.toast-icon {
  width: 16px;
  height: 16px;
  color: #ffd43b;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
