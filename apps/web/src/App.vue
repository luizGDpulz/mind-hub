<template>
  <q-layout view="lHh Lpr lFf" class="mind-light-style mind-light-theme">
    <MindTopbar
      v-model:left-drawer-open="leftDrawerOpen"
      @export-git="triggerGitExport"
      @open-properties="openActivePageProperties"
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

    <!-- Right Comments & AI Drawer (03-app-shell-editor-comments.jpg: 300px, #ffffff) -->
    <q-drawer
      v-model="store.isCommentsDrawerOpen"
      side="right"
      bordered
      :width="300"
      class="mind-comments-drawer q-pa-md column no-wrap"
    >
      <div class="drawer-header-row">
        <div class="drawer-tabs">
          <button
            type="button"
            class="drawer-tab-title"
            :class="{ 'is-active': store.rightDrawerMode === 'comments' }"
            @click="store.rightDrawerMode = 'comments'"
          >
            Comments
          </button>
          <button
            type="button"
            class="drawer-tab-title"
            :class="{ 'is-active': store.rightDrawerMode === 'ai' }"
            @click="store.rightDrawerMode = 'ai'"
          >
            AI Assistant
          </button>
        </div>
        <button
          type="button"
          class="sidebar-mini-btn"
          aria-label="Close right drawer"
          @click="store.isCommentsDrawerOpen = false"
        >
          ✕
        </button>
      </div>

      <!-- COMMENTS MODE (03-app-shell-editor-comments.jpg) -->
      <div v-if="store.rightDrawerMode === 'comments'" class="col scroll" data-testid="comments-drawer-list">
        <div
          v-for="thread in store.pageComments"
          :key="thread.id"
          class="comment-thread-card"
        >
          <div class="comment-author-row">
            <span class="comment-avatar">{{ thread.authorInitials }}</span>
            <div class="comment-meta">
              <div class="comment-author-name">{{ thread.authorName }}</div>
              <div class="comment-time">{{ thread.createdAtLabel }}</div>
            </div>
          </div>

          <div class="comment-quote-bar">
            {{ thread.quotedText }}
          </div>

          <div class="comment-body-text">
            {{ thread.body }}
          </div>

          <!-- Thread Replies -->
          <div
            v-for="reply in thread.replies"
            :key="reply.id"
            class="comment-reply-item"
          >
            <div class="comment-author-row">
              <span class="comment-avatar">{{ reply.authorInitials }}</span>
              <div class="comment-meta">
                <div class="comment-author-name">{{ reply.authorName }}</div>
                <div class="comment-time">{{ reply.createdAtLabel }}</div>
              </div>
            </div>
            <div class="comment-body-text">{{ reply.body }}</div>
          </div>

          <input
            v-model="replyBuffers[thread.id]"
            type="text"
            placeholder="Reply..."
            class="comment-reply-input"
            :data-testid="`reply-input-${thread.id}`"
            @keyup.enter="submitThreadReply(thread.id)"
          />
        </div>
      </div>

      <!-- AI ASSISTANT MODE -->
      <div v-else class="col column no-wrap" data-testid="ai-drawer-panel">
        <input
          v-model="store.geminiApiKey"
          type="password"
          placeholder="Google Gemini API Key (BYOK optional)"
          class="ai-key-input q-mb-xs"
        />
        <input
          v-model="store.nvidiaApiKey"
          type="password"
          placeholder="NVIDIA NIM API Key (nvapi-... optional)"
          class="ai-key-input q-mb-sm"
          data-testid="nvidia-api-key-input"
        />

        <div class="col scroll">
          <div
            v-for="msg in store.aiChatHistory"
            :key="msg.id"
            class="comment-thread-card"
          >
            <div class="comment-author-name q-mb-xs">
              {{ msg.role === 'user' ? 'You' : 'Mind Hub AI' }}
            </div>
            <div class="comment-body-text" style="white-space: pre-line">{{ msg.text }}</div>
          </div>
        </div>

        <div class="ai-input-row">
          <input
            v-model="aiPromptInput"
            type="text"
            placeholder="Ask about pages or architecture..."
            class="comment-reply-input col"
            data-testid="ai-prompt-input"
            @keyup.enter="sendAiQuestion"
          />
          <button
            type="button"
            class="ai-send-button"
            data-testid="ai-send-btn"
            @click="sendAiQuestion"
          >
            Send
          </button>
        </div>
      </div>
    </q-drawer>

    <!-- Main Center Workspace -->
    <q-page-container>
      <q-page>
        <!-- Clean Login Surface (10-auth-login-clean.png) -->
        <CleanLoginView
          v-if="store.activeSurface === 'login'"
          @authenticated="store.activeSurface = 'editor'"
          @forgot-password="store.activeSurface = 'editor'"
        />

        <!-- Main Document + Embedded Database + Open-Source Diagrams -->
        <div v-else-if="store.activePage" class="editor-container">
          <!-- MindEditor Notion-Like: Plug & Play Engine (@mind-hub/editor) -->
          <MindEditor
            ref="mindEditorRef"
            :key="store.activePage.id"
            v-model:show-properties="showPropertiesOverride"
            class="mind-hub-editor-shell"
            :model-value="store.activePage.contentJson || store.activePage.contentMarkdown"
            :frontmatter="activePageFrontmatter"
            :read-only="store.editorReadMode"
            :pages="mentionPageReferences"
            @update:json="handleEditorJsonUpdate"
            @update:frontmatter="handleFrontmatterUpdate"
            @select-page="
              (pageId) => {
                store.activeSurface = 'editor';
                store.selectPage(pageId);
              }
            "
            @create-subpage="handleAddSubpage"
            @insert-database-block="store.enableDatabaseBlockForActivePage()"
            @insert-diagram-block="(kind) => store.enableDiagramBlockForActivePage(kind)"
          >
            <template #title>
              <!-- Page Header Icon & Customization (below YAML Properties, Notion-like Issue #26) -->
              <div class="page-header-icon-container" data-testid="page-header-icon-container">
                <div
                  class="page-header-icon-box"
                  data-testid="page-header-icon"
                  title="Clique para mudar o ícone"
                  @click="!store.editorReadMode && (isIconPickerOpen = true)"
                >
                  <img
                    v-if="store.activePage.icon && isImageUrl(store.activePage.icon)"
                    :src="store.activePage.icon"
                    class="page-header-custom-img"
                    alt="Page Icon"
                  />
                  <span v-else class="page-header-emoji">{{ store.activePage.icon || '📄' }}</span>
                </div>

                <div v-if="!store.editorReadMode" class="page-header-icon-hover-actions">
                  <button
                    type="button"
                    class="page-icon-action-btn"
                    @click="isIconPickerOpen = true"
                  >
                    Mudar ícone
                  </button>
                  <button
                    v-if="store.activePage.icon"
                    type="button"
                    class="page-icon-action-btn"
                    @click="store.updatePageMeta(store.activePage.id, { icon: '' })"
                  >
                    Remover
                  </button>
                  <button
                    v-if="!isActivePagePropertiesVisible"
                    type="button"
                    class="page-icon-action-btn"
                    data-testid="page-add-properties-btn"
                    @click="openActivePageProperties"
                  >
                    + Propriedades
                  </button>
                </div>
              </div>

              <!-- Clean H1 Title (DB Page.title owns note identity) -->
              <input
                :value="store.activePage.title"
                type="text"
                class="page-title-h1"
                placeholder="Sem título"
                :readonly="store.editorReadMode"
                data-testid="page-title-input"
                aria-label="Page title"
                @input="
                  (e) =>
                    store.activePage &&
                    store.updatePageMeta(store.activePage.id, {
                      title: (e.target as HTMLInputElement).value,
                    })
                "
              />
            </template>
          </MindEditor>

          <!-- Embedded Database Block: Table & Kanban Board (only when inserted on this page) -->
          <DatabaseViewBlock
            v-if="store.showEmbeddedDatabase"
            :rows="store.databaseRows"
            @cycle-status="store.cycleDatabaseRowStatus"
            @add-row="store.addDatabaseTaskRow"
          />

          <!-- Embedded Open-Source Diagrams: Mermaid, Excalidraw & Draw.io (only when inserted on this page) -->
          <DiagramEmbedsBlock
            v-if="store.showEmbeddedDiagrams"
            :initial-kind="store.activeDiagramKind"
          />

          <!-- Notion-like Subpages Section (closes #23) -->
          <div
            v-if="activePageSubpages.length > 0"
            class="mind-subpages-section"
            data-testid="subpages-section"
          >
            <div class="subpages-section-header">
              <span class="subpages-section-title">Subpáginas ({{ activePageSubpages.length }})</span>
              <button
                type="button"
                class="subpage-add-action-btn"
                data-testid="add-subpage-btn"
                @click="handleAddSubpage"
              >
                + Adicionar subpágina
              </button>
            </div>
            <div class="subpages-grid">
              <MindSubpageLink
                v-for="sub in activePageSubpages"
                :key="sub.id"
                :page="sub"
                @navigate="store.selectPage"
              />
            </div>
          </div>
        </div>

        <!-- Empty State when there are no active pages -->
        <div v-else class="empty-workspace-state q-pa-xl flex flex-center column" style="min-height: 400px">
          <span style="font-size: 40px; margin-bottom: 12px">📄</span>
          <div style="font-size: 16px; font-weight: 600; color: var(--mind-text-primary); margin-bottom: 6px">
            Nenhuma página encontrada
          </div>
          <div style="font-size: 13px; color: var(--mind-text-muted); margin-bottom: 16px">
            Crie sua primeira página limpa para começar a escrever.
          </div>
          <button
            type="button"
            class="primary-blue-btn"
            data-testid="create-first-page-btn"
            @click="handleCreateRootPage"
          >
            + Criar página
          </button>
        </div>
      </q-page>
    </q-page-container>

    <!-- Quick Insight / Capture Modal (Issue #67) -->
    <MindQuickCaptureModal
      v-model="store.isQuickInsightOpen"
      @submit="handleSaveQuickInsight"
    />

    <!-- Space Settings Global Modal in Tabs (Issue #65, #66) -->
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

    <!-- 2-Column Split Search Modal with Instant Preview (Issue #32) -->
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

    <!-- Clean Trash Modal with Search, Restore & Purge (Issues #33, #46) -->
    <MindTrashModal
      v-model="isTrashModalOpen"
      :deleted-pages="store.deletedPages"
      @restore="store.restorePage"
      @permanent-delete="store.permanentlyDeletePage"
      @empty-trash="store.emptyTrash"
    />

    <!-- Mind Workspace Switcher Menu (Issue #46) -->
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

    <!-- Mind Help & Versions / What's New Popover (Issue #46) -->
    <MindHelpVersionsMenu
      v-model="isHelpVersionsMenuOpen"
      :current-version="store.currentVersion"
      :version-history="store.versionHistory"
      :repo-url="store.repoUrl"
      :bottom="56"
      :left="14"
      @open-all-releases="store.isVersionHistoryModalOpen = true"
    />

    <!-- Mind Sidebar Apps Menu (Issue #46) -->
    <MindSidebarAppsMenu
      v-model="isAppsMenuOpen"
      :trash-count="store.deletedPages.length"
      :bottom="56"
      :left="Math.max(10, sidebarWidth - 230)"
      @open-trash="isTrashModalOpen = true"
      @open-ai="
        store.isCommentsDrawerOpen = true;
        store.rightDrawerMode = 'ai';
      "
      @open-tasks="
        store.activeSurface = 'editor';
        store.showEmbeddedDatabase = true;
      "
    />

    <!-- Mind Version Evolution History Modal (Issue #46) -->
    <MindVersionHistoryModal
      v-model="store.isVersionHistoryModalOpen"
      :current-version="store.currentVersion"
      :version-history="store.versionHistory"
      :repo-url="store.repoUrl"
    />

    <!-- Clean Icon Picker Modal (Issue #26) -->
    <MindIconPickerModal
      v-model="isIconPickerOpen"
      @select="(icon) => store.activePage && store.updatePageMeta(store.activePage.id, { icon })"
    />



    <!-- Bulk Second Brain / Markdown Importer Modal (M8) -->
    <q-dialog v-model="store.isImportModalOpen">
      <div
        class="mind-search-modal"
        style="width: 580px; max-width: 95vw; padding: 22px"
        data-testid="bulk-import-modal"
      >
        <div class="modal-clean-title q-mb-xs">
          Import Second Brain &amp; Markdown Vault (.md Bulk)
        </div>
        <div class="comment-body-text q-mb-md">
          Ingest dozens or hundreds of Markdown files with YAML Frontmatter, nested folders, and
          <code>[[WikiLinks]]</code> directly into the database.
        </div>

        <div class="row q-gutter-sm q-mb-md">
          <button
            type="button"
            class="primary-blue-btn"
            data-testid="import-sample-vault-btn"
            @click="handleImportSampleSecondBrain"
          >
            Import Second Brain Pack (_Padrões &amp; ADRs)
          </button>
          <button
            type="button"
            class="topbar-text-btn"
            style="border: 1px solid var(--mind-border-hairline)"
            data-testid="sync-server-vault-btn"
            @click="handleSyncServerVault"
          >
            Sync Server Vault (/home/ubuntu/mind)
          </button>
        </div>

        <div class="q-mb-md">
          <label class="sidebar-section-label block q-mb-xs" for="bulk-md-file-input">
            Or select multiple .md files from your computer:
          </label>
          <input
            id="bulk-md-file-input"
            type="file"
            multiple
            accept=".md,.markdown"
            class="clean-modal-input"
            data-testid="bulk-file-input"
            @change="handleMultiFileMarkdownUpload"
          />
        </div>

        <div
          v-if="store.lastBulkImportReport"
          class="comment-thread-card q-mb-md"
          data-testid="bulk-import-report"
        >
          <div class="comment-author-name q-mb-xs">
            Last Bulk Import Summary
          </div>
          <div class="comment-body-text">
            • Notes Processed: <strong>{{ store.lastBulkImportReport.notesProcessed }}</strong><br />
            • Folder Pages Created: <strong>{{ store.lastBulkImportReport.folderPagesCreated }}</strong><br />
            • Created / Updated / Skipped:
            <strong>
              {{ store.lastBulkImportReport.createdCount }} /
              {{ store.lastBulkImportReport.updatedCount }} /
              {{ store.lastBulkImportReport.skippedCount }}
            </strong><br />
            • WikiLinks Resolved: <strong>{{ store.lastBulkImportReport.wikiLinksResolved }}</strong>
          </div>
        </div>

        <div class="modal-actions-end">
          <button
            type="button"
            class="topbar-text-btn"
            @click="store.isImportModalOpen = false"
          >
            Close
          </button>
        </div>
      </div>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { Dark } from 'quasar';
import type { MindNode, RawMarkdownFileEntry, TiptapDoc } from '@mind-hub/shared';
import { useMindStore } from './stores/mind-store.js';
import { isImageUrl } from './utils/media.js';
import { MindEditor, type EditorFrontmatter, type PageReference } from '@mind-hub/editor';
import MindTopbar from './components/shell/MindTopbar.vue';
import MindSidebar from './components/shell/MindSidebar.vue';
import DatabaseViewBlock from './components/DatabaseViewBlock.vue';
import DiagramEmbedsBlock from './components/DiagramEmbedsBlock.vue';
import CleanLoginView from './components/CleanLoginView.vue';
import MindSearchModal from './components/ui/MindSearchModal.vue';
import MindTrashModal from './components/ui/MindTrashModal.vue';
import MindSubpageLink from './components/ui/MindSubpageLink.vue';
import MindIconPickerModal from './components/ui/MindIconPickerModal.vue';
import MindWorkspaceMenu from './components/ui/MindWorkspaceMenu.vue';
import MindSidebarAppsMenu from './components/ui/MindSidebarAppsMenu.vue';
import MindHelpVersionsMenu from './components/ui/MindHelpVersionsMenu.vue';
import MindVersionHistoryModal from './components/ui/MindVersionHistoryModal.vue';
import MindSettingsModal from './components/ui/MindSettingsModal.vue';
import MindQuickCaptureModal from './components/ui/MindQuickCaptureModal.vue';

const store = useMindStore();
const leftDrawerOpen = ref(true);
const sidebarWidth = ref(280);
const isTrashModalOpen = ref(false);
const isWorkspaceMenuOpen = ref(false);
const isAppsMenuOpen = ref(false);
const isHelpVersionsMenuOpen = ref(false);
const isIconPickerOpen = ref(false);
const quickInsightText = ref('');
const aiPromptInput = ref('');
const replyBuffers = reactive<Record<string, string>>({});

const STORAGE_PAGE_PROPS_KEY = 'mind_hub_page_properties';

function loadStoredPageProperties(): Record<string, EditorFrontmatter> {
  try {
    const raw = localStorage.getItem(STORAGE_PAGE_PROPS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, EditorFrontmatter>;
    }
  } catch {
    // Ignore storage read errors in constrained environments
  }
  return {};
}

const mindEditorRef = ref<InstanceType<typeof MindEditor> | null>(null);
const showPropertiesOverride = ref(false);
const pagePropertiesById = reactive<Record<string, EditorFrontmatter>>(loadStoredPageProperties());

function persistPageProperties(): void {
  try {
    localStorage.setItem(STORAGE_PAGE_PROPS_KEY, JSON.stringify(pagePropertiesById));
  } catch {
    // Ignore storage quota errors
  }
}

watch(
  () => store.activePageId,
  () => {
    showPropertiesOverride.value = false;
  },
);

const activePageFrontmatter = computed<EditorFrontmatter>(() => {
  const current = store.activePage;
  if (!current) return {};
  const extra = pagePropertiesById[current.id] ?? {};
  const next: EditorFrontmatter = { ...extra };
  if (current.tags && current.tags.length > 0) {
    next.tags = [...current.tags];
  }
  return next;
});

const isActivePagePropertiesVisible = computed<boolean>(() => {
  if (showPropertiesOverride.value) return true;
  for (const [key, val] of Object.entries(activePageFrontmatter.value)) {
    if (key === 'title' || val === undefined) continue;
    if (key === 'tags' && Array.isArray(val) && val.length === 0) continue;
    return true;
  }
  return false;
});

function openActivePageProperties(): void {
  if (store.editorReadMode) return;
  showPropertiesOverride.value = true;
  void mindEditorRef.value?.openProperties(true);
}

function isMindNode(value: unknown): value is MindNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

function handleEditorJsonUpdate(doc: Record<string, unknown>): void {
  const safeContent: MindNode[] = Array.isArray(doc.content)
    ? doc.content.filter(isMindNode)
    : [];
  const nextDoc: TiptapDoc = {
    type: 'doc',
    content: safeContent,
  };
  void store.updateActivePageContent(nextDoc);
}

function handleFrontmatterUpdate(meta: EditorFrontmatter): void {
  const current = store.activePage;
  if (!current) return;

  const nextTags = Array.isArray(meta.tags)
    ? meta.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];

  const nextExtra: EditorFrontmatter = {};
  for (const [key, val] of Object.entries(meta)) {
    if (key === 'title' || key === 'tags' || val === undefined) continue;
    nextExtra[key] = val;
  }

  if (Object.keys(nextExtra).length > 0) {
    pagePropertiesById[current.id] = nextExtra;
  } else {
    delete pagePropertiesById[current.id];
  }
  persistPageProperties();

  const prevTagsJson = JSON.stringify(current.tags ?? []);
  const nextTagsJson = JSON.stringify(nextTags);
  if (prevTagsJson !== nextTagsJson) {
    void store.updatePageMeta(current.id, { tags: nextTags });
  }
}

const mentionPageReferences = computed<PageReference[]>(() =>
  store.activePages.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    icon: p.icon || '📄',
    summary: p.tags?.join(', '),
    updatedAt: p.updatedAt,
  })),
);

const activePageSubpages = computed(() => {
  if (!store.activePage) return [];
  return store.activePages.filter((p) => p.parentId === store.activePage?.id);
});

async function handleAddSubpage(): Promise<void> {
  if (!store.activePage) return;
  const newSub = await store.createPage({
    title: 'Sem título',
    parentId: store.activePage.id,
    contentMarkdown: '',
    tags: [],
    icon: '📄',
  });
  store.selectPage(newSub.id);
}

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

async function handleCreateRootPage(): Promise<void> {
  store.activeSurface = 'editor';
  const newPage = await store.createPage({
    title: 'Sem título',
    icon: '📄',
    parentId: null,
    contentMarkdown: '',
    tags: [],
  });
  store.selectPage(newPage.id);
}

function handleSaveQuickInsight(text?: string, tags?: string[]): void {
  const content = typeof text === 'string' ? text.trim() : quickInsightText.value.trim();
  if (!content) return;
  void store.submitQuickInsight(content, tags || ['quick-note']).then((inbox) => {
    quickInsightText.value = '';
    store.isQuickInsightOpen = false;
    store.selectPage(inbox.id);
  });
}

function openSearchModal(): void {
  store.isSearchDialogOpen = true;
  store.runSearch();
}

function submitThreadReply(threadId: string): void {
  const text = (replyBuffers[threadId] ?? '').trim();
  if (!text) return;
  store.addCommentReply(threadId, text);
  replyBuffers[threadId] = '';
}

function sendAiQuestion(): void {
  const q = aiPromptInput.value.trim();
  if (!q) return;
  aiPromptInput.value = '';
  void store.askAiAssistant(q);
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

async function handleMultiFileMarkdownUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null;
  const fileList = input?.files;
  if (!fileList || fileList.length === 0) return;

  const entries: RawMarkdownFileEntry[] = [];
  for (const file of Array.from(fileList)) {
    const content = await file.text();
    const relPath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    entries.push({
      path: relPath,
      content,
    });
  }

  await store.importMarkdownBulk(entries, { conflictStrategy: 'upsert' });
}
</script>

<style scoped>
/* Right Comments Drawer */
.drawer-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.drawer-tabs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-tab-title {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--mind-text-muted);
  cursor: pointer;
}

.drawer-tab-title.is-active {
  color: var(--mind-text-primary);
}

.comment-author-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--mind-bg-surface-subtle);
  color: var(--mind-text-primary);
  font-size: 10.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.comment-author-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mind-text-primary);
  line-height: 1.2;
}

.comment-time {
  font-size: 11px;
  color: var(--mind-text-muted);
}

.comment-body-text {
  font-size: 13px;
  line-height: 1.45;
  color: var(--mind-text-primary);
  margin: 6px 0;
}

.comment-reply-item {
  border-top: 1px solid var(--mind-border-subtle);
  padding-top: 8px;
  margin-top: 8px;
}

.comment-reply-input,
.ai-key-input {
  width: 100%;
  height: 32px;
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12.5px;
  background: var(--mind-bg-canvas);
  color: var(--mind-text-primary);
  outline: none;
  margin-top: 6px;
}

.ai-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.ai-send-button,
.primary-blue-btn {
  height: 32px;
  padding: 0 12px;
  background: var(--mind-accent-solid);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

/* Search Modal (07-search-modal-results.jpg) */
.search-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--mind-border-subtle);
}

.search-lens-icon {
  font-size: 18px;
  color: var(--mind-text-muted);
}

.search-modal-bare-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 18px;
  color: var(--mind-text-primary);
}

.search-results-container {
  padding: 10px;
  max-height: 380px;
  overflow-y: auto;
}

.search-item-emoji {
  font-size: 20px;
  margin-top: 2px;
}

.search-item-body {
  flex: 1;
  min-width: 0;
}

.search-item-title {
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.3;
}

.modal-clean-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--mind-text-primary);
}

