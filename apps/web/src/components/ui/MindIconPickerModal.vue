<template>
  <div v-if="modelValue" class="mind-modal-backdrop" @click.self="close">
    <div
      class="mind-icon-picker-card"
      data-testid="mind-icon-picker-modal"
      role="dialog"
      aria-modal="true"
    >
      <div class="picker-header">
        <span class="picker-title">Escolher ícone</span>
        <button
          type="button"
          class="picker-close-btn"
          aria-label="Fechar"
          @click="close"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Tabs: Emojis, Técnicos, Imagem Externa -->
      <div class="picker-tabs">
        <button
          type="button"
          class="picker-tab-btn"
          :class="{ 'is-active': activeTab === 'emojis' }"
          @click="activeTab = 'emojis'"
        >
          Emojis
        </button>
        <button
          type="button"
          class="picker-tab-btn"
          :class="{ 'is-active': activeTab === 'technical' }"
          @click="activeTab = 'technical'"
        >
          Ícones Técnicos
        </button>
        <button
          type="button"
          class="picker-tab-btn"
          :class="{ 'is-active': activeTab === 'image' }"
          @click="activeTab = 'image'"
        >
          Link de Imagem
        </button>
      </div>

      <!-- Tab: Emojis -->
      <div v-if="activeTab === 'emojis'" class="picker-body">
        <div class="picker-search-bar">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar emoji..."
            class="picker-search-input"
            data-testid="icon-picker-search"
          />
        </div>
        <div class="emoji-grid" data-testid="emoji-grid">
          <button
            v-for="em in filteredEmojis"
            :key="em.char"
            type="button"
            class="emoji-grid-item"
            :title="em.name"
            @click="selectIcon(em.char)"
          >
            {{ em.char }}
          </button>
        </div>
      </div>

      <!-- Tab: Técnicos -->
      <div v-else-if="activeTab === 'technical'" class="picker-body">
        <div class="technical-grid">
          <button
            v-for="tech in technicalPresets"
            :key="tech.label"
            type="button"
            class="tech-grid-item"
            @click="selectIcon(tech.icon)"
          >
            <span class="tech-icon">{{ tech.icon }}</span>
            <span class="tech-label">{{ tech.label }}</span>
          </button>
        </div>
      </div>

      <!-- Tab: Link de Imagem / Logo Externa -->
      <div v-else class="picker-body image-tab-body">
        <div class="image-input-label">URL da imagem (logo, PNG ou SVG público):</div>
        <input
          v-model="imageUrlInput"
          type="text"
          placeholder="https://exemplo.com/logo.png"
          class="picker-search-input"
          data-testid="icon-picker-image-input"
          @keyup.enter="applyImageUrl"
        />
        <div v-if="imageUrlInput" class="image-preview-box">
          <span class="preview-caption">Pré-visualização:</span>
          <img :src="imageUrlInput" class="custom-icon-preview" alt="Preview" />
        </div>
        <div class="image-actions-row">
          <button
            type="button"
            class="picker-apply-btn"
            :disabled="!imageUrlInput.trim()"
            @click="applyImageUrl"
          >
            Aplicar ícone
          </button>
        </div>
      </div>

      <div class="picker-footer">
        <button
          type="button"
          class="picker-remove-btn"
          data-testid="icon-picker-remove-btn"
          @click="selectIcon('')"
        >
          Remover ícone
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { X } from 'lucide-vue-next';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select', icon: string): void;
}>();

const activeTab = ref<'emojis' | 'technical' | 'image'>('emojis');
const searchQuery = ref('');
const imageUrlInput = ref('');

const allEmojis = [
  { char: '📄', name: 'documento pagina nota' },
  { char: '📝', name: 'anotacao caderno lapis' },
  { char: '📁', name: 'pasta folder diretorio' },
  { char: '💡', name: 'ideia insight lampada luz' },
  { char: '📌', name: 'fixado pin lembrete' },
  { char: '🚀', name: 'foguete deploy lancamento rocket' },
  { char: '🔑', name: 'chave auth seguranca permission senha' },
  { char: '⚙️', name: 'config engrenagem settings' },
  { char: '💻', name: 'codigo computador laptop tiptap' },
  { char: '🖥️', name: 'servidor desktop monitor homelab' },
  { char: '🗄️', name: 'banco dados database postgres drizzle' },
  { char: '📊', name: 'grafico tabela metricas analytics' },
  { char: '🌐', name: 'web internet rede cloudflare api' },
  { char: '🛡️', name: 'escudo seguranca firewall' },
  { char: '📦', name: 'docker pacote package container' },
  { char: '🎯', name: 'alvo meta objetivo goal' },
  { char: '✨', name: 'brilho novo spark destaque' },
  { char: '🔥', name: 'fogo urgente prioridade hot' },
  { char: '📚', name: 'livro estudos docs documentacao' },
  { char: '🧠', name: 'cerebro mente second brain mind' },
  { char: '🛠️', name: 'ferramentas build manutencao' },
  { char: '🎨', name: 'design arte css ui' },
  { char: '⚡', name: 'raio rapido performance fast' },
  { char: '☕', name: 'cafe pausa descanso coffee' },
  { char: '🏷️', name: 'tag etiqueta categoria' },
  { char: '💬', name: 'comentario discussao chat' },
  { char: '🔔', name: 'notificacao aviso alerta' },
  { char: '📅', name: 'agenda data calendario prazo' },
  { char: '📈', name: 'crescimento investimento financeiro' },
  { char: '💼', name: 'trabalho negocios empresa work' },
  { char: '✅', name: 'concluido check feito ok' },
  { char: '⚠️', name: 'aviso atencao alerta warning' },
];

