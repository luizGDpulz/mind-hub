<template>
  <MindModal
    :model-value="modelValue"
    title="Configurações do Espaço"
    subtitle="Preferências, sincronização do Second Brain, atalhos e manutenção"
    max-width="780px"
    data-testid="mind-settings-modal"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <div class="settings-layout">
      <!-- Left Vertical Tab Menu -->
      <nav class="settings-nav-sidebar" aria-label="Abas de configuração">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="settings-nav-tab"
          :class="{ 'is-active': activeTab === tab.id }"
          :data-testid="`settings-tab-${tab.id}`"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="16" class="tab-icon" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Right Tab Content Panel -->
      <div class="settings-content-panel">
        <!-- 1. ABA GERAL -->
        <section v-if="activeTab === 'general'" class="settings-section" data-testid="settings-panel-general">
          <h4 class="section-title">Perfil &amp; Workspace</h4>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Nome do Espaço</label>
              <span class="setting-desc">Título exibido na barra superior e nos metadados.</span>
            </div>
            <input
              v-model="workspaceNameBuffer"
              type="text"
              class="setting-input"
              data-testid="setting-workspace-name-input"
            />
          </div>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Usuário Responsável</label>
              <span class="setting-desc">Luiz Pulz (Workspace Admin)</span>
            </div>
            <div class="setting-user-pill">
              <div class="user-avatar-mini">LP</div>
              <span class="user-email-text">luizg.pulz@gmail.com</span>
            </div>
          </div>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Idioma da Interface</label>
              <span class="setting-desc">Idioma nativo das mensagens e atalhos.</span>
            </div>
            <select v-model="selectedLanguage" class="setting-select" data-testid="setting-language-select">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>
        </section>

        <!-- 2. ABA APARÊNCIA -->
        <section v-else-if="activeTab === 'appearance'" class="settings-section" data-testid="settings-panel-appearance">
          <h4 class="section-title">Aparência &amp; Tipografia</h4>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Tema Visual</label>
              <span class="setting-desc">Design System sóbrio inspirado no Docmost / Notion.</span>
            </div>
            <span class="mind-pill-blue">mind-light-style (Ativo)</span>
          </div>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Densidade da Interface</label>
              <span class="setting-desc">Espaçamento dos nós da árvore e dos menus.</span>
            </div>
            <div class="setting-radio-group">
              <label class="radio-label">
                <input v-model="densityMode" type="radio" value="comfortable" data-testid="density-comfortable" />
                <span>Confortável</span>
              </label>
              <label class="radio-label">
                <input v-model="densityMode" type="radio" value="compact" data-testid="density-compact" />
                <span>Compacto</span>
              </label>
            </div>
          </div>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Largura do Canvas</label>
              <span class="setting-desc">Largura máxima da coluna central de leitura/escrita.</span>
            </div>
            <div class="setting-radio-group">
              <label class="radio-label">
                <input v-model="contentWidthMode" type="radio" value="centered" data-testid="width-centered" />
                <span>Centralizado (760px)</span>
              </label>
              <label class="radio-label">
                <input v-model="contentWidthMode" type="radio" value="full" data-testid="width-full" />
                <span>Largura Total (100%)</span>
              </label>
            </div>
          </div>
        </section>

        <!-- 3. ABA SINCRONIZAÇÃO E VAULT -->
        <section v-else-if="activeTab === 'sync'" class="settings-section" data-testid="settings-panel-sync">
          <h4 class="section-title">Vault &amp; Sincronização Local</h4>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Caminho do Second Brain (Mind)</label>
              <span class="setting-desc">Repositório mestre de documentação e padrões.</span>
            </div>
            <code class="setting-code-path">/home/ubuntu/mind</code>
          </div>

          <div class="setting-field-row">
            <div class="setting-meta">
              <label class="setting-label">Conexão Backend Fastify</label>
              <span class="setting-desc">Status da persistência durável no servidor.</span>
            </div>
            <span v-if="backendConnected" class="mind-pill-green">Conectado (Porta 3333)</span>
            <span v-else class="mind-pill-yellow">Modo Offline Local</span>
          </div>

          <div class="settings-action-box">
            <div class="setting-meta">
              <label class="setting-label">Sincronizar com o Vault do Servidor</label>
              <span class="setting-desc">Lê notas de <code>_Padrões</code> e ADRs e sincroniza com o banco.</span>
            </div>
            <button
              type="button"
              class="primary-blue-btn"
              data-testid="sync-vault-action-btn"
              @click="$emit('sync-server-vault')"
            >
              Sincronizar Agora
            </button>
          </div>

          <div class="settings-action-box">
            <div class="setting-meta">
              <label class="setting-label">Exportar Backup Markdown</label>
              <span class="setting-desc">Exporta todas as páginas ativas em formato Git/Frontmatter.</span>
            </div>
            <button
              type="button"
              class="topbar-text-btn"
              style="border: 1px solid var(--mind-border-subtle)"
              data-testid="export-markdown-action-btn"
              @click="$emit('export-markdown')"
            >
              Exportar Markdown
            </button>
          </div>
        </section>

        <!-- 4. ABA ATALHOS DE TECLADO -->
        <section v-else-if="activeTab === 'shortcuts'" class="settings-section" data-testid="settings-panel-shortcuts">
          <div class="shortcuts-header-row">
            <h4 class="section-title" style="margin-bottom: 0">Atalhos de Teclado</h4>
            <input
              v-model="shortcutSearch"
              type="text"
              placeholder="Filtrar atalhos..."
              class="shortcuts-filter-input"
              data-testid="shortcuts-filter-input"
            />
          </div>

          <div class="shortcuts-table-container">
            <table class="shortcuts-table">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Categoria</th>
                  <th>Atalho</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sc in filteredShortcuts" :key="sc.action">
                  <td>{{ sc.action }}</td>
                  <td><span class="shortcut-category-badge">{{ sc.category }}</span></td>
                  <td><kbd class="shortcut-kbd">{{ sc.keys }}</kbd></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 5. ABA ARMAZENAMENTO & MANUTENÇÃO -->
        <section v-else-if="activeTab === 'storage'" class="settings-section" data-testid="settings-panel-storage">
          <h4 class="section-title">Armazenamento &amp; Manutenção</h4>

          <div class="storage-metrics-grid">
            <div class="storage-metric-card">
              <span class="metric-num">{{ activePagesCount }}</span>
              <span class="metric-label">Páginas Ativas</span>
            </div>
            <div class="storage-metric-card">
              <span class="metric-num">{{ deletedPagesCount }}</span>
              <span class="metric-label">Itens na Lixeira</span>
            </div>
            <div class="storage-metric-card">
              <span class="metric-num">{{ databaseTasksCount }}</span>
              <span class="metric-label">Tarefas em Banco</span>
            </div>
          </div>

          <div class="settings-danger-box">
            <div class="setting-meta">
              <label class="setting-label is-danger">Esvaziar Lixeira</label>
              <span class="setting-desc">
                Exclui permanentemente todos os {{ deletedPagesCount }} itens da lixeira.
              </span>
            </div>
            <button
              type="button"
              class="danger-red-btn"
              :disabled="deletedPagesCount === 0"
              data-testid="empty-trash-from-settings-btn"
              @click="isConfirmEmptyOpen = true"
            >
              Esvaziar Lixeira
            </button>
          </div>
        </section>
      </div>
    </div>

    <!-- Confirm Empty Trash Dialog -->
    <MindConfirmDialog
      v-model="isConfirmEmptyOpen"
      title="Esvaziar Lixeira Permanentemente?"
      :message="`Tem certeza que deseja apagar todos os ${deletedPagesCount} itens da lixeira? Esta operação não pode ser revertida.`"
      confirm-label="Esvaziar Definitivamente"
      cancel-label="Cancelar"
      :danger="true"
      @confirm="$emit('empty-trash')"
    />

    <template #footer>
      <button
        type="button"
        class="confirm-cancel-btn"
        data-testid="settings-close-btn"
        @click="$emit('close')"
      >
        Fechar
      </button>
    </template>
  </MindModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  HardDrive,
  Keyboard,
  Palette,
  RefreshCw,
  Settings,
} from 'lucide-vue-next';
import MindModal from './MindModal.vue';
import MindConfirmDialog from './MindConfirmDialog.vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    workspaceName?: string;
    backendConnected?: boolean;
    activePagesCount?: number;
    deletedPagesCount?: number;
    databaseTasksCount?: number;
  }>(),
  {
    workspaceName: 'Mind de Luiz Pulz',
    backendConnected: true,
    activePagesCount: 0,
    deletedPagesCount: 0,
    databaseTasksCount: 0,
  },
);

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'sync-server-vault'): void;
  (e: 'export-markdown'): void;
  (e: 'empty-trash'): void;
  (e: 'close'): void;
}>();

