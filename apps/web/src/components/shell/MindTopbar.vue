<template>
  <q-header class="mind-header">
    <q-toolbar class="mind-toolbar">
      <!-- Sidebar Hamburger button: ONLY visible when sidebar is collapsed (Issue #40) -->
      <button
        v-if="!leftDrawerOpen"
        type="button"
        class="topbar-icon-btn"
        aria-label="Abrir barra lateral"
        title="Abrir barra lateral (Ctrl+\)"
        data-testid="toggle-sidebar-btn"
        @click="$emit('update:leftDrawerOpen', true)"
      >
        <component :is="Menu" :size="16" />
      </button>

      <!-- Center Page Breadcrumb -->
      <div
        v-if="store.activePage"
        class="topbar-breadcrumb gt-xs"
        :class="{ 'no-sidebar-offset': leftDrawerOpen }"
      >
        <template v-for="(crumb, idx) in store.breadcrumbs" :key="crumb.id">
          <span v-if="idx > 0" class="crumb-sep">/</span>
          <button
            type="button"
            class="crumb-btn"
            @click="
              store.activeSurface = 'editor';
              store.selectPage(crumb.id);
            "
          >
            <MindPageIcon :icon="crumb.icon" :size="14" />
            <span>{{ crumb.title }}</span>
          </button>
        </template>
      </div>

      <q-space />

      <!-- Right Page Controls: Git Sync, Share, Comments, AI, Actions (...) -->
      <div class="topbar-actions-right">
        <button
          type="button"
          class="topbar-git-sync-pill gt-xs"
          :class="`is-${store.gitHubSyncStatus.state}`"
          title="Sincronização GitHub (Google OKF)"
          data-testid="topbar-github-sync-pill"
          @click="$emit('open-sync-settings')"
        >
          <span class="sync-status-dot" />
          <span>{{ topbarSyncLabel }}</span>
        </button>

        <MindIconButton
          :icon="Share2"
          label="Share & Export"
          text="Share"
          class="gt-xs"
          data-testid="share-export-btn"
          @click="$emit('export-git')"
        />

        <MindIconButton
          :icon="MessageSquare"
          label="Comments"
          data-testid="toggle-comments-btn"
          :active="store.isCommentsDrawerOpen && store.rightDrawerMode === 'comments'"
          @click="toggleRightPanel('comments')"
        />

        <MindIconButton
          :icon="Sparkles"
          label="Copiloto IA"
          data-testid="toggle-ai-btn"
          :active="store.isCommentsDrawerOpen && store.rightDrawerMode === 'ai'"
          @click="toggleRightPanel('ai')"
        />

        <MindIconButton
          :icon="MoreHorizontal"
          label="More page actions"
          data-testid="page-overflow-trigger"
          :active="showOverflowMenu"
          @click.stop="showOverflowMenu = !showOverflowMenu"
        />
      </div>
    </q-toolbar>

    <!-- Notion-like MindActionMenu Popover (Issue #27 & #30) -->
    <MindActionMenu
      v-if="showOverflowMenu"
      :items="actionMenuItems"
      :page-meta="pageMetadata"
      @close="showOverflowMenu = false"
    />
  </q-header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Copy,
  CopyPlus,
  Download,
  FolderDown,
  Inbox,
  Link2,
  Lock,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-vue-next';
import { useMindStore } from '../../stores/mind-store.js';
import MindIconButton from '../ui/MindIconButton.vue';
import MindActionMenu from '../ui/MindActionMenu.vue';
import MindPageIcon from '../ui/MindPageIcon.vue';
import type { ActionMenuItem, ActionMenuPageMeta } from '../ui/types.js';

defineProps<{
  leftDrawerOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:leftDrawerOpen', value: boolean): void;
  (e: 'export-git'): void;
  (e: 'open-properties'): void;
  (e: 'open-sync-settings'): void;
}>();

const store = useMindStore();
const showOverflowMenu = ref(false);

const topbarSyncLabel = computed(() => {
  const status = store.gitHubSyncStatus;
  if (!status.configured) return 'Conectar Git';
  if (status.state === 'syncing') return 'Sincronizando';
  if (status.state === 'error' || status.state === 'conflict') return 'Sync Atenção';
  if (status.pendingChangesCount > 0) return `Sync (${status.pendingChangesCount})`;
  return 'GitHub OK';
});

function toggleRightPanel(mode: 'comments' | 'ai'): void {
  if (store.isCommentsDrawerOpen && store.rightDrawerMode === mode) {
    store.isCommentsDrawerOpen = false;
    store.isAiDrawerOpen = false;
  } else {
    store.rightDrawerMode = mode;
    store.isCommentsDrawerOpen = true;
    store.isAiDrawerOpen = mode === 'ai';
  }
}

const actionMenuItems = computed<ActionMenuItem[]>(() => {
  const current = store.activePage;
  const isInbox = current?.isInbox ?? false;

  const items: ActionMenuItem[] = [
    {
      id: 'copy-link',
      label: 'Copiar link',
      icon: Link2,
      shortcut: 'Ctrl+Alt+L',
      section: 'actions',
      handler: () => {
        if (current) {
          const url = `${window.location.origin}/#/page/${current.slug}`;
          void navigator.clipboard?.writeText(url);
        }
      },
    },
    {
      id: 'copy-markdown',
      label: 'Copiar conteúdo Markdown',
      icon: Copy,
      shortcut: 'Ctrl+Shift+C',
      section: 'actions',
      handler: () => {
        if (current) {
          void navigator.clipboard?.writeText(current.contentMarkdown);
        }
      },
    },
    {
      id: 'duplicate-page',
      label: 'Duplicar página',
      icon: CopyPlus,
      shortcut: 'Ctrl+D',
      section: 'actions',
      handler: () => {
        if (current) {
          void store.createPage({
            title: `${current.title} (Cópia)`,
            icon: current.icon,
            parentId: current.parentId,
            tags: current.tags,
            contentMarkdown: current.contentMarkdown,
            contentJson: current.contentJson,
          });
        }
      },
    },
    {
      id: 'add-properties',
      label: 'Propriedades (YAML)',
      icon: SlidersHorizontal,
      shortcut: '---',
      section: 'tools',
      handler: () => {
        emit('open-properties');
      },
    },
    {
      id: 'lock-page',
      label: 'Bloquear página / Leitura',
      icon: Lock,
      toggle: true,
      active: store.editorReadMode,
      section: 'tools',
      handler: () => {
        store.editorReadMode = !store.editorReadMode;
      },
    },
    {
      id: 'quick-capture',
      label: 'Quick capture to Inbox',
      icon: Inbox,
      section: 'tools',
      handler: () => {
        store.isQuickInsightOpen = true;
      },
    },
    {
      id: 'import-bulk',
      label: 'Import Second Brain (.md Bulk)',
      icon: FolderDown,
      section: 'tools',
      handler: () => {
        store.isImportModalOpen = true;
      },
    },
    {
      id: 'export-git',
      label: 'Export Markdown / Git (.md)',
      icon: Download,
      section: 'tools',
      handler: () => {
        emit('export-git');
      },
    },
    {
      id: 'preview-login',
      label: store.activeSurface === 'login' ? 'Voltar ao Documento' : 'Preview Login Screen',
      icon: UserCheck,
      section: 'tools',
      handler: () => {
        store.activeSurface = store.activeSurface === 'login' ? 'editor' : 'login';
      },
    },
  ];

  if (current && !isInbox) {
    items.push({
      id: 'delete-page',
      label: 'Mover para a lixeira',
      icon: Trash2,
      danger: true,
      shortcut: 'Del',
      section: 'danger',
      handler: () => {
        void store.softDeletePage(current.id);
      },
    });
  }

  return items;
});

const pageMetadata = computed<ActionMenuPageMeta>(() => {
  const current = store.activePage;
  const rawText = current?.contentMarkdown ?? '';
  const words = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const chars = rawText.length;

  let formattedDate = 'Hoje';
  if (current?.updatedAt) {
    try {
      const d = new Date(current.updatedAt);
      formattedDate = d.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      formattedDate = current.updatedAt;
    }
  }

  return {
    lastEditedAuthor: 'Luiz Pulz',
    lastEditedDate: formattedDate,
    wordCount: words,
    characterCount: chars,
  };
});
</script>

<style scoped>
.topbar-icon-btn {
  min-inline-size: 28px;
  min-block-size: 28px;
  border: none;
  background: transparent;
  color: var(--mind-text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.topbar-icon-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  font-size: 13px;
  transition: margin-left 0.15s ease;
}

.topbar-breadcrumb.no-sidebar-offset {
  margin-left: 6px;
}

.crumb-sep {
  color: var(--mind-text-muted);
}

.crumb-btn {
  border: none;
  background: transparent;
  color: var(--mind-text-secondary);
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.crumb-btn:hover {
  background: var(--mind-bg-hover);
}

.crumb-custom-img {
  width: 15px;
  height: 15px;
  object-fit: contain;
  border-radius: 2px;
}

.topbar-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.topbar-git-sync-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-sidebar, #f8f9fa);
  color: var(--mind-text-secondary, #495057);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.topbar-git-sync-pill:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  border-color: #dee2e6;
}

.sync-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #adb5bd;
}

.topbar-git-sync-pill.is-connected .sync-status-dot {
  background: #2f9e44;
}

.topbar-git-sync-pill.is-syncing .sync-status-dot {
  background: #1971c2;
}

.topbar-git-sync-pill.is-conflict .sync-status-dot,
.topbar-git-sync-pill.is-error .sync-status-dot {
  background: #e67700;
}
</style>
