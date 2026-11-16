<template>
  <Teleport to="body">
    <div
      v-if="modalPage"
      class="mind-note-peek-backdrop"
      data-testid="mind-note-preview-modal"
      @mousedown.self="store.closeNoteModal()"
    >
      <div
        class="mind-note-peek-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="modalPage.title || 'Nova Nota'"
      >
        <!-- Top Bar (Image 4 style) -->
        <header class="modal-peek-topbar">
          <div class="modal-peek-topbar-left">
            <button
              type="button"
              class="modal-peek-icon-btn"
              title="Abrir como nota inteira"
              aria-label="Abrir como nota inteira"
              data-testid="note-modal-expand-btn"
              @click="handleExpandToFullPage"
            >
              <Maximize2 :size="15" />
            </button>
            <span class="modal-peek-divider" />
            <div class="modal-peek-parent-info" data-testid="note-modal-parent-info">
              <span class="modal-peek-parent-label">Adicionar a</span>
              <button
                v-if="parentPage"
                type="button"
                class="modal-peek-parent-pill"
                @click="handleSelectParent"
              >
                <MindPageIcon
                  :icon="parentPage.icon"
                  :has-content="Boolean(parentPage.contentMarkdown?.trim())"
                  :size="14"
                />
                <span>{{ parentPage.title }}</span>
              </button>
              <span v-else class="modal-peek-parent-pill is-static">
                Notas particulares
              </span>
            </div>
          </div>

          <div class="modal-peek-topbar-right">
            <button
              type="button"
              class="modal-peek-text-btn"
              title="Compartilhar"
              @click="handleCopyLink"
            >
              <Lock :size="13" />
              <span>Compartilhar</span>
            </button>
            <button
              type="button"
              class="modal-peek-icon-btn"
              title="Copiar link da nota"
              aria-label="Copiar link"
              @click="handleCopyLink"
            >
              <Link :size="15" />
            </button>
            <button
              type="button"
              class="modal-peek-icon-btn"
              :class="{ 'is-favorite': modalPage.isFavorite }"
              title="Favoritar nota"
              aria-label="Favoritar nota"
              data-testid="note-modal-favorite-btn"
              @click="store.toggleFavorite(modalPage.id)"
            >
              <Star :size="15" />
            </button>
            <button
              type="button"
              class="modal-peek-icon-btn"
              title="Fechar visualização"
              aria-label="Fechar"
              data-testid="note-modal-close-btn"
              @click="store.closeNoteModal()"
            >
              <X :size="16" />
            </button>
          </div>
        </header>

        <!-- Scrollable Note Canvas -->
        <div class="modal-peek-body">
          <PageCoverBanner
            v-if="hasCover"
            ref="coverBannerRef"
            :cover-url="modalPage.coverUrl ?? ''"
            :cover-y-position="modalPage.coverYPosition ?? 50"
            :read-only="false"
            @update:cover-url="(url) => store.updatePageMeta(modalPage!.id, { coverUrl: url })"
            @update:cover-y-position="(y) => store.updatePageMeta(modalPage!.id, { coverYPosition: y })"
            @remove="store.updatePageMeta(modalPage!.id, { coverUrl: '' })"
          />

          <div class="modal-peek-content-wrap">
            <MindEditor
              ref="mindEditorRef"
              :key="modalPage.id"
              :model-value="modalPage.contentJson"
              :title="modalPage.title"
              :show-title="false"
              :pages="mentionPageReferences"
              :enable-frontmatter-header="false"
              placeholder="Digite '/' para comandos ou comece a escrever..."
              @update:json="handleEditorJsonUpdate"
              @select-page="handleNavigatePage"
              @create-subpage="handleAddSubnoteInModal"
              @insert-database-block="handleQuickDatabase"
              @insert-diagram-block="(kind) => handleQuickDiagram(kind)"
            >
              <template #before-editor>
                <div class="modal-page-header-zone">
                  <div
                    v-if="hasCustomIcon"
                    class="modal-page-icon-box"
                    title="Clique para alterar o ícone"
                    @click="isIconPickerOpen = true"
                  >
                    <MindPageIcon
                      :icon="modalPage.icon"
                      :has-content="Boolean(modalPage.contentMarkdown?.trim())"
                      :size="40"
                    />
                  </div>

                  <div class="modal-header-hover-bar">
                    <button
                      type="button"
                      class="modal-header-ghost-btn"
                      @click="isIconPickerOpen = true"
                    >
                      <Smile :size="14" />
                      <span>{{ hasCustomIcon ? 'Mudar ícone' : 'Adicionar ícone' }}</span>
                    </button>
                    <button
                      v-if="!hasCover"
                      type="button"
                      class="modal-header-ghost-btn"
                      @click="handleAddDefaultCover"
                    >
                      <ImageIcon :size="14" />
                      <span>Adicionar capa</span>
                    </button>
                  </div>

                  <input
                    ref="titleInputRef"
                    :value="modalPage.title"
                    type="text"
                    class="modal-note-title-h1"
                    placeholder="Nova Nota"
                    data-testid="note-modal-title-input"
                    aria-label="Título da nota"
                    @focus="handleTitleFocus"
                    @input="handleTitleInput"
                    @keydown.enter.prevent="focusEditorBody"
                  />
                </div>
              </template>
            </MindEditor>
          </div>

          <!-- Bottom Quick Actions when Note is Blank (Image 4 style) -->
          <div
            v-if="!modalPage.contentMarkdown?.trim()"
            class="modal-peek-quickstart"
            data-testid="note-modal-quickstart"
          >
            <div class="quickstart-caption">Comece a usar</div>
            <div class="quickstart-pills">
              <button
                type="button"
                class="quickstart-pill-btn"
                @click="handleQuickAskAi"
              >
                <Sparkles :size="14" />
                <span>Pedir à IA</span>
              </button>
              <button
                type="button"
                class="quickstart-pill-btn"
                @click="handleAddSubnoteInModal"
              >
                <FilePlus :size="14" />
                <span>Subnota</span>
              </button>
              <button
                type="button"
                class="quickstart-pill-btn"
                @click="handleQuickDatabase"
              >
                <LayoutGrid :size="14" />
                <span>Base de dados</span>
              </button>
              <button
                type="button"
                class="quickstart-pill-btn"
                @click="handleQuickDiagram('mermaid')"
              >
                <Workflow :size="14" />
                <span>Diagrama</span>
              </button>
            </div>
          </div>
        </div>

        <MindIconPickerModal
          v-model="isIconPickerOpen"
          :current-icon="modalPage.icon ?? ''"
          @select="(icon) => modalPage && store.updatePageMeta(modalPage.id, { icon })"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  FilePlus,
  Image as ImageIcon,
  LayoutGrid,
  Link,
  Lock,
  Maximize2,
  Smile,
  Sparkles,
  Star,
  Workflow,
  X,
} from 'lucide-vue-next';
import type { MindNode, TiptapDoc } from '@mind-hub/shared';
import { MindEditor, type PageReference } from '@mind-hub/editor';
import { useMindStore } from '../../stores/mind-store.js';
import MindIconPickerModal from './MindIconPickerModal.vue';
import MindPageIcon from './MindPageIcon.vue';
import PageCoverBanner from './PageCoverBanner.vue';

