<template>
  <q-layout view="lHh Lpr lFf" class="mind-light-style mind-light-theme">
    <!-- Top Header Bar (Issue #33, #40 & mind-light-style) -->
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
          @click="leftDrawerOpen = true"
        >
          <component :is="Menu" :size="16" />
        </button>

        <!-- Center Page Breadcrumb with Favorite Toggle and Sync Indicator (Issue #67) -->
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
              <img
                v-if="crumb.icon && isImageUrl(crumb.icon)"
                :src="crumb.icon"
                class="crumb-custom-img"
                alt=""
              />
              <span v-else>{{ crumb.icon || '📄' }}</span>
              <span>{{ crumb.title }}</span>
            </button>
          </template>
        </div>

        <q-space />

        <!-- Right Page Controls: Share, Comments, AI, Actions (...) -->
        <div class="topbar-actions-right">
          <MindIconButton
            :icon="Share2"
            label="Share & Export"
            text="Share"
            class="gt-xs"
            data-testid="share-export-btn"
            @click="triggerGitExport"
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

    <!-- Edge Peek Zone when sidebar is collapsed (Issue #28) -->
    <div
      v-if="!leftDrawerOpen"
      class="sidebar-edge-peek-zone"
      title="Passe o mouse para abrir a barra lateral"
      @mouseenter="handleEdgeMouseEnter"
    />

    <!-- Left Sidebar with Resizer & Sticky Footer (Issues #28, #31, #33, #35, #40) -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="sidebarWidth"
      class="mind-sidebar column no-wrap"
    >
      <!-- Top Notion-Style Header Row (Collapse left, Inbox & New Note right) -->
      <div class="sidebar-top-bar">
        <!-- Left: Close Sidebar -->
        <button
          type="button"
          class="sidebar-top-icon-btn"
          title="Fechar barra lateral (Ctrl+\)"
          aria-label="Fechar barra lateral"
          data-testid="sidebar-collapse-btn"
          @click="leftDrawerOpen = false"
        >
          <component :is="PanelLeftClose" :size="16" />
        </button>

        <!-- Right: Actions (Inbox & New Note at root) -->
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

      <!-- Minimalist Search Trigger Bar in Sidebar (Issue #31) -->
      <div class="sidebar-search-area">
        <MindSidebarSearch @open="openSearchModal" />
      </div>

      <!-- Quick Utility Nav Items (Issue #40: Lixeira moved up next to settings) -->
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
          @click="openSearchModal"
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
      <div v-if="store.favoritePages.length > 0" class="sidebar-section-container" data-testid="sidebar-favorites-section">
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
            @select="
              (id) => {
                store.activeSurface = 'editor';
                store.selectPage(id);
              }
            "
            @create-child="handleCreateChildPage"
            @contextmenu="(ev, page) => handleTreeContextMenu(ev, page, 'favorites')"
            @rename-save="handleRenameSave"
          />
        </div>
      </div>

      <!-- Pages Section Header with Expand/Collapse All and Active Counter (Issue #63) -->
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

      <!-- Hierarchical Page Tree (Scrollable body) with Context Menu & Inline Rename -->
      <div class="col scroll sidebar-tree-container">
        <PageTreeItem
          v-for="node in store.pageTree"
          :key="node.id"
          :node="node"
          :active-page-id="store.activePageId"
          :renaming-id="renamingPageId"
          :force-expanded="treeForceExpanded"
          :depth="0"
          @select="
            (id) => {
              store.activeSurface = 'editor';
              store.selectPage(id);
            }
          "
          @create-child="handleCreateChildPage"
          @contextmenu="handleTreeContextMenu"
          @more-options="(id, ev) => ev && handleTreeContextMenu(ev, store.pages.find((p) => p.id === id) || node)"
          @rename-save="handleRenameSave"
        />
      </div>

      <!-- Sticky Sidebar Footer (Issues #33, #40, #46: User Profile Card & Help/Releases/Apps) -->
      <div class="sidebar-sticky-footer">
        <div
          class="sidebar-user-card"
          title="Clique para abrir opções da conta e configurações"
          data-testid="sidebar-user-card-btn"
          @click="isWorkspaceMenuOpen = !isWorkspaceMenuOpen"
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
            @click="isHelpVersionsMenuOpen = !isHelpVersionsMenuOpen"
          >
            <component :is="HelpCircle" :size="15" />
          </button>
          <button
            type="button"
            class="sidebar-footer-icon-btn"
            title="Mais opções e utilitários (Lixeira, IA, Tarefas)"
            aria-label="Mais opções e utilitários"
            data-testid="sidebar-footer-apps-btn"
            @click="isAppsMenuOpen = !isAppsMenuOpen"
          >
            <component :is="LayoutGrid" :size="15" />
          </button>
        </div>
      </div>

      <!-- Drag Resizer Handle on right edge of sidebar (Issue #35) -->
      <div
        class="sidebar-drag-resizer"
        title="Arraste para redimensionar (270px a 600px)"
        @mousedown="onResizerMouseDown"
      />
    </q-drawer>

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
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  CopyPlus,
  Download,
  FolderDown,
  HelpCircle,
  Home,
  Inbox,
  LayoutGrid,
  Link2,
  Lock,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search as SearchIcon,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Trash2,
  UserCheck,
} from 'lucide-vue-next';
import type { MindNode, RawMarkdownFileEntry, TiptapDoc } from '@mind-hub/shared';
import { useMindStore } from './stores/mind-store.js';
import PageTreeItem from './components/PageTreeItem.vue';
import { MindEditor, type EditorFrontmatter, type PageReference } from '@mind-hub/editor';
import DatabaseViewBlock from './components/DatabaseViewBlock.vue';
import DiagramEmbedsBlock from './components/DiagramEmbedsBlock.vue';
import CleanLoginView from './components/CleanLoginView.vue';
import MindIconButton from './components/ui/MindIconButton.vue';
import MindActionMenu from './components/ui/MindActionMenu.vue';
import MindSidebarSearch from './components/ui/MindSidebarSearch.vue';
import MindSearchModal from './components/ui/MindSearchModal.vue';
import MindTrashModal from './components/ui/MindTrashModal.vue';
import MindSubpageLink from './components/ui/MindSubpageLink.vue';
import MindIconPickerModal from './components/ui/MindIconPickerModal.vue';
import MindWorkspaceMenu from './components/ui/MindWorkspaceMenu.vue';
import MindSidebarAppsMenu from './components/ui/MindSidebarAppsMenu.vue';
import MindHelpVersionsMenu from './components/ui/MindHelpVersionsMenu.vue';
import MindVersionHistoryModal from './components/ui/MindVersionHistoryModal.vue';
import MindTreeContextMenu from './components/ui/MindTreeContextMenu.vue';
import MindMovePageModal from './components/ui/MindMovePageModal.vue';
import MindSettingsModal from './components/ui/MindSettingsModal.vue';
import MindQuickCaptureModal from './components/ui/MindQuickCaptureModal.vue';
import MindFavoriteItem from './components/ui/MindFavoriteItem.vue';
import type { ActionMenuItem, ActionMenuPageMeta, TreeContextMenuActionId, TreeContextMenuTarget } from './components/ui/types.js';

const store = useMindStore();
const leftDrawerOpen = ref(true);
const isTrashModalOpen = ref(false);
const isWorkspaceMenuOpen = ref(false);
const isAppsMenuOpen = ref(false);
const isHelpVersionsMenuOpen = ref(false);
const isIconPickerOpen = ref(false);
const sidebarWidth = ref(Number(localStorage.getItem('mind_sidebar_width')) || 280);
const isResizingSidebar = ref(false);
const showOverflowMenu = ref(false);
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

const isFavoritesCollapsed = ref(false);
const treeForceExpanded = ref<boolean | null>(null);
const renamingPageId = ref<string>('');
const renamingFavPageId = ref<string>('');
const contextMenuSource = ref<'tree' | 'favorites'>('tree');
const isTreeContextMenuOpen = ref(false);
const treeContextMenuTarget = ref<TreeContextMenuTarget | null>(null);
const treeContextMenuCoords = reactive({ x: 0, y: 0 });

const isMovePageModalOpen = ref(false);
const pageIdToMove = ref<string>('');

function toggleTreeExpandAll(): void {
  treeForceExpanded.value = treeForceExpanded.value === true ? false : true;
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

async function handleTreeContextMenuAction(actionId: TreeContextMenuActionId, pageId: string): Promise<void> {
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
      await handleCreateChildPage(pageId);
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
        openActivePageProperties();
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
        triggerGitExport();
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

function isImageUrl(val: string): boolean {
  return (
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('data:image/') ||
    val.startsWith('/')
  );
}

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
  window.removeEventListener('mousemove', onResizerMouseMove);
  window.removeEventListener('mouseup', onResizerMouseUp);
});

function handleEdgeMouseEnter(): void {
  leftDrawerOpen.value = true;
}

function onResizerMouseDown(e: MouseEvent): void {
  e.preventDefault();
  isResizingSidebar.value = true;
  window.addEventListener('mousemove', onResizerMouseMove);
  window.addEventListener('mouseup', onResizerMouseUp);
}

function onResizerMouseMove(e: MouseEvent): void {
  if (!isResizingSidebar.value) return;
  const clientX = e.clientX;
  if (clientX < 200) {
    leftDrawerOpen.value = false;
    isResizingSidebar.value = false;
    window.removeEventListener('mousemove', onResizerMouseMove);
    window.removeEventListener('mouseup', onResizerMouseUp);
    return;
  }
  const clamped = Math.max(270, Math.min(600, clientX));
  sidebarWidth.value = clamped;
}

function onResizerMouseUp(): void {
  if (isResizingSidebar.value) {
    isResizingSidebar.value = false;
    localStorage.setItem('mind_sidebar_width', String(sidebarWidth.value));
  }
  window.removeEventListener('mousemove', onResizerMouseMove);
  window.removeEventListener('mouseup', onResizerMouseUp);
}

function handleGlobalKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearchModal();
  } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
    e.preventDefault();
    leftDrawerOpen.value = !leftDrawerOpen.value;
  }
}

function toggleRightPanel(mode: 'comments' | 'ai'): void {
  if (store.isCommentsDrawerOpen && store.rightDrawerMode === mode) {
    store.isCommentsDrawerOpen = false;
  } else {
    store.rightDrawerMode = mode;
    store.isCommentsDrawerOpen = true;
    store.isAiDrawerOpen = mode === 'ai';
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

function handleOpenHelp(): void {
  window.open(store.repoUrl, '_blank', 'noopener,noreferrer');
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

function splitSnippetSegments(
  snippet: string,
  rawQuery: string,
): Array<{ text: string; bold: boolean }> {
  const q = rawQuery.trim();
  if (!q) return [{ text: snippet, bold: false }];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = snippet.split(regex);
  return parts
    .filter((p) => p.length > 0)
    .map((part) => ({
      text: part,
      bold: part.toLowerCase() === q.toLowerCase(),
    }));
}
</script>

<style scoped>
/* Topbar Elements */
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

/* Favorites Section (Issue #63) */
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

.topbar-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Edge Hover Peek Zone when sidebar is collapsed (Issue #28) */
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

/* Sidebar Top Bar (Issues #40, #46: Notion Workspace Header) */
.sidebar-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 4px;
  min-height: 42px;
  gap: 4px;
}

.sidebar-workspace-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  max-width: calc(100% - 94px);
  min-width: 0;
  text-align: left;
  transition: background-color 0.12s ease;
}

.sidebar-workspace-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.sidebar-workspace-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-workspace-icon {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: var(--mind-text-primary, #212529);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.sidebar-workspace-status-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff6b6b;
  border: 1px solid var(--mind-bg-canvas, #ffffff);
}

.sidebar-workspace-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--mind-text-primary, #212529);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.sidebar-workspace-chevron {
  color: var(--mind-text-muted, #868e96);
  flex-shrink: 0;
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

.sidebar-mini-btn {
  min-inline-size: 22px;
  min-block-size: 22px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.sidebar-mini-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.sidebar-tree-container {
  padding: 0 8px;
  overflow-y: auto;
}

/* Sticky Footer at the bottom of the sidebar */
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

/* Drag Resizer on right edge of sidebar */
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
