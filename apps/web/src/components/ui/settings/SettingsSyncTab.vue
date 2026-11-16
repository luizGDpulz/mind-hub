<template>
  <section class="mind-settings-section sync-hub-section" data-testid="settings-panel-sync">
    <!-- OVERVIEW: MACRO SYNCHRONIZATION HUB -->
    <template v-if="currentSubView === 'overview'">
      <header class="sync-hub-header">
        <div>
          <h4 class="sync-hub-title">Sincronização &amp; Conexões</h4>
          <p class="sync-hub-subtitle">
            Conecte seu Second Brain a provedores externos em formato aberto (Google OKF), com
            controle total dos dados e sem paywall.
          </p>
        </div>
      </header>

      <div class="sync-providers-grid">
        <!-- Main Provider: GitHub -->
        <article class="sync-provider-card is-primary" data-testid="sync-hub-github-card">
          <div class="provider-card-top">
            <div class="provider-identity">
              <div class="provider-logo-box" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path
                    d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.69-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.35.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
                  />
                </svg>
              </div>
              <div>
                <div class="provider-title-row">
                  <h5 class="provider-title">GitHub</h5>
                  <span class="mind-pill-blue">Principal &bull; Gratuito</span>
                </div>
                <p class="provider-tagline">Backup soberano &amp; Delta Sync em repositório Git</p>
              </div>
            </div>

            <span class="provider-status-pill" :class="gitHubPillClass">
              {{ gitHubPillLabel }}
            </span>
          </div>

          <p class="provider-desc">
            Sincronização bidirecional de notas, subpáginas e imagens (<code>./assets</code>) em
            um repositório privado ou público no GitHub via protocolo Google OKF e Delta Sync
            SHA-256.
          </p>

          <div class="provider-card-footer">
            <div class="provider-meta-hint">
              <Lock v-if="gitHubStatus?.isPrivate" :size="13" />
              <GitBranch v-else :size="13" />
              <span>
                {{
                  gitHubStatus?.configured
                    ? `Branch ${gitHubStatus.branch} • ${gitHubStatus.pendingChangesCount} pendente(s)`
                    : 'Compatível com Fine-Grained PAT (1 repo) ou Token Clássico'
                }}
              </span>
            </div>

            <button
              type="button"
              class="primary-blue-btn"
              data-testid="open-github-sync-view-btn"
              @click="setSubView('github')"
            >
              <span>{{
                gitHubStatus?.configured ? 'Gerenciar Sincronização' : 'Configurar GitHub'
              }}</span>
              <ArrowRight :size="14" />
            </button>
          </div>
        </article>

        <!-- Markdown Export Card -->
        <article class="sync-provider-card">
          <div class="provider-card-top">
            <div class="provider-identity">
              <div class="provider-logo-box is-subtle" aria-hidden="true">
                <Download :size="19" />
              </div>
              <div>
                <div class="provider-title-row">
                  <h5 class="provider-title">Exportação &amp; Pacote Markdown</h5>
                </div>
                <p class="provider-tagline">Obsidian / Google OKF Snapshot</p>
              </div>
            </div>
          </div>

          <p class="provider-desc">
            Exporta todas as páginas ativas com frontmatter YAML, hierarquia de pastas e links
            padronizados para backup offline imediato.
          </p>

          <div class="provider-card-footer">
            <span class="provider-meta-hint">Formato aberto (.md) sem lock-in</span>
            <button
              type="button"
              class="secondary-action-btn"
              data-testid="export-markdown-action-btn"
              @click="$emit('export-markdown')"
            >
              <Download :size="14" />
              <span>Exportar Markdown</span>
            </button>
          </div>
        </article>

        <!-- Local Fastify Persistence Card -->
        <article class="sync-provider-card">
          <div class="provider-card-top">
            <div class="provider-identity">
              <div class="provider-logo-box is-subtle" aria-hidden="true">
                <Server :size="19" />
              </div>
              <div>
                <div class="provider-title-row">
                  <h5 class="provider-title">Persistência Local &amp; Backend Fastify</h5>
                </div>
                <p class="provider-tagline">Camada quente de baixa latência</p>
              </div>
            </div>

            <span v-if="backendConnected" class="mind-pill-green">Conectado (Porta 3333)</span>
            <span v-else class="mind-pill-yellow">Modo Offline Local</span>
          </div>

          <p class="provider-desc">
            Garante persistência durável das notas, tarefas e anexos no servidor antes de enviar
            deltas assíncronos para o GitHub.
          </p>
        </article>
      </div>
    </template>

    <!-- DEDICATED GITHUB VIEW (Notion Connections Style) -->
    <template v-else>
      <div class="github-subview-nav">
        <button
          type="button"
          class="back-to-hub-btn"
          data-testid="github-back-to-sync-hub-btn"
          @click="setSubView('overview')"
        >
          <ArrowLeft :size="14" />
          <span>Voltar para Sincronizações</span>
        </button>

        <button
          type="button"
          class="secondary-action-btn is-compact"
          data-testid="export-markdown-action-btn"
          @click="$emit('export-markdown')"
        >
          <Download :size="13" />
          <span>Exportar Markdown</span>
        </button>
      </div>

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
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArrowLeft, ArrowRight, Download, GitBranch, Lock, Server } from 'lucide-vue-next';
import type {
  GitHubSyncConfigInput,
  GitHubSyncStatus,
  GitHubTestConnectionInput,
  GitHubTestConnectionResult,
} from '@mind-hub/shared';
import GitHubSyncWizard from './GitHubSyncWizard.vue';