const store = useMindStore();

const isIconPickerOpen = ref(false);
const titleInputRef = ref<HTMLInputElement | null>(null);
const mindEditorRef = ref<InstanceType<typeof MindEditor> | null>(null);
const coverBannerRef = ref<InstanceType<typeof PageCoverBanner> | null>(null);

const modalPage = computed(() => store.noteModalPage);

const parentPage = computed(() => {
  const pid = modalPage.value?.parentId;
  if (!pid) return null;
  return store.pages.find((p) => p.id === pid && p.deletedAt === null) ?? null;
});

const hasCustomIcon = computed(() => {
  const icon = modalPage.value?.icon;
  return Boolean(icon && icon !== '📄' && icon !== '📑' && icon !== '📁');
});

const hasCover = computed(() => Boolean(modalPage.value?.coverUrl?.trim()));

const mentionPageReferences = computed<PageReference[]>(() =>
  store.activePages.map((p) => {
    const parent = p.parentId
      ? store.pages.find((cand) => cand.id === p.parentId && cand.deletedAt === null)
      : undefined;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      icon: p.icon || '',
      hasContent: Boolean(p.contentMarkdown?.trim()),
      category: parent?.title ?? 'Notas particulares',
      summary: '',
      updatedAt: p.updatedAt,
    };
  }),
);

watch(
  () => store.noteModalPageId,
  async (nextId) => {
    if (nextId) {
      await nextTick();
      titleInputRef.value?.focus();
      if (titleInputRef.value?.value === 'Nova Nota') {
        titleInputRef.value.select();
      }
    }
  },
);

function handleTitleFocus(event: FocusEvent): void {
  const input = event.target as HTMLInputElement;
  if (input.value === 'Nova Nota') {
    input.select();
  }
}

function handleTitleInput(event: Event): void {
  if (!modalPage.value) return;
  const nextTitle = (event.target as HTMLInputElement).value;
  void store.updatePageMeta(modalPage.value.id, { title: nextTitle });
}

function focusEditorBody(): void {
  mindEditorRef.value?.focus();
}

function isMindNode(value: unknown): value is MindNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

function handleEditorJsonUpdate(doc: Record<string, unknown>): void {
  if (!modalPage.value) return;
  const safeContent: MindNode[] = Array.isArray(doc.content)
    ? doc.content.filter(isMindNode)
    : [];
  const nextDoc: TiptapDoc = {
    type: 'doc',
    content: safeContent,
  };
  void store.updatePageContentById(modalPage.value.id, nextDoc);
}