const activeTab = ref<'general' | 'appearance' | 'sync' | 'shortcuts' | 'storage'>('general');
const workspaceNameBuffer = ref(props.workspaceName);
const selectedLanguage = ref('pt-BR');
const densityMode = ref<'comfortable' | 'compact'>('comfortable');
const contentWidthMode = ref<'centered' | 'full'>('centered');
const shortcutSearch = ref('');
const isConfirmEmptyOpen = ref(false);

const tabs = [
  { id: 'general', label: 'Geral', icon: Settings },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'sync', label: 'Vault & Sync', icon: RefreshCw },
  { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
  { id: 'storage', label: 'Armazenamento', icon: HardDrive },
] as const;

const allShortcuts = [
  { action: 'Alternar Barra Lateral', category: 'Navegação', keys: 'Ctrl + \\' },
  { action: 'Busca Rápida Split', category: 'Navegação', keys: 'Ctrl + K' },
  { action: 'Nova Página na Raiz', category: 'Criação', keys: 'Alt + N' },
  { action: 'Comandos de Bloco', category: 'Editor', keys: '/' },
  { action: 'Mencionar Página / Usuário', category: 'Editor', keys: '@' },
  { action: 'Renomear Item na Árvore', category: 'Arquivo', keys: 'F2' },
  { action: 'Duplicar Página', category: 'Arquivo', keys: 'Ctrl + D' },
  { action: 'Mover Página', category: 'Arquivo', keys: 'Ctrl + M' },
  { action: 'Excluir / Lixeira', category: 'Arquivo', keys: 'Del' },
  { action: 'Fechar Modais e Menus', category: 'Global', keys: 'Esc' },
];

