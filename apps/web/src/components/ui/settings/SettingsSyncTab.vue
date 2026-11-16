<template>
  <section class="mind-settings-section sync-hub-section" data-testid="settings-panel-sync">
    <!-- OVERVIEW: MODULAR CONNECTIONS & SYNC HUB (Notion Connections Style) -->
    <template v-if="currentSubView === 'overview'">
      <header class="sync-hub-header">
        <h4 class="sync-hub-title">Sincronização &amp; Conexões</h4>
        <p class="sync-hub-subtitle">
          Conecte provedores externos ao Mind Hub para sincronizar seu Second Brain em formato
          aberto (Google OKF), exportar backups e integrar ferramentas — tudo gratuito e modular.
        </p>
      </header>

      <!-- Browse vs Manage Tabs -->
      <div class="hub-top-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="hub-top-tab"
          :class="{ 'is-active': hubTab === 'browse' }"
          :aria-selected="hubTab === 'browse'"
          data-testid="sync-hub-tab-browse"
          @click="hubTab = 'browse'"
        >
          Navegar por conexões
        </button>
        <button
          type="button"
          role="tab"
          class="hub-top-tab"
          :class="{ 'is-active': hubTab === 'manage' }"
          :aria-selected="hubTab === 'manage'"
          data-testid="sync-hub-tab-manage"
          @click="hubTab = 'manage'"
        >
          Gerenciar ({{ activeConnectionsCount }})
        </button>
      </div>

      <!-- Search & Category Filter Bar -->
      <div class="hub-filter-bar">
        <div class="hub-search-wrap">
          <Search :size="14" class="hub-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="hub-search-input"
            placeholder="Buscar conexões..."
            aria-label="Buscar conexões"
            data-testid="sync-hub-search-input"
          />
        </div>

        <select
          v-model="selectedCategory"
          class="hub-category-select"
          aria-label="Filtrar por categoria"
          data-testid="sync-hub-category-select"
        >
          <option value="all">Todas as categorias</option>
          <option value="sync">Sincronização</option>
          <option value="storage">Armazenamento</option>
          <option value="ai">IA &amp; Agentes</option>
        </select>
      </div>

      <div class="hub-section-caption">
        {{ hubTab === 'browse' ? 'Provedores disponíveis e em expansão' : 'Conexões ativas no espaço' }}
      </div>

      <!-- 2-Column Modular Connection Cards Grid -->
      <div v-if="filteredCatalog.length > 0" class="connections-grid">
        <article
          v-for="item in filteredCatalog"
          :key="item.id"
          class="connection-tile"
          :class="{ 'is-primary': item.isPrimary, 'is-muted': item.comingSoon }"
          :data-testid="item.id === 'github' ? 'sync-hub-github-card' : `sync-hub-${item.id}-card`"
        >
          <div class="tile-icon-box" aria-hidden="true">
            <svg
              v-if="item.id === 'github'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path
                d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.69-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.35.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
              />
            </svg>
            <Download v-else-if="item.id === 'markdown-export'" :size="18" />
            <Server v-else-if="item.id === 'fastify-local'" :size="18" />
            <FolderSync v-else-if="item.id === 'obsidian-bridge'" :size="18" />
            <HardDrive v-else-if="item.id === 'google-drive'" :size="18" />
            <Cpu v-else :size="18" />
          </div>

          <div class="tile-body">
            <div class="tile-title-row">
              <span class="tile-name">{{ item.name }}</span>
              <span class="tile-author">{{ item.authorLabel }}</span>
            </div>
            <p class="tile-desc">{{ item.description }}</p>
            <div v-if="item.id === 'github' && gitHubStatus?.configured" class="tile-status-meta">
              <span class="mind-pill-green">
                Conectado ({{ gitHubStatus.repository }})
              </span>
            </div>
          </div>

          <div class="tile-action">
            <button
              v-if="item.id === 'github'"
              type="button"
              class="tile-cta-btn"
              :class="{ 'is-primary-cta': !gitHubStatus?.configured }"
              data-testid="open-github-sync-view-btn"
              @click="setSubView('github')"
            >
              {{ gitHubStatus?.configured ? 'Gerenciar' : 'Conectar' }}
            </button>

            <button
              v-else-if="item.id === 'markdown-export'"
              type="button"
              class="tile-cta-btn"
              data-testid="export-markdown-action-btn"
              @click="$emit('export-markdown')"
            >
              Exportar
            </button>

            <span
              v-else-if="item.id === 'fastify-local'"
              :class="backendConnected ? 'mind-pill-green' : 'mind-pill-yellow'"
            >
              {{ backendConnected ? 'Porta 3333' : 'Offline' }}
            </span>

            <span v-else class="tile-soon-pill">Em breve</span>
          </div>
        </article>
      </div>

      <div v-else class="hub-empty-state">
        Nenhuma conexão encontrada para os filtros aplicados.
      </div>
    </template>

    <!-- DEDICATED GITHUB CONNECTION VIEW (Notion Modular Detail Style) -->
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
import { computed, ref } from 'vue';
import {
  ArrowLeft,
  Cpu,
  Download,
  FolderSync,
  HardDrive,
  Search,
  Server,
} from 'lucide-vue-next';
import type {
  GitHubSyncConfigInput,
  GitHubSyncStatus,
  GitHubTestConnectionInput,
  GitHubTestConnectionResult,
} from '@mind-hub/shared';
import { CONNECTIONS_CATALOG, type ConnectionCategory } from './connections-registry.js';
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

