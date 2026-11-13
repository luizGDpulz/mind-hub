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
          :backend-connected="backendConnected"
          @sync-server-vault="$emit('sync-server-vault')"
          @export-markdown="$emit('export-markdown')"
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
import { ref } from 'vue';
import {
  HardDrive,
  Keyboard,
  Palette,
  RefreshCw,
  Settings,
} from 'lucide-vue-next';
import MindConfirmDialog from './MindConfirmDialog.vue';
import MindModal from './MindModal.vue';
import SettingsAppearanceTab from './settings/SettingsAppearanceTab.vue';
import SettingsGeneralTab from './settings/SettingsGeneralTab.vue';
import SettingsShortcutsTab from './settings/SettingsShortcutsTab.vue';
import SettingsStorageTab from './settings/SettingsStorageTab.vue';
import SettingsSyncTab from './settings/SettingsSyncTab.vue';

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
const isConfirmEmptyOpen = ref(false);

const tabs = [
  { id: 'general', label: 'Geral', icon: Settings },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'sync', label: 'Vault & Sync', icon: RefreshCw },
  { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
  { id: 'storage', label: 'Armazenamento', icon: HardDrive },
] as const;
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
  color: var(--mind-text-primary, #212529);
}

.settings-nav-tab.is-active {
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-primary, #212529);
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
  color: var(--mind-text-primary, #212529);
}
</style>