const filteredShortcuts = computed(() => {
  const q = shortcutSearch.value.trim().toLowerCase();
  if (!q) return allShortcuts;
  return allShortcuts.filter(
    (s) =>
      s.action.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.keys.toLowerCase().includes(q),
  );
});
</script>

<style scoped>
.settings-layout {
  display: flex;
  min-height: 420px;
  gap: 20px;
}

.settings-nav-sidebar {
  width: 180px;
  flex-shrink: 0;
  border-right: 1px solid var(--mind-border-subtle, #e9ecef);
  padding-right: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--mind-text-secondary, #37352f);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s ease;
}

.settings-nav-tab:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.settings-nav-tab.is-active {
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-primary, #111827);
}

.tab-icon {
  color: var(--mind-text-muted, #868e96);
}

.settings-nav-tab.is-active .tab-icon {
  color: var(--mind-accent-primary, #1971c2);
}

.settings-content-panel {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  max-height: 520px;
  padding-right: 4px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  padding-bottom: 8px;
}

.setting-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.setting-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--mind-text-primary, #111827);
}

.setting-label.is-danger {
  color: #c92a2a;
}

.setting-desc {
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
  line-height: 1.4;
}

.setting-input {
  padding: 6px 10px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  font-size: 13px;
  color: var(--mind-text-primary, #111827);
  outline: none;
  width: 220px;
}

.setting-input:focus {
  border-color: var(--mind-accent-primary, #1971c2);
  background: #ffffff;
}

.setting-select {
  padding: 6px 10px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  font-size: 13px;
  color: var(--mind-text-primary, #111827);
  outline: none;
}

.setting-user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border-radius: 6px;
}

.user-avatar-mini {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--mind-border-control, #dee2e6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.user-email-text {
  font-size: 12.5px;
  color: var(--mind-text-secondary, #37352f);
}

.setting-radio-group {
  display: flex;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--mind-text-secondary, #37352f);
  cursor: pointer;
}

.setting-code-path {
  font-family: monospace;
  font-size: 12px;
  padding: 4px 8px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border-radius: 4px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
}

.settings-action-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  gap: 16px;
}

.settings-danger-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff5f5;
  border: 1px solid #ffc9c9;
  border-radius: 8px;
  gap: 16px;
  margin-top: 10px;
}

.danger-red-btn {
  background: #c92a2a;
  color: #ffffff;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.danger-red-btn:hover:not(:disabled) {
  background: #b02525;
}

.danger-red-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.storage-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.storage-metric-card {
  padding: 14px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--mind-text-primary, #111827);
}

.metric-label {
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

/* Shortcuts */
.shortcuts-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  padding-bottom: 8px;
}

.shortcuts-filter-input {
  padding: 5px 10px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  font-size: 12.5px;
  outline: none;
  width: 180px;
}

.shortcuts-table-container {
  overflow-x: auto;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.shortcuts-table th {
  text-align: left;
  padding: 8px 10px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  color: var(--mind-text-muted, #868e96);
  font-weight: 600;
  font-size: 12px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
}

.shortcuts-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-secondary, #37352f);
}

.shortcut-category-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  color: var(--mind-text-muted, #868e96);
}

.shortcut-kbd {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #ffffff;
  border: 1px solid var(--mind-border-control, #dee2e6);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.confirm-cancel-btn {
  background: transparent;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-secondary, #37352f);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
}

.confirm-cancel-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}
</style>
