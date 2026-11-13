<template>
  <section class="mind-settings-section" data-testid="settings-panel-sync">
    <GitHubSyncWizard
      :status="gitHubStatus"
      :busy="gitHubBusy"
      :testing="gitHubTesting"
      :test-result="gitHubTestResult"
      :configure-error="gitHubConfigureError"
      @test-connection="$emit('github-test-connection', $event)"
      @configure="$emit('github-configure', $event)"
      @sync-now="$emit('github-sync-now')"
      @disconnect="$emit('github-disconnect')"
    />

    <h4 class="mind-settings-title" style="margin-top: 8px">Vault Local &amp; Exportação</h4>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Caminho do Second Brain (Mind)</label>
        <span class="mind-setting-desc">Repositório mestre de documentação e padrões.</span>
      </div>
      <code class="setting-code-path">/home/ubuntu/mind</code>
    </div>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Conexão Backend Fastify</label>
        <span class="mind-setting-desc">Status da persistência durável no servidor.</span>
      </div>
      <span v-if="backendConnected" class="mind-pill-green">Conectado (Porta 3333)</span>
      <span v-else class="mind-pill-yellow">Modo Offline Local</span>
    </div>

    <div class="settings-action-box">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Sincronizar com o Vault do Servidor</label>
        <span class="mind-setting-desc">Lê notas de <code>_Padrões</code> e ADRs e sincroniza com o banco.</span>
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
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Exportar Backup Markdown</label>
        <span class="mind-setting-desc">Exporta todas as páginas ativas em formato Git/Frontmatter.</span>
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
</template>

<script setup lang="ts">
import type {
  GitHubSyncConfigInput,
  GitHubSyncStatus,
  GitHubTestConnectionInput,
  GitHubTestConnectionResult,
} from '@mind-hub/shared';
import GitHubSyncWizard from './GitHubSyncWizard.vue';

defineProps<{
  backendConnected: boolean;
  gitHubStatus?: GitHubSyncStatus;
  gitHubBusy?: boolean;
  gitHubTesting?: boolean;
  gitHubTestResult?: GitHubTestConnectionResult | null;
  gitHubConfigureError?: string;
}>();

defineEmits<{
  (e: 'sync-server-vault'): void;
  (e: 'export-markdown'): void;
  (e: 'github-test-connection', payload: GitHubTestConnectionInput): void;
  (e: 'github-configure', payload: GitHubSyncConfigInput): void;
  (e: 'github-sync-now'): void;
  (e: 'github-disconnect'): void;
}>();
</script>

<style scoped>
@import './settings-shared.css';

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
</style>