.clean-modal-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  background: var(--mind-bg-surface-subtle);
  border: 1px solid var(--mind-border-control);
  border-radius: 6px;
  font-size: 13.5px;
  color: var(--mind-text-primary);
  outline: none;
}

.modal-actions-end {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.exported-md-preview {
  background: var(--mind-bg-sidebar);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  padding: 10px;
  font-size: 11.5px;
  max-height: 200px;
  overflow: auto;
  margin: 0;
}

.mind-subpages-section {
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px solid var(--mind-border-subtle);
}

.subpages-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.subpages-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--mind-text-muted);
}

.subpage-add-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mind-text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.subpage-add-action-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.subpages-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-header-icon-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-header-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.12s ease;
  user-select: none;
}

.page-header-icon-box:hover {
  background: var(--mind-bg-hover);
}

.page-header-emoji {
  font-size: 42px;
  line-height: 1;
}

.page-header-custom-img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 6px;
}

.page-header-icon-hover-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.14s ease;
}

.page-header-icon-container:hover .page-header-icon-hover-actions {
  opacity: 1;
}

.page-icon-action-btn {
  border: 1px solid var(--mind-border-subtle);
  background: var(--mind-bg-surface-subtle);
  color: var(--mind-text-muted);
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.page-icon-action-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
  border-color: var(--mind-border-control);
}

.crumb-custom-img {
  width: 15px;
  height: 15px;
  object-fit: contain;
  border-radius: 2px;
}

.editor-container :deep(.mind-editor-root) {
  padding: 0 0 28px;
  max-width: none;
  margin: 0;
}
</style>
