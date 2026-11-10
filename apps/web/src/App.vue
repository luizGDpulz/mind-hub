<template>
  <q-layout view="lHh Lpr lFf" :class="store.darkMode ? 'mind-dark-theme' : 'mind-light-theme'">
    <!-- Top Header -->
    <q-header bordered class="mind-header">
      <q-toolbar class="q-px-md">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Alternar barra lateral"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <div class="row items-center q-ml-sm no-wrap">
          <span class="text-subtitle1 text-weight-bold tracking-tight">Mind Hub</span>
          <q-badge color="indigo-7" text-color="white" class="q-ml-sm">
            ⚡ {{ store.lastLatencyMs }} ms
          </q-badge>
          <q-badge
            outline
            color="teal-4"
            class="q-ml-xs gt-xs cursor-pointer"
            @click="store.isMcpModalOpen = true"
          >
            MCP /mcp Ready
          </q-badge>
        </div>

        <!-- Breadcrumbs -->
        <div class="row items-center q-ml-lg gt-sm text-caption text-grey-5">
          <template v-for="(crumb, idx) in store.breadcrumbs" :key="crumb.id">
            <span v-if="idx > 0" class="q-mx-xs">/</span>
            <span
              class="cursor-pointer hover-underline"
              @click="store.selectPage(crumb.id)"
            >
              {{ crumb.icon }} {{ crumb.title }}
            </span>
          </template>
        </div>

        <q-space />

        <!-- Search Trigger -->
        <q-btn
          unelevated
          dense
          no-caps
          icon="search"
          label="Buscar (Textual + pgvector)"
          class="search-pill q-px-md q-mr-sm"
          data-testid="open-search-btn"
          @click="openSearchModal"
        />

        <!-- Git Sovereignty Export Trigger -->
        <q-btn
          flat
          dense
          no-caps
          icon="cloud_download"
          label="Sync Git (.md)"
          color="indigo-3"
          class="q-mr-xs gt-xs"
          data-testid="export-git-btn"
          @click="triggerGitExport"
        />

        <!-- AI Copilot Drawer Toggle -->
        <q-btn
          unelevated
          dense
          no-caps
          icon="auto_awesome"
          label="Copiloto IA"
          color="indigo-6"
          class="q-px-sm q-mr-xs"
          data-testid="toggle-ai-btn"
          @click="store.isAiDrawerOpen = !store.isAiDrawerOpen"
        />

        <!-- Dark Mode Toggle -->
        <q-btn
          flat
          dense
          round
          :icon="store.darkMode ? 'light_mode' : 'dark_mode'"
          @click="toggleTheme"
        />
      </q-toolbar>
    </q-header>

    <!-- Left Page Tree Sidebar -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="285"
      class="mind-sidebar q-pa-sm column no-wrap"
    >
      <div class="row items-center justify-between q-px-sm q-py-xs">
        <span class="text-caption text-weight-bold text-grey-5">SECOND BRAIN</span>
        <q-btn
          flat
          dense
          size="sm"
          icon="add_circle"
          label="Nova Nota"
          color="indigo-4"
          no-caps
          data-testid="new-page-btn"
          @click="handleCreateRootPage"
        />
      </div>

      <!-- Quick Access: Favorites -->
      <div v-if="store.favoritePages.length > 0" class="q-mt-xs q-mb-sm">
        <div class="text-caption text-grey-6 q-px-sm q-mb-xs">⭐ FAVORITOS</div>
        <div
          v-for="fav in store.favoritePages"
          :key="`fav-${fav.id}`"
          class="tree-node-row row items-center no-wrap q-px-sm q-py-xs rounded-borders cursor-pointer"
          :class="{ 'tree-node-active': store.activePageId === fav.id }"
          @click="store.selectPage(fav.id)"
        >
          <span class="q-mr-sm">{{ fav.icon }}</span>
          <span class="ellipsis col text-body2">{{ fav.title }}</span>
        </div>
      </div>

      <q-separator class="q-my-xs" />

      <!-- Hierarchical Page Tree -->
      <div class="col scroll q-mt-xs">
        <div class="text-caption text-grey-6 q-px-sm q-mb-xs">🗂️ PÁGINAS & ADRs</div>
        <PageTreeItem
          v-for="node in store.pageTree"
          :key="node.id"
          :node="node"
          :active-page-id="store.activePageId"
          :depth="0"
          @select="store.selectPage"
          @create-child="handleCreateChildPage"
        />

        <!-- Soft-Deleted Trash Section -->
        <div v-if="store.deletedPages.length > 0" class="q-mt-lg">
          <div class="text-caption text-amber-5 q-px-sm q-mb-xs">
            🗑️ LIXEIRA (Soft Delete: {{ store.deletedPages.length }})
          </div>
          <div
            v-for="del in store.deletedPages"
            :key="`del-${del.id}`"
            class="row items-center justify-between q-px-sm q-py-xs text-caption text-grey-5"
          >
            <span class="ellipsis col">{{ del.icon }} {{ del.title }}</span>
            <q-btn
              flat
              dense
              size="xs"
              icon="restore"
              color="teal-4"
              title="Restaurar página"
              :data-testid="`restore-${del.id}`"
              @click="store.restorePage(del.id)"
            />
          </div>
        </div>
      </div>

      <!-- Footer Telemetry -->
      <q-separator class="q-my-sm" />
      <div class="q-px-sm q-py-xs text-caption text-grey-5 row items-center justify-between">
        <span>Licença AGPLv3</span>
        <span>{{ store.activePages.length }} notas ativas</span>
      </div>
    </q-drawer>

    <!-- Right AI Copilot & BYOK Drawer -->
    <q-drawer
      v-model="store.isAiDrawerOpen"
      side="right"
      bordered
      :width="350"
      class="mind-sidebar q-pa-md column no-wrap"
    >
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle2 text-weight-bold">🤖 Copiloto IA & RAG Vetorial</div>
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          @click="store.isAiDrawerOpen = false"
        />
      </div>

      <q-input
        v-model="store.geminiApiKey"
        dense
        outlined
        type="password"
        label="Chave Google Gemini (BYOK Opcional)"
        placeholder="AIzaSy..."
        class="q-mb-md"
      >
        <template #prepend>
          <q-icon name="vpn_key" size="xs" />
        </template>
      </q-input>

      <div class="col scroll q-gutter-y-sm q-pr-xs">
        <q-card
          v-for="msg in store.aiChatHistory"
          :key="msg.id"
          flat
          bordered
          class="q-pa-sm"
          :class="msg.role === 'user' ? 'bg-indigo-10 text-white' : 'ai-msg-card'"
        >
          <div class="row items-center justify-between text-caption text-grey-4 q-mb-xs">
            <span>{{ msg.role === 'user' ? 'Você' : 'Mind Hub IA' }}</span>
            <q-badge v-if="msg.provider" color="teal-8" text-color="white">
              {{ msg.provider }}
            </q-badge>
          </div>
          <div class="text-body2" style="white-space: pre-line">{{ msg.text }}</div>
          <div v-if="msg.referencedPages && msg.referencedPages.length > 0" class="q-mt-xs">
            <q-chip
              v-for="refPage in msg.referencedPages"
              :key="refPage.id"
              dense
              clickable
              size="sm"
              color="indigo-9"
              text-color="indigo-2"
              @click="store.selectPage(refPage.id)"
            >
              {{ refPage.title }}
            </q-chip>
          </div>
        </q-card>
      </div>

      <div class="row items-center no-wrap q-mt-sm">
        <q-input
          v-model="aiPromptInput"
          dense
          outlined
          placeholder="Pergunte sobre a arquitetura ou notas..."
          class="col q-mr-xs"
          data-testid="ai-prompt-input"
          @keyup.enter="sendAiQuestion"
        />
        <q-btn
          unelevated
          color="indigo-6"
          icon="send"
          data-testid="ai-send-btn"
          @click="sendAiQuestion"
        />
      </div>
    </q-drawer>

    <!-- Main Document Workspace -->
    <q-page-container>
      <q-page class="q-pa-lg">
        <div v-if="store.activePage" class="editor-container q-mx-auto">
          <!-- Page Meta & Actions Header -->
          <div class="row items-center justify-between q-mb-sm">
            <div class="row items-center q-gutter-xs">
              <q-btn
                flat
                dense
                size="sm"
                :icon="store.activePage.isFavorite ? 'star' : 'star_border'"
                :color="store.activePage.isFavorite ? 'amber-4' : 'grey-5'"
                label="Favoritar"
                no-caps
                @click="
                  store.updatePageMeta(store.activePage.id, {
                    isFavorite: !store.activePage.isFavorite,
                  })
                "
              />
              <q-chip
                v-for="tag in store.activePage.tags"
                :key="tag"
                dense
                size="sm"
                color="indigo-9"
                text-color="indigo-2"
              >
                #{{ tag }}
              </q-chip>
            </div>

            <div class="row items-center q-gutter-xs">
              <span class="text-caption text-grey-5">
                Slug: <code>/{{ store.activePage.slug }}</code>
              </span>
              <q-btn
                v-if="!store.activePage.isInbox"
                flat
                dense
                size="sm"
                icon="delete_outline"
                color="negative"
                label="Mover p/ Lixeira"
                no-caps
                data-testid="soft-delete-btn"
                @click="store.softDeletePage(store.activePage.id)"
              />
            </div>
          </div>

          <!-- Editable Icon & Title -->
          <div class="row items-center no-wrap q-mb-md">
            <span class="text-h3 q-mr-md">{{ store.activePage.icon }}</span>
            <q-input
              :model-value="store.activePage.title"
              borderless
              class="col page-title-input"
              input-class="text-h4 text-weight-bold"
              data-testid="page-title-input"
              @update:model-value="
                (val) =>
                  store.activePage &&
                  store.updatePageMeta(store.activePage.id, { title: String(val ?? '') })
              "
            />
          </div>

          <!-- Tiptap v2 Block Editor -->
          <TiptapBlockEditor
            :model-value="store.activePage.contentJson"
            :markdown-value="store.activePage.contentMarkdown"
            @update:model-value="store.updateActivePageContent"
            @update:markdown-value="store.updateActivePageMarkdown"
          />
        </div>
      </q-page>
    </q-page-container>

    <!-- Permanent Floating Action Button: 💡 Insight Rápido -->
    <q-page-sticky position="bottom-right" :offset="[24, 24]">
      <q-btn
        fab
        color="indigo-6"
        icon="lightbulb"
        label="💡 Insight Rápido"
        class="shadow-8 text-weight-bold q-px-md"
        data-testid="quick-insight-fab"
        @click="store.isQuickInsightOpen = true"
      />
    </q-page-sticky>

    <!-- Quick Insight 2-Second Capture Modal -->
    <q-dialog v-model="store.isQuickInsightOpen">
      <q-card style="min-width: 420px; max-width: 92vw" class="mind-dialog-card q-pa-md">
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-subtitle1 text-weight-bold">💡 Captura de Insight Rápido (Inbox)</div>
          <q-badge color="teal-7">Salva em &lt; 2ms</q-badge>
        </div>
        <div class="text-caption text-grey-4 q-mb-md">
          Descarregue pensamentos, tarefas ou ideias sem burocracia direto na página
          <strong>📥 Inbox &amp; Insights Rápidos</strong>.
        </div>
        <q-input
          v-model="quickInsightText"
          outlined
          autofocus
          placeholder="Ex: Testar índice HNSW no pgvector amanhã..."
          data-testid="quick-insight-input"
          @keyup.enter="handleSaveQuickInsight"
        />
        <q-card-actions align="right" class="q-mt-md q-pb-none">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="indigo-6"
            label="Salvar na Inbox"
            data-testid="quick-insight-submit"
            @click="handleSaveQuickInsight"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Hybrid Search Modal (Textual + pgvector Semantic) -->
    <q-dialog v-model="store.isSearchDialogOpen">
      <q-card style="min-width: 560px; max-width: 94vw" class="mind-dialog-card q-pa-md">
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-subtitle1 text-weight-bold">
            🔍 Busca Instantânea &amp; Similaridade de Cosseno (pgvector)
          </div>
          <q-btn-toggle
            v-model="store.searchMode"
            dense
            unelevated
            size="sm"
            toggle-color="indigo-6"
            :options="[
              { label: 'Híbrida', value: 'hybrid' },
              { label: 'Textual', value: 'text' },
              { label: 'Semântica (Vetorial)', value: 'semantic' },
            ]"
            @update:model-value="() => store.runSearch()"
          />
        </div>

        <q-input
          v-model="store.searchQuery"
          outlined
          autofocus
          placeholder="Busque por conceito, código, tag ou título..."
          class="q-mb-md"
          data-testid="search-modal-input"
          @update:model-value="() => store.runSearch()"
        />

        <q-list bordered separator class="rounded-borders" style="max-height: 320px; overflow-y: auto">
          <q-item
            v-for="item in store.searchResults"
            :key="item.page.id"
            clickable
            @click="selectSearchResult(item.page.id)"
          >
            <q-item-section avatar>
              <span class="text-h6">{{ item.page.icon }}</span>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">
                {{ item.page.title }}
              </q-item-label>
              <q-item-label caption class="text-grey-4">
                {{ item.snippet }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge color="indigo-8">score {{ item.score.toFixed(1) }}</q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>

    <!-- MCP Inspector & Git Sovereignty Snapshot Modal -->
    <q-dialog v-model="store.isMcpModalOpen">
      <q-card style="min-width: 580px; max-width: 95vw" class="mind-dialog-card q-pa-md">
        <div class="text-subtitle1 text-weight-bold q-mb-xs">
          🔌 Servidor Model Context Protocol Nativo (<code>/mcp</code>) &amp; Soberania Git
        </div>
        <div class="text-caption text-grey-4 q-mb-md">
          Endpoint 100% gratuito e aberto para Claude Desktop, Cursor e Antigravity CLI.
        </div>

        <div class="q-pa-sm rounded-borders bg-dark text-caption font-mono q-mb-md">
          <div>POST /mcp (JSON-RPC 2.0)</div>
          <div>Tools: search_pages | get_page | create_page | update_page</div>
        </div>

        <div v-if="store.lastSyncSnapshot" class="q-mt-sm">
          <div class="text-caption text-teal-4 q-mb-xs">
            ✅ Snapshot Markdown Exportado ({{ store.lastSyncSnapshot.totalFiles }} arquivos .md com Frontmatter YAML):
          </div>
          <q-card flat bordered class="q-pa-sm bg-dark" style="max-height: 220px; overflow: auto">
            <pre class="q-ma-none text-caption">{{ store.lastSyncSnapshot.files[0]?.markdown }}</pre>
          </q-card>
        </div>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Fechar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Dark } from 'quasar';