const props = withDefaults(
  defineProps<{
    subView?: 'overview' | 'github';
    backendConnected: boolean;
    gitHubStatus?: GitHubSyncStatus;
    gitHubBusy?: boolean;
    gitHubTesting?: boolean;
    gitHubTestResult?: GitHubTestConnectionResult | null;
    gitHubConfigureError?: string;
  }>(),
  {
    subView: 'overview',
    gitHubBusy: false,
    gitHubTesting: false,
    gitHubTestResult: null,
    gitHubConfigureError: '',
  },
);

const emit = defineEmits<{
  (e: 'update:subView', value: 'overview' | 'github'): void;
  (e: 'sync-server-vault'): void;
  (e: 'export-markdown'): void;
  (e: 'github-test-connection', payload: GitHubTestConnectionInput): void;
  (e: 'github-configure', payload: GitHubSyncConfigInput): void;
  (e: 'github-sync-now'): void;
  (e: 'github-disconnect'): void;
}>();

const currentSubView = computed(() => props.subView);

function setSubView(view: 'overview' | 'github'): void {
  emit('update:subView', view);
}

const gitHubPillLabel = computed(() => {
  const s = props.gitHubStatus;
  if (!s?.configured) return 'Não conectado';
  if (s.state === 'syncing') return 'Sincronizando...';
  if (s.state === 'error') return 'Erro de sincronização';
  if (s.state === 'conflict') return 'Conflito detectado';
  return `Conectado (${s.repository})`;
});

const gitHubPillClass = computed(() => {
  const s = props.gitHubStatus;
  if (!s?.configured) return 'pill-neutral';
  if (s.state === 'syncing') return 'mind-pill-blue';
  if (s.state === 'error') return 'mind-pill-pink';
  if (s.state === 'conflict') return 'mind-pill-yellow';
  return 'mind-pill-green';
});
</script>

<style scoped>
@import './settings-shared.css';

.sync-hub-section {
  gap: 20px;
}

.sync-hub-header {
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  padding-bottom: 14px;
}

.sync-hub-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.sync-hub-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--mind-text-muted, #868e96);
  line-height: 1.45;
}

.sync-providers-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sync-provider-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 10px;
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  transition: border-color 0.12s ease;
}

.sync-provider-card.is-primary {
  border-color: #d0ebff;
  background: #ffffff;
}

.provider-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.provider-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-logo-box {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: #f1f3f5;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-primary, #111827);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.provider-logo-box.is-subtle {
  color: var(--mind-text-secondary, #37352f);
}

.provider-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.provider-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.provider-tagline {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

.provider-status-pill {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.pill-neutral {
  background: #f1f3f5;
  color: #495057;
}

.provider-desc {
  margin: 0;
  font-size: 13px;
  color: var(--mind-text-secondary, #37352f);
  line-height: 1.5;
}

.provider-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--mind-border-subtle, #e9ecef);
  flex-wrap: wrap;
}

.provider-meta-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

.primary-blue-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 6px;
  border: none;
  background: var(--mind-accent-primary, #1971c2);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.primary-blue-btn:hover {
  background: var(--mind-accent-hover, #1864ab);
}

.secondary-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid var(--mind-border-control, #dee2e6);
  background: #ffffff;
  color: var(--mind-text-secondary, #37352f);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.secondary-action-btn.is-compact {
  height: 30px;
  font-size: 12px;
  padding: 0 10px;
}

.secondary-action-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.github-subview-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
}

.back-to-hub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-sidebar, #f8f9fa);
  color: var(--mind-text-secondary, #37352f);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.back-to-hub-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}
</style>
