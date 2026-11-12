<template>
  <div
    class="mind-mermaid-shell"
    data-testid="mermaid-block-shell"
    :class="{ 'is-editing': isEditingCode }"
  >
    <!-- Top Toolbar of the Diagram Block -->
    <div class="mermaid-top-bar">
      <div class="diagram-type-badge">
        <GitFork :size="13" class="badge-icon" />
        <span>Mermaid</span>
      </div>

      <input
        :value="title"
        type="text"
        class="diagram-title-input"
        data-testid="mermaid-title-input"
        placeholder="Título do diagrama..."
        @input="emit('update:title', ($event.target as HTMLInputElement).value)"
      >

      <div class="mermaid-actions">
        <button
          type="button"
          class="action-btn"
          data-testid="toggle-code-btn"
          :title="isEditingCode ? 'Visualizar diagrama' : 'Editar código Mermaid'"
          @click="isEditingCode = !isEditingCode"
        >
          <Code2 v-if="!isEditingCode" :size="13" />
          <Eye v-else :size="13" />
          <span>{{ isEditingCode ? 'Ver Diagrama' : 'Código' }}</span>
        </button>

        <button
          type="button"
          class="action-btn"
          data-testid="copy-code-btn"
          title="Copiar código Mermaid"
          @click="copyCode"
        >
          <Check v-if="copied" :size="13" class="copied-icon" />
          <Copy v-else :size="13" />
          <span>{{ copied ? 'Copiado!' : 'Copiar' }}</span>
        </button>
      </div>
    </div>

    <!-- CODE EDITOR MODE -->
    <div v-if="isEditingCode" class="mermaid-code-editor-area">
      <textarea
        :value="code"
        class="mermaid-textarea"
        data-testid="mermaid-code-textarea"
        rows="8"
        spellcheck="false"
        placeholder="flowchart TD&#10;    A --> B"
        @input="emit('update:code', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- DIAGRAM PREVIEW MODE (SVG) -->
    <div v-else class="mermaid-render-container" data-testid="mermaid-preview-container">
      <div v-if="renderError" class="mermaid-error-notice" data-testid="mermaid-error-msg">
        <AlertTriangle :size="14" />
        <span>Erro na sintaxe Mermaid: {{ renderError }}</span>
      </div>

      <div
        v-else
        ref="svgContainerRef"
        class="mermaid-svg-wrapper"
        data-testid="mermaid-svg-wrapper"
        v-html="renderedSvg"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { GitFork, Code2, Eye, Copy, Check, AlertTriangle } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    code: string;
    title?: string;
    initialEditing?: boolean;
  }>(),
  {
    title: 'Diagrama Mermaid',
    initialEditing: false,
  }
);

const emit = defineEmits<{
  (e: 'update:code', val: string): void;
  (e: 'update:title', val: string): void;
}>();

const isEditingCode = ref(props.initialEditing);
const copied = ref(false);
const renderedSvg = ref('');
const renderError = ref<string | null>(null);
const svgContainerRef = ref<HTMLDivElement | null>(null);

function generateFallbackSvg(sourceCode: string): string {
  const lines = sourceCode.split('\n').filter((l) => l.trim().length > 0);
  const titleLine = lines[0] || 'Diagrama';

  return `
    <svg viewBox="0 0 500 160" width="100%" height="160" xmlns="http://www.w3.org/2000/svg" class="fallback-mermaid-svg">
      <rect width="100%" height="100%" rx="6" fill="#f8f9fa" stroke="#e9ecef" stroke-width="1" />
      <g transform="translate(40, 45)">
        <rect width="160" height="70" rx="6" fill="#ffffff" stroke="#ced4da" stroke-width="1.5" />
        <text x="80" y="40" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#24292f" text-anchor="middle">Origem</text>
      </g>
      <path d="M 200 80 L 290 80" stroke="#787774" stroke-width="1.5" marker-end="url(#arrow)" />
      <g transform="translate(300, 45)">
        <rect width="160" height="70" rx="6" fill="#ffffff" stroke="#ced4da" stroke-width="1.5" />
        <text x="80" y="40" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#24292f" text-anchor="middle">Destino</text>
      </g>
      <text x="50%" y="22" font-family="system-ui, sans-serif" font-size="11" font-weight="500" fill="#787774" text-anchor="middle">${titleLine}</text>
    </svg>
  `;
}

async function renderDiagram() {
  renderError.value = null;
  if (!props.code.trim()) {
    renderedSvg.value = '';
    return;
  }

  try {
    // Tenta renderizar via mermaid.js se global/importado, senão usa fallback limpo
    if (typeof window !== 'undefined' && (window as any).mermaid) {
      const id = `mermaid-svg-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await (window as any).mermaid.render(id, props.code);
      renderedSvg.value = svg;
    } else {
      renderedSvg.value = generateFallbackSvg(props.code);
    }
  } catch (err: unknown) {
    renderError.value = err instanceof Error ? err.message : 'Erro ao processar Mermaid';
  }
}

async function copyCode() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.code);
    }
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    copied.value = false;
  }
}

watch(() => props.code, renderDiagram, { immediate: true });
onMounted(renderDiagram);
</script>

<style scoped>
.mind-mermaid-shell {
  margin: 1.25rem 0;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background-color: #ffffff;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  transition: border-color 0.15s ease;
}

.mind-mermaid-shell:hover {
  border-color: #ced4da;
}

.mermaid-top-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.diagram-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #f1f1ef;
  color: #5a5955;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.725rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-icon {
  color: #787774;
}

.diagram-title-input {
  flex: 1;
  background: none;
  border: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #37352f;
  outline: none;
}

.mermaid-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 0.75rem;
  color: #57606a;
  cursor: pointer;
  transition: all 0.12s ease;
}

.action-btn:hover {
  background-color: #ffffff;
  color: #1a1a1a;
  border-color: #ced4da;
}

.copied-icon {
  color: #2b8a3e;
}

.mermaid-code-editor-area {
  padding: 8px;
  background-color: #fcfcfc;
}

.mermaid-textarea {
  width: 100%;
  border: none;
  background: none;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #24292f;
  outline: none;
  resize: vertical;
}

.mermaid-render-container {
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 140px;
  background-color: #ffffff;
}

.mermaid-svg-wrapper {
  width: 100%;
  max-width: 650px;
  display: flex;
  justify-content: center;
}

.mermaid-error-notice {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #fff5f5;
  border: 1px solid #ffc9c9;
  color: #c92a2a;
  font-size: 0.8125rem;
}
</style>