import { useMindStore } from './stores/mind-store.js';
import PageTreeItem from './components/PageTreeItem.vue';
import TiptapBlockEditor from './components/TiptapBlockEditor.vue';

const store = useMindStore();
const leftDrawerOpen = ref(true);
const quickInsightText = ref('');
const aiPromptInput = ref('');

onMounted(() => {
  Dark.set(store.darkMode);
  void store.initializeStore();
});

function toggleTheme(): void {
  store.darkMode = !store.darkMode;
  Dark.set(store.darkMode);
}

function handleCreateRootPage(): void {
  void store.createPage({
    title: `Nota Técnica ${store.activePages.length + 1}`,
    icon: '📝',
    tags: ['arquitetura'],
  });
}

function handleCreateChildPage(parentId: string): void {
  void store.createPage({
    title: 'Subpágina & Especificação',
    icon: '📑',
    parentId,
    tags: ['subpagina'],
  });
}

function handleSaveQuickInsight(): void {
  const text = quickInsightText.value.trim();
  if (!text) return;
  void store.submitQuickInsight(text, ['insight-rapido']).then((inbox) => {
    quickInsightText.value = '';
    store.isQuickInsightOpen = false;
    store.selectPage(inbox.id);
  });
}

function openSearchModal(): void {
  store.isSearchDialogOpen = true;
  store.runSearch();
}

function selectSearchResult(pageId: string): void {
  store.selectPage(pageId);
  store.isSearchDialogOpen = false;
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
</script>