const hubTab = ref<'browse' | 'manage'>('browse');
const searchQuery = ref('');
const selectedCategory = ref<ConnectionCategory>('all');

const currentSubView = computed(() => props.subView);

const activeConnectionsCount = computed(() => {
  let count = props.backendConnected === true ? 1 : 0;
  if (props.gitHubStatus?.configured === true) count += 1;
  return count;
});

const filteredCatalog = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return CONNECTIONS_CATALOG.filter((item) => {
    if (hubTab.value === 'manage') {
      if (item.comingSoon || item.id === 'markdown-export') return false;
      if (item.id === 'github' && !props.gitHubStatus?.configured) return false;
      if (item.id === 'fastify-local' && !props.backendConnected) return false;
    }
    if (selectedCategory.value !== 'all' && item.category !== selectedCategory.value) {
      return false;
    }
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tagline.toLowerCase().includes(q)
    );
  });
});

function setSubView(view: 'overview' | 'github'): void {
  emit('update:subView', view);
}
</script>

<style scoped>
@import './settings-shared.css';

.sync-hub-section {
  gap: 16px;
}

.sync-hub-header {
  padding-bottom: 4px;
}

.sync-hub-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.sync-hub-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--mind-text-muted, #868e96);
  line-height: 1.5;
  max-width: 680px;
}

.hub-top-tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
}

.hub-top-tab {
  border: 1px solid transparent;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  font-size: 13px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.hub-top-tab:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.hub-top-tab.is-active {
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-primary, #111827);
  font-weight: 600;
}

.hub-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hub-search-wrap {
  flex: 1;
  min-width: 220px;
  position: relative;
  display: flex;
  align-items: center;
}

.hub-search-icon {
  position: absolute;
  left: 10px;
  color: var(--mind-text-muted, #868e96);
  pointer-events: none;
}

.hub-search-input {
  width: 100%;
  height: 34px;
  padding: 0 10px 0 30px;
  border-radius: 6px;
  border: 1px solid var(--mind-border-control, #dee2e6);
  background: var(--mind-bg-canvas, #ffffff);
  color: var(--mind-text-primary, #111827);
  font-size: 13px;
  outline: none;
}

.hub-search-input:focus {
  border-color: var(--mind-accent-primary, #1971c2);
}

.hub-category-select {
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--mind-border-control, #dee2e6);
  background: var(--mind-bg-canvas, #ffffff);
  color: var(--mind-text-secondary, #37352f);
  font-size: 13px;
  outline: none;
}

.hub-section-caption {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mind-text-secondary, #37352f);
  margin-top: 4px;
}

.connections-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.connection-tile {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 9px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-canvas, #ffffff);
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.connection-tile.is-primary {
  border-color: #d0ebff;
}

.connection-tile.is-muted {
  background: var(--mind-bg-sidebar, #f8f9fa);
}

.tile-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-primary, #111827);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tile-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tile-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tile-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.tile-author {
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
}

.tile-desc {
  margin: 0;
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
  line-height: 1.4;
}

.tile-status-meta {
  margin-top: 2px;
}

.tile-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.tile-cta-btn {
  height: 30px;
  padding: 0 11px;
  border-radius: 6px;
  border: 1px solid var(--mind-border-control, #dee2e6);
  background: var(--mind-bg-canvas, #ffffff);
  color: var(--mind-text-primary, #111827);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.tile-cta-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.tile-cta-btn.is-primary-cta {
  border-color: var(--mind-accent-primary, #1971c2);
  color: var(--mind-accent-primary, #1971c2);
}

.tile-cta-btn.is-primary-cta:hover {
  background: #e7f5ff;
}

.tile-soon-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-muted, #868e96);
  white-space: nowrap;
}

.hub-empty-state {
  padding: 28px 16px;
  border-radius: 8px;
  border: 1px dashed var(--mind-border-control, #dee2e6);
  background: var(--mind-bg-sidebar, #f8f9fa);
  text-align: center;
  font-size: 13px;
  color: var(--mind-text-muted, #868e96);
}

.secondary-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--mind-border-control, #dee2e6);
  background: #ffffff;
  color: var(--mind-text-secondary, #37352f);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
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

@media (max-width: 820px) {
  .connections-grid {
    grid-template-columns: 1fr;
  }
}
</style>
