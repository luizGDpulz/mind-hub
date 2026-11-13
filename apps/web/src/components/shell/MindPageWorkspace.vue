<template>
  <q-page-container>
    <q-page class="mind-workspace-page" @mousedown="handleWorkspaceMouseDown">
      <!-- Clean Login Surface -->
      <CleanLoginView
        v-if="store.activeSurface === 'login'"
        @authenticated="store.activeSurface = 'editor'"
        @forgot-password="store.activeSurface = 'editor'"
      />

      <!-- Main Document + Embedded Database + Open-Source Diagrams -->
      <template v-else-if="store.activePage">
        <PageCoverBanner
          ref="coverBannerRef"
          :cover-url="store.activePage.coverUrl"
          :cover-y-position="store.activePage.coverYPosition"
          :read-only="store.editorReadMode"
          :uploading="isUploadingCover"
          @update:cover-url="
            (val) => store.activePage && store.updatePageMeta(store.activePage.id, { coverUrl: val })
          "
          @update:cover-y-position="
            (val) =>
              store.activePage && store.updatePageMeta(store.activePage.id, { coverYPosition: val })
          "
          @upload-file="handleCoverUpload"
          @remove="
            store.activePage &&
            store.updatePageMeta(store.activePage.id, { coverUrl: '', coverYPosition: 50 })
          "
        />

        <div class="editor-container" :class="{ 'editor-container--with-cover': hasPageCover }">
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
              <!-- Notion-like Title Header Zone: Custom Icon + Hover-only Top Actions -->
              <div class="page-header-zone" data-testid="page-header-icon-container">
                <div
                  v-if="hasCustomPageIcon"
                  class="page-header-icon-box"
                  :class="{ 'is-overlapping-cover': hasPageCover }"
                  data-testid="page-header-icon"
                  title="Clique para mudar o ícone"
                  @click="!store.editorReadMode && (isIconPickerOpen = true)"
                >
                  <MindPageIcon :icon="store.activePage.icon" :size="44" />
                </div>

                <div
                  v-if="!store.editorReadMode"
                  class="page-header-hover-bar"
                  data-testid="page-header-hover-bar"
                >
                  <button
                    type="button"
                    class="page-header-ghost-btn"
                    data-testid="page-header-icon-btn"
                    @click="isIconPickerOpen = true"
                  >
                    <Smile :size="14" :stroke-width="1.75" />
                    <span>{{ hasCustomPageIcon ? 'Mudar ícone' : 'Adicionar ícone' }}</span>
                  </button>
                  <button
                    v-if="hasCustomPageIcon"
                    type="button"
                    class="page-header-ghost-btn"
                    data-testid="page-header-remove-icon-btn"
                    @click="store.updatePageMeta(store.activePage.id, { icon: '' })"
                  >
                    <span>Remover ícone</span>
                  </button>
                  <button
                    v-if="!hasPageCover"
                    type="button"
                    class="page-header-ghost-btn"
                    data-testid="page-header-cover-btn"
                    @click="handleAddDefaultCover"
                  >
                    <ImageIcon :size="14" :stroke-width="1.75" />
                    <span>Adicionar capa</span>
                  </button>
                  <button
                    type="button"
                    class="page-header-ghost-btn"
                    data-testid="page-header-comment-btn"
                    @click="store.rightDrawerMode = 'comments'; store.isCommentsDrawerOpen = true"
                  >
                    <MessageSquare :size="14" :stroke-width="1.75" />
                    <span>Adicionar comentário</span>
                  </button>
                  <button
                    type="button"
                    class="page-header-ghost-btn"
                    data-testid="page-add-properties-btn"
                    @click="togglePropertiesPanel"
                  >
                    <SlidersHorizontal :size="14" :stroke-width="1.75" />
                    <span>{{ showPropertiesOverride ? 'Ocultar propriedades' : 'Propriedades' }}</span>
                  </button>
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
              </div>
            </template>
          </MindEditor>

          <!-- Embedded Database Block -->
          <DatabaseViewBlock
            v-if="store.showEmbeddedDatabase"
            :rows="store.databaseRows"
            @cycle-status="store.cycleDatabaseRowStatus"
            @add-row="store.addDatabaseTaskRow"
          />

          <!-- Embedded Open-Source Diagrams -->
          <DiagramEmbedsBlock
            v-if="store.showEmbeddedDiagrams"
            :initial-kind="store.activeDiagramKind"
          />
        </div>
      </template>

      <!-- Empty State when there are no active pages -->
      <div v-else-if="!store.isBootstrapping" class="empty-workspace-state q-pa-xl flex flex-center column" style="min-height: 400px">
        <FileText :size="36" :stroke-width="1.5" style="color: var(--mind-text-muted); margin-bottom: 12px" />
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

    <!-- Page Icon Picker Modal -->
    <MindIconPickerModal
      v-model="isIconPickerOpen"
      :current-icon="store.activePage?.icon ?? ''"
      @select="(icon) => store.activePage && store.updatePageMeta(store.activePage.id, { icon })"
    />
  </q-page-container>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { FileText, Image as ImageIcon, MessageSquare, SlidersHorizontal, Smile } from 'lucide-vue-next';
