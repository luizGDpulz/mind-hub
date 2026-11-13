<template>
  <q-layout view="lHh Lpr lFf" class="mind-light-style mind-light-theme">
    <MindTopbar
      v-model:left-drawer-open="leftDrawerOpen"
      @export-git="triggerGitExport"
      @open-properties="pageWorkspaceRef?.openProperties()"
    />

    <MindSidebar
      v-model="leftDrawerOpen"
      :is-trash-modal-open="isTrashModalOpen"
      @update:sidebar-width="sidebarWidth = $event"
      @open-search="openSearchModal"
      @toggle-workspace-menu="isWorkspaceMenuOpen = !isWorkspaceMenuOpen"
      @toggle-help-menu="isHelpVersionsMenuOpen = !isHelpVersionsMenuOpen"
      @toggle-apps-menu="isAppsMenuOpen = !isAppsMenuOpen"
    />

    <MindRightDrawer />

    <MindPageWorkspace ref="pageWorkspaceRef" />

    <!-- Global Overlays & Popovers -->
    <MindQuickCaptureModal
      v-model="store.isQuickInsightOpen"
      @submit="handleSaveQuickInsight"
    />

    <MindSettingsModal
      v-model="store.isMcpModalOpen"
      :workspace-name="'Mind de Luiz Gustavo Dias Pulz'"
      :backend-connected="store.backendConnected"
      :active-pages-count="store.activePages.length"
      :deleted-pages-count="store.deletedPages.length"
      :database-tasks-count="store.databaseRows.length"
      @sync-server-vault="handleSyncServerVault"
      @export-markdown="triggerGitExport"
      @empty-trash="store.emptyTrash"
      @close="store.isMcpModalOpen = false"
    />

    <MindSearchModal
      v-model="store.isSearchDialogOpen"
      :pages="store.pages"
      :search-results="store.searchResults"
      :search-query="store.searchQuery"
      @update:search-query="store.searchQuery = $event"
      @search="store.runSearch($event)"
      @select="
        (id) => {
          store.activeSurface = 'editor';
          store.selectPage(id);
        }
      "
    />

    <MindTrashModal
      v-model="isTrashModalOpen"
      :deleted-pages="store.deletedPages"
      @restore="store.restorePage"
      @permanent-delete="store.permanentlyDeletePage"
      @empty-trash="store.emptyTrash"
    />

    <MindWorkspaceMenu
      v-model="isWorkspaceMenuOpen"
      :workspace-name="'Mind de Luiz Gustavo Dias Pulz'"
      :user-email="'luizg.pulz@gmail.com'"
      :current-version="store.currentVersion"
      :repo-url="store.repoUrl"
      :bottom="56"
      :left="10"
      @open-settings="store.isMcpModalOpen = true"
      @open-import="store.isImportModalOpen = true"
      @open-versions="isHelpVersionsMenuOpen = true"
      @logout="store.activeSurface = 'login'"
    />

    <MindHelpVersionsMenu
      v-model="isHelpVersionsMenuOpen"
      :current-version="store.currentVersion"
      :version-history="store.versionHistory"
      :repo-url="store.repoUrl"
      :bottom="56"
      :left="14"
      @open-all-releases="store.isVersionHistoryModalOpen = true"
    />

    <MindSidebarAppsMenu
      v-model="isAppsMenuOpen"
      :trash-count="store.deletedPages.length"
      :bottom="56"
      :left="Math.max(10, sidebarWidth - 230)"
      @open-trash="isTrashModalOpen = true"
      @open-ai="
        store.isCommentsDrawerOpen = true;
        store.rightDrawerMode = 'ai';
        store.isAiDrawerOpen = true;
      "
      @open-tasks="
        store.activeSurface = 'editor';
        store.showEmbeddedDatabase = true;
      "
    />

    <MindVersionHistoryModal
      v-model="store.isVersionHistoryModalOpen"
      :current-version="store.currentVersion"
      :version-history="store.versionHistory"
      :repo-url="store.repoUrl"
    />

    <MindBulkImportModal
      v-model="store.isImportModalOpen"
      :last-report="store.lastBulkImportReport"
      @import-sample="handleImportSampleSecondBrain"
      @sync-server="handleSyncServerVault"
      @upload-files="handleBulkUploadFiles"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Dark } from 'quasar';
import type { RawMarkdownFileEntry } from '@mind-hub/shared';
import { useMindStore } from './stores/mind-store.js';
import MindTopbar from './components/shell/MindTopbar.vue';
import MindSidebar from './components/shell/MindSidebar.vue';
import MindRightDrawer from './components/shell/MindRightDrawer.vue';
import MindPageWorkspace from './components/shell/MindPageWorkspace.vue';
import MindSearchModal from './components/ui/MindSearchModal.vue';
import MindTrashModal from './components/ui/MindTrashModal.vue';
import MindWorkspaceMenu from './components/ui/MindWorkspaceMenu.vue';
import MindSidebarAppsMenu from './components/ui/MindSidebarAppsMenu.vue';
import MindHelpVersionsMenu from './components/ui/MindHelpVersionsMenu.vue';
import MindVersionHistoryModal from './components/ui/MindVersionHistoryModal.vue';
import MindSettingsModal from './components/ui/MindSettingsModal.vue';
import MindQuickCaptureModal from './components/ui/MindQuickCaptureModal.vue';
import MindBulkImportModal from './components/ui/MindBulkImportModal.vue';

const store = useMindStore();
const leftDrawerOpen = ref(true);
const sidebarWidth = ref(280);
const isTrashModalOpen = ref(false);
const isWorkspaceMenuOpen = ref(false);
const isAppsMenuOpen = ref(false);
const isHelpVersionsMenuOpen = ref(false);
const pageWorkspaceRef = ref<InstanceType<typeof MindPageWorkspace> | null>(null);

onMounted(() => {
  Dark.set(false);
  void store.initializeStore();
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

function handleGlobalKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearchModal();
  } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
    e.preventDefault();
    leftDrawerOpen.value = !leftDrawerOpen.value;
  }
}

function handleSaveQuickInsight(text?: string, tags?: string[]): void {
  const content = typeof text === 'string' ? text.trim() : '';
  if (!content) return;
  void store.submitQuickInsight(content, tags || ['quick-note']).then((inbox) => {
    store.isQuickInsightOpen = false;
    store.selectPage(inbox.id);
  });
}

function openSearchModal(): void {
  store.isSearchDialogOpen = true;
  store.runSearch();
}

function triggerGitExport(): void {
  store.exportMarkdownVault();
  store.isMcpModalOpen = true;
}

function handleImportSampleSecondBrain(): void {
  void store.importMarkdownBulk([], { useSampleSecondBrain: true });
}

function handleSyncServerVault(): void {
  void store.syncServerSecondBrainDirectory('/home/ubuntu/mind');
}

function handleBulkUploadFiles(entries: RawMarkdownFileEntry[]): void {
  void store.importMarkdownBulk(entries, { conflictStrategy: 'upsert' });
}
</script>
