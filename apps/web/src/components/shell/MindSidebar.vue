<template>
  <!-- Edge Peek Zone when sidebar is collapsed (Issue #28) -->
  <div
    v-if="!drawerOpen"
    class="sidebar-edge-peek-zone"
    title="Passe o mouse para abrir a barra lateral"
    @mouseenter="drawerOpen = true"
  />

  <!-- Left Sidebar with Resizer, Favorites, Tree & Sticky Footer -->
  <q-drawer
    v-model="drawerOpen"
    show-if-above
    bordered
    :width="sidebarWidth"
    class="mind-sidebar column no-wrap"
  >
    <!-- Top Notion-Style Header Row -->
    <div class="sidebar-top-bar">
      <button
        type="button"
        class="sidebar-top-icon-btn"
        title="Fechar barra lateral (Ctrl+\)"
        aria-label="Fechar barra lateral"
        data-testid="sidebar-collapse-btn"
        @click="drawerOpen = false"
      >
        <component :is="PanelLeftClose" :size="16" />
      </button>

      <div class="sidebar-top-actions">
        <button
          type="button"
          class="sidebar-top-icon-btn"
          title="Caixa de entrada / Inbox"
          aria-label="Inbox"
          data-testid="sidebar-inbox-btn"
          @click="handleOpenInbox"
        >
          <component :is="Inbox" :size="16" />
        </button>
        <button
          type="button"
          class="sidebar-top-icon-btn"
          title="Nova página na raiz"
          aria-label="Nova página na raiz"
          data-testid="sidebar-new-root-note-btn"
          @click="handleCreateRootPage"
        >
          <component :is="SquarePen" :size="16" />
        </button>
      </div>
    </div>

    <!-- Minimalist Search Trigger Bar in Sidebar -->
    <div class="sidebar-search-area">
      <MindSidebarSearch @open="$emit('open-search')" />
    </div>

    <!-- Quick Utility Nav Items -->
    <nav class="sidebar-utility-nav" aria-label="Space navigation">
      <div
        class="sidebar-nav-item"
        :class="{ 'is-active': store.activeSurface === 'editor' && !isTrashModalOpen }"
        @click="store.activeSurface = 'editor'"
      >
        <component :is="Home" :size="15" class="nav-item-lucide" />
        <span>Página inicial</span>
      </div>
      <div
        class="sidebar-nav-item"
        data-testid="open-search-btn"
        @click="$emit('open-search')"
      >
        <component :is="SearchIcon" :size="15" class="nav-item-lucide" />
        <span>Busca rápida</span>
      </div>
      <div
        class="sidebar-nav-item"
        @click="store.isMcpModalOpen = true"
      >
        <component :is="Settings" :size="15" class="nav-item-lucide" />
        <span>Configurações</span>
      </div>
    </nav>

    <!-- Favorites Section (Issue #63) -->
    <div
      v-if="store.favoritePages.length > 0"
      class="sidebar-section-container"
      data-testid="sidebar-favorites-section"
    >
      <div class="pages-section-header" @click="isFavoritesCollapsed = !isFavoritesCollapsed">
        <span class="sidebar-section-label">Favoritos ({{ store.favoritePages.length }})</span>
        <div class="pages-section-actions">
          <button
            type="button"
            class="sidebar-mini-btn"
            :title="isFavoritesCollapsed ? 'Expandir favoritos' : 'Recolher favoritos'"
            data-testid="toggle-favorites-collapse-btn"
            @click.stop="isFavoritesCollapsed = !isFavoritesCollapsed"
          >
            <component :is="isFavoritesCollapsed ? ChevronRight : ChevronDown" :size="12" />
          </button>
        </div>
      </div>

      <div v-if="!isFavoritesCollapsed" class="favorites-list" data-testid="sidebar-favorites-list">
        <MindFavoriteItem
          v-for="fav in store.favoritePages"
          :key="fav.id"
          :page="fav"
          :active-page-id="store.activePageId"
          :renaming-id="renamingFavPageId"
          @select="selectEditorPage"
          @create-child="handleCreateChildPage"
          @contextmenu="(ev, page) => handleTreeContextMenu(ev, page, 'favorites')"
          @rename-save="handleRenameSave"
        />
      </div>
    </div>

    <!-- Pages Section Header -->
    <div class="pages-section-header">
      <span class="sidebar-section-label">Pages ({{ store.activePages.length }})</span>
      <div class="pages-section-actions">
        <button
          type="button"
          class="sidebar-mini-btn"
          :title="treeForceExpanded ? 'Recolher todas as pastas' : 'Expandir todas as pastas'"
          data-testid="toggle-tree-expand-all-btn"
          @click="toggleTreeExpandAll"
        >
          <component :is="treeForceExpanded ? ChevronsDownUp : ChevronsUpDown" :size="13" />
        </button>
        <button
          type="button"
          class="sidebar-mini-btn"
          title="New page"
          aria-label="Create page"
          data-testid="new-page-btn"
          @click="handleCreateRootPage"
        >
          <component :is="Plus" :size="13" />
        </button>
      </div>
    </div>

    <!-- Hierarchical Page Tree -->
    <div class="col scroll sidebar-tree-container">
      <PageTreeItem
        v-for="node in store.pageTree"
        :key="node.id"
        :node="node"
        :active-page-id="store.activePageId"
        :renaming-id="renamingPageId"
        :force-expanded="treeForceExpanded"
        :depth="0"
        @select="selectEditorPage"
        @create-child="handleCreateChildPage"
        @contextmenu="handleTreeContextMenu"
        @more-options="
          (id, ev) =>
            ev &&
            handleTreeContextMenu(ev, store.pages.find((p) => p.id === id) || node)
        "
        @rename-save="handleRenameSave"
      />
    </div>

    <!-- Sticky Sidebar Footer -->
    <div class="sidebar-sticky-footer">
      <div
        class="sidebar-user-card"
        title="Clique para abrir opções da conta e configurações"
        data-testid="sidebar-user-card-btn"
        @click="$emit('toggle-workspace-menu')"
      >
        <div class="sidebar-user-avatar">LP</div>
        <div class="sidebar-user-meta">
          <span class="sidebar-user-name">Luiz Pulz</span>
          <span class="sidebar-user-role">Workspace Admin · v{{ store.currentVersion }}</span>
        </div>
      </div>
      <div class="sidebar-footer-actions">
        <button
          type="button"
          class="sidebar-footer-icon-btn sidebar-footer-help-btn"
          title="Ajuda, Documentação & Novidades"
          aria-label="Ajuda e Novidades"
          data-testid="sidebar-help-versions-btn"
          @click="$emit('toggle-help-menu')"
        >
          <component :is="HelpCircle" :size="15" />
        </button>
        <button
          type="button"
          class="sidebar-footer-icon-btn"
          title="Mais opções e utilitários (Lixeira, IA, Tarefas)"
          aria-label="Mais opções e utilitários"
          data-testid="sidebar-footer-apps-btn"
          @click="$emit('toggle-apps-menu')"
        >
          <component :is="LayoutGrid" :size="15" />
        </button>
      </div>
    </div>

    <!-- Drag Resizer Handle -->
    <div
      class="sidebar-drag-resizer"
      title="Arraste para redimensionar (270px a 600px)"
      @mousedown="onResizerMouseDown"
    />
  </q-drawer>

  <!-- Tree Node Context Menu (Issue #61) -->
  <MindTreeContextMenu
    v-if="treeContextMenuTarget"
    v-model="isTreeContextMenuOpen"
    :page="treeContextMenuTarget"
    :x="treeContextMenuCoords.x"
    :y="treeContextMenuCoords.y"
    @action="handleTreeContextMenuAction"
    @close="isTreeContextMenuOpen = false"
  />

  <!-- Move Page Modal (Issue #62) -->
  <MindMovePageModal
    v-if="pageIdToMove"
    v-model="isMovePageModalOpen"
    :page-id="pageIdToMove"
    :pages="store.pages"
    @move="handleConfirmMovePage"
    @close="isMovePageModalOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  HelpCircle,
  Home,
  Inbox,
  LayoutGrid,
  PanelLeftClose,
  Plus,
  Search as SearchIcon,
  Settings,
  SquarePen,
} from 'lucide-vue-next';
import { useMindStore } from '../../stores/mind-store.js';
import { useSidebarResizer } from '../../composables/useSidebarResizer.js';
import PageTreeItem from '../PageTreeItem.vue';
import MindSidebarSearch from '../ui/MindSidebarSearch.vue';
import MindFavoriteItem from '../ui/MindFavoriteItem.vue';
import MindTreeContextMenu from '../ui/MindTreeContextMenu.vue';
import MindMovePageModal from '../ui/MindMovePageModal.vue';
import type { TreeContextMenuActionId, TreeContextMenuTarget } from '../ui/types.js';

const props = defineProps<{
  modelValue: boolean;
  isTrashModalOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:sidebarWidth', value: number): void;
  (e: 'open-search'): void;
  (e: 'toggle-workspace-menu'): void;
  (e: 'toggle-help-menu'): void;
  (e: 'toggle-apps-menu'): void;
}>();

const store = useMindStore();

const drawerOpen = computed<boolean>({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const { sidebarWidth, onResizerMouseDown } = useSidebarResizer({ isOpen: drawerOpen });

watch(
  sidebarWidth,
  (next) => {
    emit('update:sidebarWidth', next);
  },
  { immediate: true },
);

const isFavoritesCollapsed = ref(false);
const treeForceExpanded = ref<boolean | null>(null);
const renamingPageId = ref('');
const renamingFavPageId = ref('');
const contextMenuSource = ref<'tree' | 'favorites'>('tree');
const isTreeContextMenuOpen = ref(false);
const treeContextMenuTarget = ref<TreeContextMenuTarget | null>(null);
const treeContextMenuCoords = reactive({ x: 0, y: 0 });
const isMovePageModalOpen = ref(false);
const pageIdToMove = ref('');

function selectEditorPage(id: string): void {
  store.activeSurface = 'editor';
  store.selectPage(id);
}

function toggleTreeExpandAll(): void {
  treeForceExpanded.value = treeForceExpanded.value === true ? false : true;
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

async function handleOpenInbox(): Promise<void> {
  store.activeSurface = 'editor';
  let inbox = store.pages.find((p) => p.isInbox && p.deletedAt === null);
  if (!inbox) {
    inbox = await store.createPage({
      title: 'Inbox & Insights Rápidos',
      icon: '📥',
      isInbox: true,
      tags: ['inbox', 'captura'],
      contentMarkdown: '# Inbox & Insights Rápidos\n\nNotas rápidas e ideias capturadas.',
    });
  }
  store.selectPage(inbox.id);
}

function handleCreateChildPage(parentId: string): void {
  store.activeSurface = 'editor';
  void store.createPage({
    title: 'Sem título',
    icon: '📑',
    parentId,
    contentMarkdown: '',
    tags: [],
  });
}

function handleTreeContextMenu(
  event: MouseEvent,
  node: {
    id: string;
    title: string;
    icon?: string;
    isFavorite?: boolean;
    updatedAt?: string | number | Date;
  },
  source: 'tree' | 'favorites' = 'tree',
): void {
  contextMenuSource.value = source;
  treeContextMenuTarget.value = {
    id: node.id,
    title: node.title,
    icon: node.icon,
    isFavorite: Boolean(node.isFavorite),
    updatedAt: node.updatedAt,
    authorName: 'Luiz Gustavo Dias Pulz',
  };
  treeContextMenuCoords.x = event.clientX;
  treeContextMenuCoords.y = event.clientY;
  isTreeContextMenuOpen.value = true;
}

function handleRenameSave(id: string, newTitle: string): void {
  if (id && newTitle) {
    void store.renamePage(id, newTitle);
  }
  renamingPageId.value = '';
  renamingFavPageId.value = '';
}

async function handleTreeContextMenuAction(
  actionId: TreeContextMenuActionId,
  pageId: string,
): Promise<void> {
  switch (actionId) {
    case 'rename':
      if (contextMenuSource.value === 'favorites') {
        renamingPageId.value = '';
        renamingFavPageId.value = pageId;
      } else {
        renamingFavPageId.value = '';
        renamingPageId.value = pageId;
      }
      break;
    case 'duplicate':
      await store.duplicatePage(pageId);
      break;
    case 'create-subpage':
      handleCreateChildPage(pageId);
      break;
    case 'move':
      pageIdToMove.value = pageId;
      isMovePageModalOpen.value = true;
      break;
    case 'toggle-favorite':
      await store.toggleFavorite(pageId);
      break;
    case 'copy-link': {
      const page = store.pages.find((p) => p.id === pageId);
      if (page) {
        const url = `${window.location.origin}/#${page.slug}`;
        await navigator.clipboard.writeText(url);
      }
      break;
    }
    case 'open-new-tab': {
      const page = store.pages.find((p) => p.id === pageId);
      if (page) {
        const url = `${window.location.origin}/#${page.slug}`;
        window.open(url, '_blank');
      }
      break;
    }
    case 'open-side-by-side': {
      const page = store.pages.find((p) => p.id === pageId);
      if (page) {
        store.activePageId = page.id;
      }
      break;
    }
    case 'delete':
      await store.softDeletePage(pageId);
      break;
  }
}

async function handleConfirmMovePage(pageId: string, targetParentId: string | null): Promise<void> {
  await store.movePage(pageId, targetParentId);
  isMovePageModalOpen.value = false;
}
</script>

<style scoped>
.sidebar-edge-peek-zone {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 14px;
  z-index: 1500;
  cursor: pointer;
  background: transparent;
}

.sidebar-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 4px;
  min-height: 42px;
  gap: 4px;
}

.sidebar-top-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.sidebar-top-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.sidebar-top-icon-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.sidebar-search-area {
  padding: 0 10px 4px;
}

.sidebar-utility-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px;
  margin-bottom: 10px;
}

.nav-item-lucide {
  color: var(--mind-text-muted);
  flex-shrink: 0;
}

.sidebar-section-container {
  display: flex;
  flex-direction: column;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 8px 6px 8px;
}

.pages-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  margin-bottom: 2px;
}

.pages-section-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sidebar-tree-container {
  padding: 0 8px;
  overflow-y: auto;
}

.sidebar-sticky-footer {
  margin-top: auto;
  border-top: 1px solid var(--mind-border-subtle);
  padding: 6px 8px;
  background: var(--mind-bg-sidebar);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.sidebar-user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
  transition: background-color 0.12s ease;
}

.sidebar-user-card:hover {
  background: var(--mind-bg-hover);
}

.sidebar-footer-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.sidebar-footer-help-btn,
.sidebar-footer-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.sidebar-footer-help-btn:hover,
.sidebar-footer-icon-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.sidebar-user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #495057;
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-user-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mind-text-primary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 10.5px;
  color: var(--mind-text-muted);
  line-height: 1.2;
}

.sidebar-drag-resizer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.15s ease;
  z-index: 100;
}

.sidebar-drag-resizer:hover,
.sidebar-drag-resizer:active {
  background: rgba(33, 37, 41, 0.12);
}
</style>