function handleExpandToFullPage(): void {
  if (!modalPage.value) return;
  const targetId = modalPage.value.id;
  store.closeNoteModal();
  store.selectPage(targetId);
}

function handleSelectParent(): void {
  if (!parentPage.value) return;
  const pid = parentPage.value.id;
  store.closeNoteModal();
  store.selectPage(pid);
}

function handleNavigatePage(pageId: string): void {
  store.closeNoteModal();
  store.selectPage(pageId);
}

async function handleAddDefaultCover(): Promise<void> {
  if (!modalPage.value) return;
  await store.updatePageMeta(modalPage.value.id, {
    coverUrl: 'preset:sky',
    coverYPosition: 50,
  });
}

async function handleAddSubnoteInModal(): Promise<void> {
  if (!modalPage.value) return;
  const currentId = modalPage.value.id;
  const newSub = await store.createPage(
    {
      title: 'Nova Nota',
      parentId: currentId,
      contentMarkdown: '',
      tags: [],
      icon: '',
    },
    { select: false },
  );
  mindEditorRef.value?.insertSubpageBlock({
    pageId: newSub.id,
    title: newSub.title,
    icon: newSub.icon || '',
    href: `#/page/${newSub.id}`,
  });
}

function handleQuickAskAi(): void {
  if (!modalPage.value) return;
  const targetId = modalPage.value.id;
  store.closeNoteModal();
  store.selectPage(targetId);
  store.rightDrawerMode = 'ai';
  store.isCommentsDrawerOpen = true;
}

function handleQuickDatabase(): void {
  if (!modalPage.value) return;
  const targetId = modalPage.value.id;
  store.closeNoteModal();
  store.selectPage(targetId);
  store.enableDatabaseBlockForActivePage();
}

function handleQuickDiagram(kind: 'mermaid' | 'excalidraw' | 'drawio'): void {
  if (!modalPage.value) return;
  const targetId = modalPage.value.id;
  store.closeNoteModal();
  store.selectPage(targetId);
  store.enableDiagramBlockForActivePage(kind);
}

function handleCopyLink(): void {
  if (!modalPage.value) return;
  const url = `${window.location.origin}/#/page/${modalPage.value.id}`;
  void navigator.clipboard?.writeText(url);
}
</script>

<style scoped>
.mind-note-peek-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(25, 25, 25, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.mind-note-peek-dialog {
  width: min(860px, 92vw);
  height: min(760px, 86vh);
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-peek-topbar {
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modal-peek-topbar-left,
.modal-peek-topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-peek-divider {
  width: 1px;
  height: 16px;
  background: var(--mind-border-subtle, #e9ecef);
  margin: 0 4px;
}

.modal-peek-parent-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--mind-text-muted, #868e96);
}

.modal-peek-parent-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--mind-text-primary, #212529);
  font-size: 12.5px;
  font-weight: 500;
  padding: 3px 6px;
  border-radius: 5px;
  cursor: pointer;
}

.modal-peek-parent-pill:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.modal-peek-parent-pill.is-static {
  cursor: default;
}

.modal-peek-icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--mind-text-secondary, #495057);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-peek-icon-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.modal-peek-icon-btn.is-favorite {
  color: #f59f00;
}

.modal-peek-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--mind-text-secondary, #495057);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.modal-peek-text-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.modal-peek-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.modal-peek-content-wrap {
  padding: 36px 72px 24px;
  flex: 1;
}

.modal-page-header-zone {
  margin-bottom: 8px;
}

.modal-page-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 8px;
}

.modal-page-icon-box:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.modal-header-hover-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  margin-bottom: 6px;
  opacity: 0;
  transition: opacity 0.14s ease;
}

.modal-page-header-zone:hover .modal-header-hover-bar,
.modal-page-header-zone:focus-within .modal-header-hover-bar {
  opacity: 1;
}

.modal-header-ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  font-size: 12px;
  font-weight: 500;
  padding: 3px 7px;
  border-radius: 5px;
  cursor: pointer;
}

.modal-header-ghost-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.modal-note-title-h1 {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--mind-text-primary, #212529);
  margin-bottom: 8px;
}

.modal-note-title-h1::placeholder {
  color: #ced4da;
}

.modal-peek-quickstart {
  padding: 18px 72px 28px;
}

.quickstart-caption {
  font-size: 12px;
  font-weight: 500;
  color: var(--mind-text-muted, #868e96);
  margin-bottom: 10px;
}

.quickstart-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quickstart-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 999px;
  background: var(--mind-bg-canvas, #ffffff);
  color: var(--mind-text-secondary, #495057);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.quickstart-pill-btn:hover {
  background: var(--mind-bg-hover, #f8f9fa);
  border-color: #dee2e6;
  color: var(--mind-text-primary, #212529);
}
</style>