import type { MindNode, TiptapDoc } from '@mind-hub/shared';
import { MindEditor, type PageReference } from '@mind-hub/editor';
import { useMindStore } from '../../stores/mind-store.js';
import { usePageFrontmatter } from '../../composables/usePageFrontmatter.js';
import CleanLoginView from '../CleanLoginView.vue';
import DatabaseViewBlock from '../DatabaseViewBlock.vue';
import DiagramEmbedsBlock from '../DiagramEmbedsBlock.vue';
import MindIconPickerModal from '../ui/MindIconPickerModal.vue';
import MindPageIcon from '../ui/MindPageIcon.vue';
import PageCoverBanner from '../ui/PageCoverBanner.vue';

const store = useMindStore();
const { activePage, activePageId, editorReadMode } = storeToRefs(store);

const isIconPickerOpen = ref(false);
const isUploadingCover = ref(false);
const mindEditorRef = ref<InstanceType<typeof MindEditor> | null>(null);
const coverBannerRef = ref<InstanceType<typeof PageCoverBanner> | null>(null);

const {
  showPropertiesOverride,
  activePageFrontmatter,
  handleFrontmatterUpdate,
  requestOpenProperties,
} = usePageFrontmatter({
  activePage,
  activePageId,
  editorReadMode,
  updatePageMeta: store.updatePageMeta,
});

const hasCustomPageIcon = computed<boolean>(() => {
  const icon = store.activePage?.icon;
  return Boolean(icon && icon !== '📄');
});

const hasPageCover = computed<boolean>(() => Boolean(store.activePage?.coverUrl?.trim()));

function openProperties(): void {
  requestOpenProperties(mindEditorRef.value);
}

function togglePropertiesPanel(): void {
  if (showPropertiesOverride.value) {
    showPropertiesOverride.value = false;
  } else {
    openProperties();
  }
}

function handleWorkspaceMouseDown(event: MouseEvent): void {
  if (store.activeSurface !== 'editor' || !store.activePage || store.editorReadMode) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  // Let MindEditor's own @mousedown handle events originating inside .mind-editor-root
  if (target.closest('.mind-editor-root')) return;
  if (
    target.closest(
      '.page-cover-banner, .page-header-zone, .database-view-block, .diagram-embeds-block, button, input, textarea, select, a',
    )
  ) {
    return;
  }
  mindEditorRef.value?.handleRootMouseDown(event);
}

defineExpose({ openProperties });

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

async function handleAddDefaultCover(): Promise<void> {
  if (!store.activePage) return;
  await store.updatePageMeta(store.activePage.id, {
    coverUrl: 'preset:sky',
    coverYPosition: 50,
  });
  await nextTick();
  coverBannerRef.value?.openPicker();
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao ler arquivo de capa'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Erro ao ler arquivo de capa'));
    reader.readAsDataURL(file);
  });
}

async function handleCoverUpload(file: File): Promise<void> {
  if (!store.activePage) return;
  isUploadingCover.value = true;
  try {
    const dataBase64 = await readFileAsBase64(file);
    const asset = await store.uploadAsset({
      pageId: store.activePage.id,
      kind: 'cover',
      filename: file.name,
      mimeType: file.type || 'image/png',
      dataBase64,
    });
    if (asset) {
      await store.updatePageMeta(store.activePage.id, {
        coverUrl: asset.url || asset.storagePath,
        coverYPosition: 50,
      });
    }
  } finally {
    isUploadingCover.value = false;
  }
}

async function handleAddSubpage(): Promise<void> {
  if (!store.activePage) return;
  const parentId = store.activePage.id;
  const newSub = await store.createPage(
    {
      title: 'Sem título',
      parentId,
      contentMarkdown: '',
      tags: [],
      icon: '📄',
    },
    { select: false },
  );

  const inserted = mindEditorRef.value?.insertSubpageBlock({
    pageId: newSub.id,
    title: newSub.title,
    icon: newSub.icon || '📄',
    href: `#/page/${newSub.id}`,
  });

  if (!inserted) {
    store.selectPage(newSub.id);
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
</script>

<style scoped>
.editor-container--with-cover {
  padding-top: 16px;
}

.mind-workspace-page {
  min-height: 100%;
}

.page-header-zone {
  position: relative;
  padding-top: 4px;
  margin-bottom: 6px;
}

.page-header-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 10px;
  transition: background-color 0.12s ease;
  user-select: none;
}

.page-header-icon-box.is-overlapping-cover {
  position: relative;
  z-index: 2;
  margin-top: -42px;
  width: 64px;
  height: 64px;
  background: var(--mind-bg-canvas, #ffffff);
  border: 3px solid var(--mind-bg-canvas, #ffffff);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.page-header-icon-box:hover {
  background: var(--mind-bg-hover);
}

.page-header-hover-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 26px;
  margin-bottom: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}

.page-header-zone:hover .page-header-hover-bar,
.page-header-zone:focus-within .page-header-hover-bar {
  opacity: 1;
  pointer-events: auto;
}

.page-header-ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  font-size: 12.5px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.page-header-ghost-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.editor-container :deep(.mind-editor-root) {
  padding: 0 0 28px;
  max-width: none;
  margin: 0;
}
</style>
