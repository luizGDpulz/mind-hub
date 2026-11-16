<template>
  <MindModal
    :model-value="modelValue"
    max-width="1120px"
    height="min(760px, calc(100vh - 48px))"
    :flush="true"
    :hide-header="true"
    data-testid="mind-settings-modal"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <div class="settings-layout">
      <!-- Fixed Left Sidebar (Notion-style Settings Navigation) -->
      <aside class="settings-nav-sidebar" aria-label="Abas de configuração">
        <div class="settings-workspace-header">
          <div class="workspace-avatar" aria-hidden="true">
            {{ workspaceInitials }}
          </div>
          <div class="workspace-meta">
            <div class="workspace-name" :title="workspaceNameBuffer">
              {{ workspaceNameBuffer }}
            </div>
            <div class="workspace-subtitle">Configurações</div>
          </div>
        </div>

        <nav class="settings-nav-groups">
          <div class="settings-nav-group">
            <div class="settings-nav-group-label">Espaço de trabalho</div>
            <button
              v-for="tab in workspaceTabs"
              :key="tab.id"
              type="button"
              class="settings-nav-tab"
              :class="{ 'is-active': activeTab === tab.id }"
              :data-testid="`settings-tab-${tab.id}`"
              @click="selectTab(tab.id)"
            >
              <component :is="tab.icon" :size="16" class="tab-icon" />
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <div class="settings-nav-group">
            <div class="settings-nav-group-label">Conexões &amp; Sincronização</div>
            <button
              type="button"
              class="settings-nav-tab"
              :class="{ 'is-active': activeTab === 'sync' }"
              data-testid="settings-tab-sync"
              @click="selectSyncView('overview')"
            >
              <RefreshCw :size="16" class="tab-icon" />
              <span>Sincronização</span>
            </button>
          </div>

          <div class="settings-nav-group">
            <div class="settings-nav-group-label">Sistema</div>
            <button
              type="button"
              class="settings-nav-tab"
              :class="{ 'is-active': activeTab === 'storage' }"
              data-testid="settings-tab-storage"
              @click="selectTab('storage')"
            >
              <HardDrive :size="16" class="tab-icon" />
              <span>Armazenamento</span>
            </button>
          </div>
        </nav>
      </aside>

      <!-- Main Stage with Single Internal Scroll Container -->
      <div class="settings-main-stage">
        <button
          type="button"
          class="settings-stage-close-btn"
          aria-label="Fechar configurações"
          title="Fechar (Esc)"
          data-testid="settings-close-btn"
          @click="$emit('close')"
        >
          <X :size="16" />
        </button>

        <div class="settings-content-panel">
          <SettingsGeneralTab
            v-if="activeTab === 'general'"
            v-model:workspace-name="workspaceNameBuffer"
            v-model:language="selectedLanguage"
          />

          <SettingsAppearanceTab
            v-else-if="activeTab === 'appearance'"
            v-model:density-mode="densityMode"
            v-model:content-width-mode="contentWidthMode"
          />

          <SettingsSyncTab
            v-else-if="activeTab === 'sync'"
            v-model:sub-view="syncSubView"
            :backend-connected="backendConnected"
            :git-hub-status="gitHubStatus"
            :git-hub-busy="gitHubBusy"
            :git-hub-testing="gitHubTesting"
            :git-hub-test-result="gitHubTestResult"
            :git-hub-configure-error="gitHubConfigureError"
            @sync-server-vault="$emit('sync-server-vault')"
            @export-markdown="$emit('export-markdown')"
            @github-test-connection="$emit('github-test-connection', $event)"
            @github-configure="$emit('github-configure', $event)"
            @github-sync-now="$emit('github-sync-now')"
            @github-disconnect="$emit('github-disconnect')"
          />

          <SettingsShortcutsTab v-else-if="activeTab === 'shortcuts'" />

          <SettingsStorageTab
            v-else-if="activeTab === 'storage'"
            :active-pages-count="activePagesCount"
            :deleted-pages-count="deletedPagesCount"
            :database-tasks-count="databaseTasksCount"
            @request-empty-trash="isConfirmEmptyOpen = true"
          />
        </div>
      </div>
    </div>

    <MindConfirmDialog
      v-model="isConfirmEmptyOpen"
      title="Esvaziar Lixeira Permanentemente?"
      :message="`Tem certeza que deseja apagar todos os ${deletedPagesCount} itens da lixeira? Esta operação não pode ser revertida.`"
      confirm-label="Esvaziar Definitivamente"
      cancel-label="Cancelar"
      :danger="true"
      @confirm="$emit('empty-trash')"
    />
  </MindModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  HardDrive,
  Keyboard,
  Palette,
  RefreshCw,
  Settings,
  X,
} from 'lucide-vue-next';
import type {
  GitHubSyncConfigInput,
  GitHubSyncStatus,
  GitHubTestConnectionInput,
  GitHubTestConnectionResult,
} from '@mind-hub/shared';
import MindConfirmDialog from './MindConfirmDialog.vue';
import MindModal from './MindModal.vue';
import SettingsAppearanceTab from './settings/SettingsAppearanceTab.vue';
import SettingsGeneralTab from './settings/SettingsGeneralTab.vue';
import SettingsShortcutsTab from './settings/SettingsShortcutsTab.vue';
import SettingsStorageTab from './settings/SettingsStorageTab.vue';
import SettingsSyncTab from './settings/SettingsSyncTab.vue';

