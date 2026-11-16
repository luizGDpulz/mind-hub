<template>
  <div class="github-provider-shell" data-testid="github-sync-wizard">
    <!-- Left Provider Rail (Notion GitHub Modular Modes Style) -->
    <aside class="github-provider-sidebar">
      <div class="provider-brand-block">
        <div class="github-octocat-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path
              d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.69-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.35.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
            />
          </svg>
        </div>
        <div>
          <h5 class="github-provider-name">GitHub</h5>
          <p class="github-provider-state">
            {{ status.configured ? 1 : 0 }} de {{ GITHUB_CONNECTION_MODES.length }} tipos conectados
          </p>
        </div>
      </div>

      <span class="mind-status-badge" :class="statusBadgeClass" data-testid="github-status-badge">
        {{ statusBadgeLabel }}
      </span>

      <nav class="provider-capability-list" aria-label="Tipos de conexão GitHub">
        <button
          v-for="mode in GITHUB_CONNECTION_MODES"
          :key="mode.id"
          type="button"
          class="capability-item"
          :class="{ 'is-active': activeModeId === mode.id }"
          :data-testid="`github-mode-tab-${mode.id}`"
          @click="activeModeId = mode.id"
        >
          <RefreshCw v-if="mode.id === 'vault_okf'" :size="15" class="capability-icon" />
          <GitPullRequest v-else-if="mode.id === 'dev_sync'" :size="15" class="capability-icon" />
          <Sparkles v-else :size="15" class="capability-icon" />

          <div class="capability-copy">
            <div class="capability-title-row">
              <span class="capability-title">{{ mode.label }}</span>
            </div>
            <span class="capability-desc">{{ mode.subtitle }}</span>
          </div>
        </button>
      </nav>
    </aside>

    <!-- Right Provider Main Panel -->
    <div class="github-provider-main">
      <!-- MODE 1: VAULT OKF SYNC (Active & Configurable) -->
      <template v-if="activeMode.id === 'vault_okf'">
        <header class="mode-detail-header">
          <div>
            <div class="mode-title-line">
              <h5 class="mode-detail-title">{{ activeMode.label }}</h5>
              <span class="mind-pill-blue">Gratuito &bull; Token do Vault</span>
            </div>
            <p class="mode-detail-sub">
              Escopo isolado: <code>{{ activeMode.tokenScopeSummary }}</code>
            </p>
          </div>
        </header>

        <!-- Top Tabs -->
        <div class="provider-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            class="provider-tab-btn"
            :class="{ 'is-active': activePanelTab === 'overview' }"
            :aria-selected="activePanelTab === 'overview'"
            data-testid="github-tab-overview"
            @click="activePanelTab = 'overview'"
          >
            Visão geral &amp; Configuração
          </button>
          <button
            type="button"
            role="tab"
            class="provider-tab-btn"
            :class="{ 'is-active': activePanelTab === 'syncs' }"
            :aria-selected="activePanelTab === 'syncs'"
            data-testid="github-tab-syncs"
            @click="activePanelTab = 'syncs'"
          >
            Suas sincronizações ({{ status.configured ? 1 : 0 }})
          </button>
        </div>

        <!-- TAB 1: OVERVIEW & WIZARD / CONNECTED PANEL -->
        <div v-if="activePanelTab === 'overview'" class="provider-tab-content">
          <!-- CONNECTED STATE -->
          <div
            v-if="status.configured && !isReconfiguring"
            class="github-connected-panel"
            data-testid="github-connected-panel"
          >
            <div class="connected-hero-row">
              <div class="connected-repo-heading">
                <Lock v-if="status.isPrivate" :size="15" class="repo-lock-icon" />
                <GitBranch v-else :size="15" class="repo-branch-icon" />
                <span class="connected-repo-name" data-testid="github-connected-repo">
                  {{ status.repository }}
                </span>
                <span v-if="status.isPrivate" class="mind-pill-blue">🔒 Privado</span>
              </div>

              <a
                v-if="repoWebUrl"
                :href="repoWebUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="external-token-link"
              >
                <span>Abrir no GitHub</span>
                <ExternalLink :size="12" />
              </a>
            </div>

            <div class="connected-meta-grid">
              <div class="connected-meta-item">
                <span class="meta-label">Branch</span>
                <code class="meta-code">{{ status.branch }}</code>
              </div>
              <div class="connected-meta-item">
                <span class="meta-label">Alterações Pendentes</span>
                <span class="meta-value" data-testid="github-pending-count">
                  {{
                    status.pendingChangesCount > 0
                      ? `${status.pendingChangesCount} pendente(s)`
                      : 'Tudo sincronizado'
                  }}
                </span>
              </div>
              <div class="connected-meta-item">
                <span class="meta-label">Último Commit</span>
                <code class="meta-code">
                  {{ status.lastCommitSha ? status.lastCommitSha.slice(0, 7) : '—' }}
                </code>
              </div>
              <div class="connected-meta-item">
                <span class="meta-label">Auto-Sync</span>
                <span class="meta-value">
                  {{ status.autoSyncEnabled ? `Ativo (${status.debounceSeconds}s)` : 'Manual' }}
                </span>
              </div>
            </div>

            <div v-if="status.lastError" class="wizard-feedback is-error" data-testid="github-sync-error">
              <AlertCircle :size="14" />
              <span>{{ status.lastError }}</span>
            </div>

            <div class="connected-actions-row">
              <button
                type="button"
                class="primary-blue-btn"
                :disabled="busy"
                data-testid="github-sync-now-btn"
                @click="$emit('sync-now')"
              >
                <RefreshCw :size="14" :class="{ 'spin-icon': busy }" />
                <span>{{ busy ? 'Sincronizando...' : 'Sincronizar Agora' }}</span>
              </button>

              <button
                type="button"
                class="secondary-ghost-btn"
                :disabled="busy"
                data-testid="github-reconfigure-btn"
                @click="startReconfigure"
              >
                <span>Reconfigurar</span>
              </button>

              <button
                type="button"
                class="secondary-ghost-btn danger"
                :disabled="busy"
                data-testid="github-disconnect-btn"
                @click="handleDisconnect"
              >
                <Unlink :size="14" />
                <span>Desconectar</span>
              </button>
            </div>

            <!-- Recent sync history -->
            <div
              v-if="status.history.length > 0"
              class="sync-history-box"
              data-testid="github-sync-history"
            >
              <div class="history-title">Histórico Recente</div>
              <ul class="history-list">
                <li
                  v-for="entry in status.history.slice(0, 5)"
                  :key="entry.id"
                  class="history-row"
                >
                  <span class="history-dir">{{ formatDirection(entry.direction) }}</span>
                  <span class="history-summary">{{ entry.summary }}</span>
                  <span class="history-time">{{ formatTimestamp(entry.timestamp) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- PLUG & PLAY 3-STEP WIZARD -->
          <div v-else class="wizard-shell">
            <!-- Visual Diagram Card -->
            <div class="okf-visual-banner" aria-hidden="true">
              <div class="okf-node-chip">
                <Lock :size="14" />
                <span>GitHub Privado</span>
              </div>
              <div class="okf-sync-arrow">
                <span class="arrow-dots" />
                <span class="arrow-badge">OKF v0.2 &bull; SHA-256</span>
                <span class="arrow-dots" />
              </div>
              <div class="okf-node-chip is-mind">
                <FileText :size="14" />
                <span>Mind Hub (<code>index.md</code> + <code>./assets</code>)</span>
              </div>
            </div>

            <div v-if="isReconfiguring" class="reconfigure-bar">
              <span>Atualizando credenciais ou repositório de destino</span>
              <button
                type="button"
                class="secondary-ghost-btn"
                @click="isReconfiguring = false"
              >
                Cancelar
              </button>
            </div>

            <div class="wizard-container" data-testid="github-wizard-stepper">
              <div class="wizard-steps-bar">
                <button
                  v-for="stepNum in [1, 2, 3] as const"
                  :key="stepNum"
                  type="button"
                  class="wizard-step-chip"
                  :class="{
                    'is-current': currentStep === stepNum,
                    'is-done': currentStep > stepNum,
                  }"
                  :data-testid="`wizard-step-tab-${stepNum}`"
                  @click="goToStep(stepNum)"
                >
                  <span class="step-index">{{ stepNum }}</span>
                  <span>{{ stepLabel(stepNum) }}</span>
                </button>
              </div>

              <!-- Step 1: Token PAT (Fine-Grained Exclusive vs Classic) -->
              <div v-if="currentStep === 1" class="wizard-step-body" data-testid="wizard-step-1">
                <div class="token-mode-tabs" role="tablist" aria-label="Tipo de Token GitHub">
                  <button
                    type="button"
                    role="tab"
                    class="token-mode-tab"
                    :class="{ 'is-active': tokenGuideMode === 'fine-grained' }"
                    :aria-selected="tokenGuideMode === 'fine-grained'"
                    data-testid="token-mode-fine-grained"
                    @click="tokenGuideMode = 'fine-grained'"
                  >
                    Token Exclusivo de 1 Repo (Recomendado)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class="token-mode-tab"
                    :class="{ 'is-active': tokenGuideMode === 'classic' }"
                    :aria-selected="tokenGuideMode === 'classic'"
                    data-testid="token-mode-classic"
                    @click="tokenGuideMode = 'classic'"
                  >
                    Token Clássico (escopo repo)
                  </button>
                </div>

                <!-- Fine-Grained Guide (Matches Current GitHub UI) -->
                <div v-if="tokenGuideMode === 'fine-grained'" class="plug-play-helper is-column">
                  <div class="helper-header-row">
                    <div class="helper-copy">
                      <strong>Chave exclusiva para o repositório do Vault</strong>
                      <p>
                        Isole o backup do seu Second Brain: esta chave acessa apenas 1 repositório e
                        não mistura permissões com Issues/PRs de projetos.
                      </p>
                    </div>
                    <a
                      href="https://github.com/settings/personal-access-tokens/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="external-token-link"
                      data-testid="github-create-fine-grained-token-link"
                    >
                      <span>Gerar Token Exclusivo no GitHub</span>
                      <ExternalLink :size="13" />
                    </a>
                  </div>
                  <ol class="token-guide-steps">
                    <li>
                      Em <strong>Repository access</strong>, marque
                      <strong>Only select repositories</strong> e selecione apenas o repo privado do
                      Vault (ex: <code>seu-usuario/meu-second-brain</code>).
                    </li>
                    <li>
                      Na caixa <strong>Permissions</strong> (aba <strong>Repositories</strong>),
                      clique no botão <strong>Add permissions</strong>, marque
                      <strong>Contents</strong> e mude para <strong>Read and write</strong>
                      <em>(o GitHub adicionará Metadata: Read-only automaticamente)</em>.
                    </li>
                    <li>
                      Clique em <strong>Generate token</strong> e cole a chave
                      <code>github_pat_...</code> abaixo.
                    </li>
                  </ol>
                </div>

                <!-- Classic PAT Guide -->
                <div v-else class="plug-play-helper is-column">
                  <div class="helper-header-row">
                    <div class="helper-copy">
                      <strong>Token Clássico (escopo <code>repo</code>)</strong>
                      <p>
                        Se você já criou um Token Clássico marcando a caixa <code>repo</code> (Full
                        control of private repositories), ele já funciona diretamente com
                        repositórios privados.
                      </p>
                    </div>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=Mind%20Hub%20Sync"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="external-token-link"
                      data-testid="github-create-token-link"
                    >
                      <span>Gerar Token Clássico (repo)</span>
                      <ExternalLink :size="13" />
                    </a>
                  </div>
                </div>

                <div>
                  <label class="wizard-field-label" for="github-pat-input">
                    Token Pessoal do Vault (PAT)
                  </label>
                  <div class="token-input-wrap">
                    <input
                      id="github-pat-input"
                      v-model="tokenInput"
                      :type="showToken ? 'text' : 'password'"
                      class="wizard-text-input"
                      placeholder="github_pat_... ou ghp_..."
                      autocomplete="off"
                      data-testid="github-token-input"
                    />
                    <button
                      type="button"
                      class="toggle-visibility-btn"
                      :aria-label="showToken ? 'Ocultar token' : 'Mostrar token'"
                      @click="showToken = !showToken"
                    >
                      {{ showToken ? 'Ocultar' : 'Mostrar' }}
                    </button>
                  </div>
                </div>

                <div class="wizard-footer-nav">
                  <span class="scope-separation-hint">
                    Token exclusivo do Vault &bull; Issues e PRs usarão outro perfil
                  </span>
                  <button
                    type="button"
                    class="primary-blue-btn"
                    :disabled="!tokenInput.trim()"
                    data-testid="github-step1-next-btn"
                    @click="currentStep = 2"
                  >
                    <span>Próximo: Repositório</span>
                    <ArrowRight :size="14" />
                  </button>
                </div>
              </div>

              <!-- Step 2: Repository & Connection Test -->
              <div v-else-if="currentStep === 2" class="wizard-step-body" data-testid="wizard-step-2">
                <div class="repo-helper-row">
                  <span class="repo-helper-hint">
                    Informe um repositório privado existente no formato
                    <code>usuario/repositorio</code>.
                  </span>
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="external-token-link"
                  >
                    <span>Criar repositório privado no GitHub</span>
                    <ExternalLink :size="12" />
                  </a>
                </div>

                <div class="repo-fields-grid">
                  <div>
                    <label class="wizard-field-label" for="github-repo-input">Repositório</label>
                    <input
                      id="github-repo-input"
                      v-model="repositoryInput"
                      type="text"
                      class="wizard-text-input"
                      placeholder="seu-usuario/meu-second-brain"
                      data-testid="github-repo-input"
                    />
                  </div>
                  <div>
                    <label class="wizard-field-label" for="github-branch-input">Branch</label>
                    <input
                      id="github-branch-input"
                      v-model="branchInput"
                      type="text"
                      class="wizard-text-input"
                      placeholder="main"
                      data-testid="github-branch-input"
                    />
                  </div>
                </div>

                <div class="test-connection-row">
                  <button
                    type="button"
                    class="secondary-ghost-btn"
                    :disabled="testing || !repositoryInput.trim() || !tokenInput.trim()"
                    data-testid="github-test-btn"
                    @click="handleTestConnection"
                  >
                    <PlugZap :size="14" />
                    <span>{{ testing ? 'Testando conexão...' : 'Testar Conexão' }}</span>
                  </button>
                </div>

                <div
                  v-if="testResult"
                  class="wizard-feedback"
                  :class="testResult.ok ? 'is-success' : 'is-error'"
                  data-testid="github-test-feedback"
                >
                  <CheckCircle2 v-if="testResult.ok" :size="14" />
                  <AlertCircle v-else :size="14" />
                  <span class="feedback-text">{{ testResult.message }}</span>
                  <span
                    v-if="testResult.ok && testResult.isPrivate !== undefined"
                    class="mind-pill-blue"
                  >
                    {{ testResult.isPrivate ? '🔒 Privado' : '🌐 Público' }}
                  </span>
                </div>

                <div class="wizard-footer-nav">
                  <button
                    type="button"
                    class="secondary-ghost-btn"
                    @click="currentStep = 1"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    class="primary-blue-btn"
                    :disabled="!repositoryInput.trim()"
                    data-testid="github-step2-next-btn"
                    @click="currentStep = 3"
                  >
                    <span>Próximo: Estratégia OKF</span>
                    <ArrowRight :size="14" />
                  </button>
                </div>
              </div>

              <!-- Step 3: Strategy & Activate -->
              <div v-else class="wizard-step-body" data-testid="wizard-step-3">
                <div class="strategy-cards">
                  <label
                    v-for="option in strategyOptions"
                    :key="option.value"
                    class="strategy-option"
                    :class="{ 'is-selected': strategy === option.value }"
                    :data-testid="`strategy-${option.value}`"
                  >
                    <input
                      v-model="strategy"
                      type="radio"
                      :value="option.value"
                      class="strategy-radio"
                    />
                    <div>
                      <div class="strategy-title">{{ option.title }}</div>
                      <div class="strategy-desc">{{ option.desc }}</div>
                    </div>
                  </label>
                </div>

                <div class="autosync-toggle-row">
                  <label class="autosync-checkbox-label">
                    <input
                      v-model="autoSyncEnabled"
                      type="checkbox"
                      data-testid="github-autosync-checkbox"
                    />
                    <span>Auto-Sync inteligente (Delta Sync com debounce)</span>
                  </label>

                  <select
                    v-if="autoSyncEnabled"
                    v-model.number="debounceSeconds"
                    class="debounce-select"
                    aria-label="Intervalo de debounce"
                  >
                    <option :value="30">30 segundos</option>
                    <option :value="120">2 minutos</option>
                    <option :value="300">5 minutos</option>
                  </select>
                </div>

                <div
                  v-if="configureError"
                  class="wizard-feedback is-error"
                  data-testid="github-configure-error"
                >
                  <AlertCircle :size="14" />
                  <span>{{ configureError }}</span>
                </div>

                <div class="wizard-footer-nav">
                  <button
                    type="button"
                    class="secondary-ghost-btn"
                    :disabled="busy"
                    @click="currentStep = 2"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    class="primary-blue-btn"
                    :disabled="busy"
                    data-testid="github-connect-btn"
                    @click="handleConnectAndSync"
                  >
                    <CheckCircle2 :size="14" />
                    <span>
                      {{ busy ? 'Conectando...' : 'Conectar & Sincronizar' }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: YOUR SYNCS & AUDIT LOG -->
        <div v-else class="provider-tab-content" data-testid="github-syncs-audit-panel">
          <div v-if="status.configured" class="audit-summary-card">
            <div class="audit-summary-row">
              <div>
                <strong>{{ status.repository }}</strong>
                <span class="audit-sub">
                  Branch <code>{{ status.branch }}</code> &bull; Contrato Google OKF v0.2
                  (<code>index.md</code>, <code>log.md</code>, <code>./assets</code>)
                </span>
              </div>
              <button
                type="button"
                class="primary-blue-btn"
                :disabled="busy"
                @click="$emit('sync-now')"
              >
                <RefreshCw :size="14" :class="{ 'spin-icon': busy }" />
                <span>{{ busy ? 'Sincronizando...' : 'Sincronizar Agora' }}</span>
              </button>
            </div>

            <div v-if="status.history.length > 0" class="sync-history-box">
              <div class="history-title">Registro de Sincronizações</div>
              <ul class="history-list">
                <li v-for="entry in status.history" :key="entry.id" class="history-row">
                  <span class="history-dir">{{ formatDirection(entry.direction) }}</span>
                  <span class="history-summary">{{ entry.summary }}</span>
                  <span class="history-time">{{ formatTimestamp(entry.timestamp) }}</span>
                </li>
              </ul>
            </div>
            <p v-else class="audit-empty">Nenhuma execução registrada no histórico ainda.</p>
          </div>

          <div v-else class="audit-empty-state">
            <p>Nenhuma sincronização GitHub ativa no momento.</p>
            <button
              type="button"
              class="primary-blue-btn"
              @click="activePanelTab = 'overview'"
            >
              Configurar repositório GitHub
            </button>
          </div>
        </div>
      </template>

      <!-- MODES 2 & 3: MODULAR FUTURE MODES (Dev Sync & AI/MCP Connector) -->
      <template v-else>
        <div class="future-mode-panel" :data-testid="`github-future-mode-${activeMode.id}`">
          <header class="mode-detail-header">
            <div>
              <div class="mode-title-line">
                <h5 class="mode-detail-title">{{ activeMode.label }}</h5>
                <span class="tile-soon-pill">Em breve &bull; Gratuito</span>
              </div>
              <p class="mode-detail-sub">
                Criado pelo Mind Hub &bull; Sem upgrade pago
              </p>
            </div>
          </header>

          <div class="okf-visual-banner" aria-hidden="true">
            <div class="okf-node-chip">
              <GitPullRequest v-if="activeMode.id === 'dev_sync'" :size="14" />
              <Sparkles v-else :size="14" />
              <span>Repositórios de Código</span>
            </div>
            <div class="okf-sync-arrow">
              <span class="arrow-dots" />
              <span class="arrow-badge">Token Dedicado</span>
              <span class="arrow-dots" />
            </div>
            <div class="okf-node-chip is-mind">
              <FileText :size="14" />
              <span>Mind Hub {{ activeMode.id === 'dev_sync' ? 'Databases' : 'Copiloto IA' }}</span>
            </div>
          </div>

          <p class="future-mode-desc">{{ activeMode.description }}</p>

          <div class="future-usecases-box">
            <div class="usecases-heading">Casos de uso</div>
            <ul class="usecases-list">
              <li v-for="useCase in activeMode.useCases" :key="useCase">
                <Check :size="14" class="usecase-check" />
                <span>{{ useCase }}</span>
              </li>
            </ul>
          </div>

          <div class="token-separation-card">
            <KeyRound :size="15" class="token-sep-icon" />
            <div>
              <strong>Separação de Chaves (Segurança Modular)</strong>
              <p>
                Este modo utilizará um token separado do Token do Vault, com escopo específico:
                <code>{{ activeMode.tokenScopeSummary }}</code>.
              </p>
            </div>
          </div>

          <div class="future-mode-footer">
            <button
              type="button"
              class="secondary-ghost-btn"
              @click="activeModeId = 'vault_okf'"
            >
              Ir para Sincronização do Vault (OKF)
            </button>
            <button type="button" class="primary-blue-btn" disabled>
              Disponível em breve
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  GitPullRequest,
  KeyRound,
  Lock,
  PlugZap,
  RefreshCw,
  Sparkles,
  Unlink,
} from 'lucide-vue-next';
import type {
  GitHubSyncConfigInput,
  GitHubSyncStatus,
  GitHubSyncStrategy,
  GitHubTestConnectionInput,
  GitHubTestConnectionResult,
} from '@mind-hub/shared';
import { GITHUB_CONNECTION_MODES, type ConnectionModeDescriptor } from './connections-registry.js';

const props = withDefaults(
  defineProps<{
    status?: GitHubSyncStatus;
    busy?: boolean;
    testing?: boolean;
    testResult?: GitHubTestConnectionResult | null;
    configureError?: string;
  }>(),
  {
    status: () => ({
      state: 'disconnected',
      configured: false,
      repository: null,
      branch: 'main',
      autoSyncEnabled: true,
      debounceSeconds: 120,
      pendingChangesCount: 0,
      lastSyncAt: null,
      lastCommitSha: null,
      lastError: null,
      history: [],
    }),
    busy: false,
    testing: false,
    testResult: null,
    configureError: '',
  },
);

const emit = defineEmits<{
  'test-connection': [payload: GitHubTestConnectionInput];
  configure: [payload: GitHubSyncConfigInput];
  'sync-now': [];
  disconnect: [];
}>();

const activeModeId = ref<ConnectionModeDescriptor['id']>('vault_okf');
const activePanelTab = ref<'overview' | 'syncs'>('overview');
const tokenGuideMode = ref<'fine-grained' | 'classic'>('fine-grained');
const isReconfiguring = ref(false);

const currentStep = ref<1 | 2 | 3>(1);
const tokenInput = ref('');
const showToken = ref(false);
const repositoryInput = ref('');
const branchInput = ref('main');
const strategy = ref<GitHubSyncStrategy>('push_initial');
const autoSyncEnabled = ref(true);
const debounceSeconds = ref(120);

const activeMode = computed<ConnectionModeDescriptor>(() => {
  return (
    GITHUB_CONNECTION_MODES.find((m) => m.id === activeModeId.value) ??
    GITHUB_CONNECTION_MODES[0]!
  );
});

const strategyOptions: Array<{
  value: GitHubSyncStrategy;
  title: string;
  desc: string;
}> = [
  {
    value: 'push_initial',
    title: 'Enviar notas locais para o GitHub',
    desc: 'Exporta seu banco no formato Google OKF (index.md, log.md e ./assets) para o repositório.',
  },
  {
    value: 'pull_initial',
    title: 'Baixar notas do repositório GitHub',
    desc: 'Importa a estrutura Markdown existente do repositório para o Mind Hub.',
  },
  {
    value: 'merge',
    title: 'Mesclar bidirecionalmente',
    desc: 'Combina alterações locais e remotas preservando cópias seguras em caso de divergência.',
  },
];

const repoWebUrl = computed(() => {
  const repo = props.status.repository?.trim();
  if (!repo || repo.startsWith('/') || repo.startsWith('file://')) return null;
  return `https://github.com/${repo}`;
});

const statusBadgeLabel = computed(() => {
  switch (props.status.state) {
    case 'connected':
      return 'Conectado';
    case 'syncing':
      return 'Sincronizando';
    case 'conflict':
      return 'Conflito';
    case 'error':
      return 'Erro';
    default:
      return 'Não conectado';
  }
});

const statusBadgeClass = computed(() => {
  switch (props.status.state) {
    case 'connected':
      return 'mind-pill-green';
    case 'syncing':
      return 'mind-pill-blue';
    case 'conflict':
      return 'mind-pill-yellow';
    case 'error':
      return 'mind-pill-pink';
    default:
      return 'pill-neutral';
  }
});

function startReconfigure(): void {
  repositoryInput.value = props.status.repository ?? '';
  branchInput.value = props.status.branch || 'main';
  autoSyncEnabled.value = props.status.autoSyncEnabled;
  debounceSeconds.value = props.status.debounceSeconds || 120;
  currentStep.value = 1;
  isReconfiguring.value = true;
}

function stepLabel(stepNum: 1 | 2 | 3): string {
  if (stepNum === 1) return 'Token PAT';
  if (stepNum === 2) return 'Repositório';
  return 'Estratégia OKF';
}

function goToStep(stepNum: 1 | 2 | 3): void {
  if (stepNum === 2 && !tokenInput.value.trim()) return;
  if (stepNum === 3 && (!tokenInput.value.trim() || !repositoryInput.value.trim())) return;
  currentStep.value = stepNum;
}

function handleTestConnection(): void {
  emit('test-connection', {
    repository: repositoryInput.value.trim(),
    branch: branchInput.value.trim() || 'main',
    token: tokenInput.value.trim(),
  });
}

function handleConnectAndSync(): void {
  isReconfiguring.value = false;
  emit('configure', {
    repository: repositoryInput.value.trim(),
    branch: branchInput.value.trim() || 'main',
    token: tokenInput.value.trim(),
    strategy: strategy.value,
    autoSyncEnabled: autoSyncEnabled.value,
    debounceSeconds: debounceSeconds.value,
  });
}

function handleDisconnect(): void {
  emit('disconnect');
  tokenInput.value = '';
  isReconfiguring.value = false;
  currentStep.value = 1;
}

function formatDirection(direction: string): string {
  if (direction === 'push') return '↑ Push';
  if (direction === 'pull') return '↓ Pull';
  return '⇅ Sync';
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
@import './settings-shared.css';

.github-provider-shell {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.github-provider-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: var(--mind-bg-sidebar, #f8f9fa);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
}

.provider-brand-block {
  display: flex;
  align-items: center;
  gap: 10px;
}

.github-octocat-wrap {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: #ffffff;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-primary, #111827);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.github-provider-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.github-provider-state {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
}

.mind-status-badge {
  align-self: flex-start;
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

.provider-capability-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--mind-border-subtle, #e9ecef);
  padding-top: 10px;
}

.capability-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.capability-item:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.capability-item.is-active {
  background: #ffffff;
  border-color: var(--mind-border-subtle, #e9ecef);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.capability-icon {
  margin-top: 2px;
  color: var(--mind-accent-primary, #1971c2);
  flex-shrink: 0;
}

.capability-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.capability-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.capability-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.capability-desc {
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
  line-height: 1.35;
}

.github-provider-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.mode-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mode-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-detail-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.mode-detail-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

.provider-tabs-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
}

.provider-tab-btn {
  padding: 8px 2px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--mind-text-muted, #868e96);
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.provider-tab-btn:hover {
  color: var(--mind-text-primary, #111827);
}

.provider-tab-btn.is-active {
  color: var(--mind-text-primary, #111827);
  font-weight: 600;
  border-bottom-color: var(--mind-accent-primary, #1971c2);
}

.provider-tab-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.okf-visual-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 9px;
  background: #f8f9fa;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
}

.okf-node-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 7px;
  background: #ffffff;
  border: 1px solid var(--mind-border-control, #dee2e6);
  font-size: 12px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
  white-space: nowrap;
}

.okf-node-chip.is-mind {
  border-color: #a5d8ff;
  background: #e7f5ff;
  color: #1864ab;
}

.okf-sync-arrow {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.arrow-dots {
  flex: 1;
  border-top: 1px dashed #adb5bd;
}

.arrow-badge {
  font-size: 11px;
  font-weight: 600;
  color: #495057;
  background: #ffffff;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.wizard-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wizard-container {
  padding: 16px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
}

.reconfigure-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fff9db;
  border: 1px solid #ffec99;
  font-size: 12.5px;
  color: #e67700;
}

.wizard-steps-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.wizard-step-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 7px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-sidebar, #f8f9fa);
  color: var(--mind-text-muted, #868e96);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.wizard-step-chip.is-current {
  border-color: var(--mind-accent-primary, #1971c2);
  background: #e7f5ff;
  color: #1864ab;
  font-weight: 600;
}

.wizard-step-chip.is-done {
  background: #ebfbee;
  border-color: #b2f2bb;
  color: #2b8a3e;
}

.step-index {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.wizard-step-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-mode-tabs {
  display: inline-flex;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 7px;
  padding: 2px;
  gap: 2px;
  align-self: flex-start;
}

.token-mode-tab {
  border: none;
  background: transparent;
  color: var(--mind-text-secondary, #37352f);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.token-mode-tab.is-active {
  background: #ffffff;
  color: var(--mind-text-primary, #111827);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.plug-play-helper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--mind-bg-sidebar, #f8f9fa);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
}

.helper-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.helper-copy strong {
  display: block;
  font-size: 12.5px;
  color: #212529;
  margin-bottom: 2px;
}

.helper-copy p {
  margin: 0;
  font-size: 12px;
  color: #495057;
}

.token-guide-steps {
  margin: 2px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: var(--mind-text-secondary, #37352f);
  line-height: 1.45;
}

.external-token-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #ffffff;
  color: #1971c2;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.external-token-link:hover {
  background: #f1f3f5;
}

.scope-separation-hint {
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
}

.repo-helper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.repo-helper-hint {
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

.wizard-field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #343a40;
  margin-bottom: 5px;
}

.token-input-wrap {
  display: flex;
  gap: 8px;
}

.wizard-text-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #ffffff;
  color: #212529;
  font-size: 13px;
}

.wizard-text-input:focus {
  outline: none;
  border-color: #1971c2;
}

.toggle-visibility-btn {
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  color: #495057;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.repo-fields-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}

.test-connection-row {
  display: flex;
  align-items: center;
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
}

.primary-blue-btn:hover:not(:disabled) {
  background: var(--mind-accent-hover, #1864ab);
}

.primary-blue-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary-ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #ffffff;
  color: #343a40;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.secondary-ghost-btn:hover:not(:disabled) {
  background: #f8f9fa;
}

.secondary-ghost-btn.danger:hover:not(:disabled) {
  background: #fff5f5;
  border-color: #ffc9c9;
  color: #c92a2a;
}

.secondary-ghost-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wizard-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.feedback-text {
  flex: 1;
}

.wizard-feedback.is-success {
  background: #ebfbee;
  border: 1px solid #b2f2bb;
  color: #2b8a3e;
}

.wizard-feedback.is-error {
  background: #fff5f5;
  border: 1px solid #ffc9c9;
  color: #c92a2a;
}

.strategy-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  background: #f8f9fa;
  cursor: pointer;
}

.strategy-option.is-selected {
  border-color: #1971c2;
  background: #e7f5ff;
}

.strategy-radio {
  margin-top: 3px;
}

.strategy-title {
  font-size: 13px;
  font-weight: 600;
  color: #212529;
}

.strategy-desc {
  font-size: 12px;
  color: #495057;
  margin-top: 2px;
}

.autosync-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
}

.autosync-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #343a40;
  cursor: pointer;
}

.debounce-select {
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #ffffff;
  font-size: 12px;
  color: #343a40;
}

.wizard-footer-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #f1f3f5;
}

.github-connected-panel,
.audit-summary-card,
.future-mode-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  background: #ffffff;
}

.future-mode-desc {
  margin: 0;
  font-size: 13px;
  color: var(--mind-text-secondary, #37352f);
  line-height: 1.5;
}

.future-usecases-box {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--mind-bg-sidebar, #f8f9fa);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
}

.usecases-heading {
  font-size: 12px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
  margin-bottom: 8px;
}

.usecases-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.usecases-list li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--mind-text-secondary, #37352f);
}

.usecase-check {
  color: #2b8a3e;
  flex-shrink: 0;
}

.token-separation-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #e7f5ff;
  border: 1px solid #d0ebff;
  font-size: 12px;
  color: #1864ab;
}

.token-separation-card p {
  margin: 2px 0 0;
  color: var(--mind-text-secondary, #37352f);
}

.token-sep-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.future-mode-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f3f5;
}

.tile-soon-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-muted, #868e96);
}

.connected-hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.connected-repo-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.repo-lock-icon,
.repo-branch-icon {
  color: var(--mind-accent-primary, #1971c2);
}

.connected-repo-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
}

.connected-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.connected-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #868e96;
}

.meta-value {
  font-size: 13px;
  font-weight: 500;
  color: #212529;
}

.meta-code {
  font-family: monospace;
  font-size: 12px;
  color: #343a40;
}

.connected-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sync-history-box {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid #f1f3f5;
}

.history-title {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  color: #868e96;
  margin-bottom: 6px;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.history-row {
  display: grid;
  grid-template-columns: 58px 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #495057;
}

.history-dir {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: #1971c2;
}

.history-time {
  font-size: 11px;
  color: #868e96;
}

.audit-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.audit-sub {
  display: block;
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
  margin-top: 2px;
}

.audit-empty,
.audit-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 16px;
  border-radius: 8px;
  background: var(--mind-bg-sidebar, #f8f9fa);
  border: 1px dashed var(--mind-border-control, #dee2e6);
  font-size: 13px;
  color: var(--mind-text-muted, #868e96);
  text-align: center;
}

.spin-icon {
  animation: mind-spin 1s linear infinite;
}

@keyframes mind-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .github-provider-shell {
    grid-template-columns: 1fr;
  }
}
</style>
