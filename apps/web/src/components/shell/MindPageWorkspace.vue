<template>
  <q-page-container>
    <q-page>
      <!-- Clean Login Surface -->
      <CleanLoginView
        v-if="store.activeSurface === 'login'"
        @authenticated="store.activeSurface = 'editor'"
        @forgot-password="store.activeSurface = 'editor'"
      />

      <!-- Main Document + Embedded Database + Open-Source Diagrams -->
      <div v-else-if="store.activePage" class="editor-container">
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
            <!-- Page Header Icon & Customization (below YAML Properties) -->
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
                  @click="openProperties"
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

        <!-- Notion-like Subpages Section -->
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

    <!-- Page Icon Picker Modal -->
    <MindIconPickerModal
      v-model="isIconPickerOpen"
      @select="(icon) => store.activePage && store.updatePageMeta(store.activePage.id, { icon })"
    />
  </q-page-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import type { MindNode, TiptapDoc } from '@mind-hub/shared';
import { MindEditor, type PageReference } from '@mind-hub/editor';
import { useMindStore } from '../../stores/mind-store.js';
import { usePageFrontmatter } from '../../composables/usePageFrontmatter.js';
import { isImageUrl } from '../../utils/media.js';
import CleanLoginView from '../CleanLoginView.vue';
import DatabaseViewBlock from '../DatabaseViewBlock.vue';
import DiagramEmbedsBlock from '../DiagramEmbedsBlock.vue';
import MindSubpageLink from '../ui/MindSubpageLink.vue';
import MindIconPickerModal from '../ui/MindIconPickerModal.vue';

const store = useMindStore();
const { activePage, activePageId, editorReadMode } = storeToRefs(store);

const isIconPickerOpen = ref(false);
const mindEditorRef = ref<InstanceType<typeof MindEditor> | null>(null);

const {
  showPropertiesOverride,
  activePageFrontmatter,
  isActivePagePropertiesVisible,
  handleFrontmatterUpdate,
  requestOpenProperties,
} = usePageFrontmatter({
  activePage,
  activePageId,
  editorReadMode,
  updatePageMeta: store.updatePageMeta,
});

function openProperties(): void {
  requestOpenProperties(mindEditorRef.value);
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

const activePageSubpages = computed(() => {
  if (!store.activePage) return [];
  return store.activePages.filter((p) => p.parentId === store.activePage?.id);
});

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

.editor-container :deep(.mind-editor-root) {
  padding: 0 0 28px;
  max-width: none;
  margin: 0;
}
</style>