type SettingsTabId = 'general' | 'appearance' | 'sync' | 'shortcuts' | 'storage';
type SyncSubView = 'overview' | 'github';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    initialTab?: SettingsTabId;
    workspaceName?: string;
    backendConnected?: boolean;
    activePagesCount?: number;
    deletedPagesCount?: number;
    databaseTasksCount?: number;
    gitHubStatus?: GitHubSyncStatus;
    gitHubBusy?: boolean;
    gitHubTesting?: boolean;
    gitHubTestResult?: GitHubTestConnectionResult | null;
    gitHubConfigureError?: string;
  }>(),
  {
    initialTab: 'general',
    workspaceName: 'Mind Hub Workspace',
    backendConnected: true,
    activePagesCount: 0,
    deletedPagesCount: 0,
    databaseTasksCount: 0,
    gitHubBusy: false,
    gitHubTesting: false,
    gitHubTestResult: null,
    gitHubConfigureError: '',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:initialTab', value: SettingsTabId): void;
  (e: 'sync-server-vault'): void;
  (e: 'export-markdown'): void;
  (e: 'empty-trash'): void;
  (e: 'github-test-connection', payload: GitHubTestConnectionInput): void;
  (e: 'github-configure', payload: GitHubSyncConfigInput): void;
  (e: 'github-sync-now'): void;
  (e: 'github-disconnect'): void;
  (e: 'close'): void;
}>();

const activeTab = ref<SettingsTabId>(props.initialTab);
const syncSubView = ref<SyncSubView>('overview');

watch(
  () => props.initialTab,
  (nextTab) => {
    activeTab.value = nextTab;
  },
);
watch(activeTab, (tab) => {
  emit('update:initialTab', tab);
});

const workspaceNameBuffer = ref(props.workspaceName);
const selectedLanguage = ref('pt-BR');
const densityMode = ref<'comfortable' | 'compact'>('comfortable');
const contentWidthMode = ref<'centered' | 'full'>('centered');
const isConfirmEmptyOpen = ref(false);

const workspaceInitials = computed(() => {
  const words = workspaceNameBuffer.value.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const second = words[1];
  if (!first) return 'MH';
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
});

const workspaceTabs = [
  { id: 'general', label: 'Geral', icon: Settings },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
] as const;

function selectTab(tab: SettingsTabId): void {
  activeTab.value = tab;
}

function selectSyncView(view: SyncSubView): void {
  activeTab.value = 'sync';
  syncSubView.value = view;
}
</script>

<style scoped>
.settings-layout {
  display: flex;
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--mind-bg-canvas, #ffffff);
}

.settings-nav-sidebar {
  width: 240px;
  height: 100%;
  flex-shrink: 0;
  background: var(--mind-bg-sidebar, #f8f9fa);
  border-right: 1px solid var(--mind-border-subtle, #e9ecef);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.settings-workspace-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 8px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
}

.workspace-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-secondary, #37352f);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.workspace-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.workspace-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mind-text-primary, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workspace-subtitle {
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
}

.settings-nav-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--mind-text-muted, #868e96);
  padding: 4px 10px 4px;
  letter-spacing: 0.01em;
}

.settings-nav-tab {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--mind-text-secondary, #37352f);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.settings-nav-tab:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #111827);
}

.settings-nav-tab.is-active {
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-primary, #111827);
  font-weight: 600;
}

.tab-icon {
  color: var(--mind-text-muted, #868e96);
  flex-shrink: 0;
}

.settings-nav-tab.is-active .tab-icon {
  color: var(--mind-accent-primary, #1971c2);
}

.settings-main-stage {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: var(--mind-bg-canvas, #ffffff);
  display: flex;
  flex-direction: column;
}

.settings-stage-close-btn {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 2;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.settings-stage-close-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  border-color: var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-primary, #111827);
}

.settings-content-panel {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 36px 48px;
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }

  .settings-nav-sidebar {
    width: 100%;
    height: auto;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  }

  .settings-content-panel {
    padding: 24px 20px;
  }
}
</style>