const technicalPresets = [
  { icon: '🗄️', label: 'Database (SQL/ORM)' },
  { icon: '🖥️', label: 'Servidor / Host' },
  { icon: '💻', label: 'Código / Frontend' },
  { icon: '🔑', label: 'Auth & Chaves' },
  { icon: '☁️', label: 'Cloud & Borda' },
  { icon: '🛡️', label: 'Segurança & Zero Trust' },
  { icon: '📦', label: 'Docker & GHCR' },
  { icon: '🌐', label: 'APIs & Webhooks' },
  { icon: '📊', label: 'Métricas & Logs' },
  { icon: '📚', label: 'Docs & Padrões' },
  { icon: '🧠', label: 'Mind / Vault' },
  { icon: '⚙️', label: 'Infra & Setup' },
];

const filteredEmojis = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return allEmojis;
  return allEmojis.filter((e) => e.name.includes(q) || e.char.includes(q));
});

function close(): void {
  emit('update:modelValue', false);
}

function selectIcon(icon: string): void {
  emit('select', icon);
  close();
}

function applyImageUrl(): void {
  const url = imageUrlInput.value.trim();
  if (!url) return;
  selectIcon(url);
}
</script>

<style scoped>
.mind-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(15, 23, 42, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.mind-icon-picker-card {
  width: 360px;
  max-width: 95vw;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 8px;
  box-shadow: var(--mind-shadow-popover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--mind-border-subtle);
}

.picker-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--mind-text-primary);
}

.picker-close-btn {
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-close-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.picker-tabs {
  display: flex;
  border-bottom: 1px solid var(--mind-border-subtle);
  padding: 0 8px;
  gap: 4px;
  background: var(--mind-bg-sidebar);
}

.picker-tab-btn {
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mind-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.12s ease;
}

.picker-tab-btn.is-active {
  color: var(--mind-text-primary);
  border-bottom-color: var(--mind-accent-primary);
  font-weight: 600;
}

.picker-body {
  padding: 12px 16px;
  max-height: 280px;
  overflow-y: auto;
}

.picker-search-bar {
  margin-bottom: 10px;
}

.picker-search-input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  background: var(--mind-bg-sidebar);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  font-size: 13px;
  color: var(--mind-text-primary);
  outline: none;
}

.picker-search-input:focus {
  border-color: var(--mind-border-control);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.emoji-grid-item {
  width: 100%;
  aspect-ratio: 1;
  border: none;
  background: transparent;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.emoji-grid-item:hover {
  background: var(--mind-bg-hover);
}

.technical-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.tech-grid-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--mind-border-subtle);
  background: var(--mind-bg-canvas);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--mind-text-primary);
  transition: all 0.1s ease;
  text-align: left;
}

.tech-grid-item:hover {
  background: var(--mind-bg-hover);
  border-color: var(--mind-border-control);
}

.tech-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.tech-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-tab-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-input-label {
  font-size: 12px;
  color: var(--mind-text-muted);
}

.image-preview-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--mind-bg-sidebar);
  border-radius: 6px;
}

.preview-caption {
  font-size: 12px;
  color: var(--mind-text-muted);
}

.custom-icon-preview {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid var(--mind-border-subtle);
}

.image-actions-row {
  display: flex;
  justify-content: flex-end;
}

.picker-apply-btn {
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 500;
  border: none;
  background: var(--mind-accent-primary);
  color: #ffffff;
  border-radius: 5px;
  cursor: pointer;
  transition: opacity 0.12s ease;
}

.picker-apply-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.picker-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--mind-border-subtle);
  background: var(--mind-bg-sidebar);
}

.picker-remove-btn {
  border: none;
  background: transparent;
  color: var(--mind-pill-pink-text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.picker-remove-btn:hover {
  background: var(--mind-bg-hover);
}
</style>
