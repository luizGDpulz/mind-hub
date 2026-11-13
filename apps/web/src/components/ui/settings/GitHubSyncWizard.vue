<template>
  <div class="github-sync-card" data-testid="github-sync-wizard">
    <div class="github-card-header">
      <div class="github-title-group">
        <GitBranch :size="17" :stroke-width="1.8" class="github-branch-icon" />
        <div>
          <h5 class="github-card-title">Sincronização GitHub (Google OKF)</h5>
          <p class="github-card-subtitle">
            Backup versionado em Markdown aberto com Delta Sync por hash SHA-256.
          </p>
        </div>
      </div>

      <span class="mind-status-badge" :class="statusBadgeClass" data-testid="github-status-badge">
        {{ statusBadgeLabel }}
      </span>
    </div>

    <!-- CONNECTED STATE -->
    <div v-if="status.configured" class="github-connected-panel" data-testid="github-connected-panel">
      <div class="connected-meta-grid">
        <div class="connected-meta-item">
          <span class="meta-label">Repositório</span>
          <span class="meta-value" data-testid="github-connected-repo">
            {{ status.repository }}
          </span>
        </div>
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
    <div v-else class="wizard-container" data-testid="github-wizard-stepper">
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

      <!-- Step 1: Token -->
      <div v-if="currentStep === 1" class="wizard-step-body" data-testid="wizard-step-1">
        <div class="plug-play-helper">
          <div class="helper-copy">
            <strong>Passo 1: Gere seu Token de Acesso (PAT)</strong>
            <p>
              Crie um token com permissão de escrita no repositório (<code>repo</code> ou Fine-grained
              <code>Contents: Read &amp; write</code>).
            </p>
          </div>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=Mind%20Hub%20Sync"
            target="_blank"
            rel="noopener noreferrer"
            class="external-token-link"
            data-testid="github-create-token-link"
          >
            <span>Gerar no GitHub</span>
            <ExternalLink :size="13" />
          </a>
        </div>

        <label class="wizard-field-label" for="github-pat-input">Token Pessoal (PAT)</label>
        <div class="token-input-wrap">
          <input
            id="github-pat-input"
            v-model="tokenInput"
            :type="showToken ? 'text' : 'password'"
            class="wizard-text-input"
            placeholder="ghp_... ou github_pat_..."
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

        <div class="wizard-footer-nav">
          <span />
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
        <div class="repo-fields-grid">
          <div>
            <label class="wizard-field-label" for="github-repo-input">Repositório</label>
            <input
              id="github-repo-input"
              v-model="repositoryInput"
              type="text"
              class="wizard-text-input"
              placeholder="usuario/meu-second-brain"
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
          <span>{{ testResult.message }}</span>
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
            <span>Auto-Sync inteligente (Delta Sync com debounce de 2 min)</span>
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

        <div v-if="configureError" class="wizard-feedback is-error" data-testid="github-configure-error">
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  PlugZap,
  RefreshCw,
  Unlink,
} from 'lucide-vue-next';
import type {
  GitHubSyncConfigInput,
  GitHubSyncStatus,
  GitHubSyncStrategy,
  GitHubTestConnectionInput,
  GitHubTestConnectionResult,
} from '@mind-hub/shared';

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

const currentStep = ref<1 | 2 | 3>(1);
const tokenInput = ref('');
const showToken = ref(false);
const repositoryInput = ref('');
const branchInput = ref('main');
const strategy = ref<GitHubSyncStrategy>('push_initial');
const autoSyncEnabled = ref(true);
const debounceSeconds = ref(120);

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

.github-sync-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
}

.github-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.github-title-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.github-branch-icon {
  margin-top: 2px;
  color: var(--mind-accent-primary, #1971c2);
  flex-shrink: 0;
}

.github-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--mind-text-primary, #212529);
}

.github-card-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

.mind-status-badge {
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

.wizard-steps-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
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

.plug-play-helper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--mind-bg-sidebar, #f8f9fa);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
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
  height: 34px;
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

.secondary-ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
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
  padding-top: 6px;
  border-top: 1px solid #f1f3f5;
}

.connected-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 10px 12px;
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
  margin-top: 10px;
}

.sync-history-box {
  margin-top: 12px;
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
</style>
