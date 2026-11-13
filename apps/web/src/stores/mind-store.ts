import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  buildPageTree,
  createInitialSeedComments,
  createInitialSeedDatabaseTasks,
  createInitialSeedPages,
  createSampleSecondBrainBatch,
  DEFAULT_SLASH_COMMANDS,
  exportPageWithFrontmatter,
  generateDeterministicEmbedding,
  getPageBreadcrumbs,
  markdownToTiptap,
  planBulkVaultImport,
  searchPagesEngine,
  slugifyTitle,
  tiptapToMarkdown,
  CURRENT_MIND_VERSION,
  MIND_REPO_URL,
  MIND_VERSION_HISTORY,
  type AiChatResponse,
  type BulkImportApiResponse,
  type CreatePageInput,
  type DatabaseStatus,
  type DatabaseTaskRow,
  type DiagramKind,
  type GitSyncSnapshot,
  type MindPage,
  type MindVersionEntry,
  type PageCommentThread,
  type PageTreeNode,
  type RawMarkdownFileEntry,
  type SearchMode,
  type SearchResultItem,
  type TiptapDoc,
  type UpdatePageInput,
} from '@mind-hub/shared';

export interface AiChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  provider?: 'gemini-byok' | 'nvidia-nim' | 'local-rag';
  referencedPages?: Array<{ id: string; title: string; score: number }>;
  createdAt: string;
}

export const useMindStore = defineStore('mindHub', () => {
  const pages = ref<MindPage[]>(createInitialSeedPages());
  const activePageId = ref<string>('page-manifesto');
  const darkMode = ref<boolean>(false);
  const activeSurface = ref<'editor' | 'database' | 'login'>('editor');
  const editorReadMode = ref<boolean>(false);
  const rightDrawerMode = ref<'comments' | 'ai'>('comments');
  const isCommentsDrawerOpen = ref<boolean>(false);
  const showEmbeddedDatabase = ref<boolean>(false);
  const showEmbeddedDiagrams = ref<boolean>(false);
  const activeDiagramKind = ref<DiagramKind>('mermaid');
  const pagesWithDatabaseBlock = ref<string[]>([]);
  const pagesWithDiagramBlock = ref<Record<string, DiagramKind>>({});
  const searchQuery = ref<string>('');
  const searchMode = ref<SearchMode>('hybrid');
  const searchResults = ref<SearchResultItem[]>([]);
  const isSearchDialogOpen = ref<boolean>(false);
  const isQuickInsightOpen = ref<boolean>(false);
  const isAiDrawerOpen = ref<boolean>(false);
  const isMcpModalOpen = ref<boolean>(false);
  const isImportModalOpen = ref<boolean>(false);
  const isVersionHistoryModalOpen = ref<boolean>(false);
  const currentVersion = ref<string>(CURRENT_MIND_VERSION);
  const repoUrl = ref<string>(MIND_REPO_URL);
  const versionHistory = ref<MindVersionEntry[]>(MIND_VERSION_HISTORY);
  const lastBulkImportReport = ref<BulkImportApiResponse | null>(null);
  const geminiApiKey = ref<string>('');
  const nvidiaApiKey = ref<string>('');

  const pageComments = ref<PageCommentThread[]>(createInitialSeedComments());

  const databaseRows = ref<DatabaseTaskRow[]>(createInitialSeedDatabaseTasks());
  const aiChatHistory = ref<AiChatEntry[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: 'Olá! Sou o copiloto semântico do **Mind Hub**. Posso pesquisar na sua base vetorial (`pgvector`) ou responder usando **NVIDIA NIM** / **Google Gemini (BYOK)**.',
      provider: 'local-rag',
      createdAt: new Date().toISOString(),
    },
  ]);
  const lastSyncSnapshot = ref<GitSyncSnapshot | null>(null);
  const lastLatencyMs = ref<number>(0.42);
  const backendConnected = ref<boolean>(false);

  const activePages = computed<MindPage[]>(() =>
    pages.value.filter((p) => p.deletedAt === null),
  );

  const activePage = computed<MindPage | null>(() => {
    const found = pages.value.find(
      (p) => p.id === activePageId.value && p.deletedAt === null,
    );
    return found ?? activePages.value[0] ?? null;
  });

  const pageTree = computed<PageTreeNode[]>(() => buildPageTree(pages.value));

  const favoritePages = computed<MindPage[]>(() =>
    activePages.value.filter((p) => p.isFavorite),
  );

  const deletedPages = computed<MindPage[]>(() =>
    pages.value.filter((p) => p.deletedAt !== null),
  );

  const breadcrumbs = computed<MindPage[]>(() => {
    if (!activePage.value) return [];
    return getPageBreadcrumbs(pages.value, activePage.value.id);
  });

  const slashCommands = computed(() => DEFAULT_SLASH_COMMANDS);

  async function initializeStore(): Promise<void> {
    const t0 = performance.now();
    try {
      const response = await fetch('/api/workspace/bootstrap');
      if (response.ok) {
        const data = (await response.json()) as {
          pages?: MindPage[];
          databaseTasks?: DatabaseTaskRow[];
          comments?: PageCommentThread[];
        };
        if (Array.isArray(data.pages)) {
          pages.value = data.pages;
          const first = data.pages[0];
          if (first && !data.pages.some((p) => p.id === activePageId.value)) {
            activePageId.value = first.id;
          }
        }
        if (Array.isArray(data.databaseTasks)) {
          databaseRows.value = data.databaseTasks;
        }
        if (Array.isArray(data.comments)) {
          pageComments.value = data.comments;
        }
        backendConnected.value = true;
      } else {
        const fallbackRes = await fetch('/api/pages?includeDeleted=true');
        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as { pages?: MindPage[] };
          if (Array.isArray(fallbackData.pages)) {
            pages.value = fallbackData.pages;
            const first = fallbackData.pages[0];
            if (first && !fallbackData.pages.some((p) => p.id === activePageId.value)) {
              activePageId.value = first.id;
            }
            backendConnected.value = true;
          }
        }
      }
    } catch {
      backendConnected.value = false;
    } finally {
      lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));
    }
  }

  function syncEmbeddedBlocksForPage(pageId: string): void {
    showEmbeddedDatabase.value = pagesWithDatabaseBlock.value.includes(pageId);
    const diagramKind = pagesWithDiagramBlock.value[pageId];
    showEmbeddedDiagrams.value = Boolean(diagramKind);
    if (diagramKind) {
      activeDiagramKind.value = diagramKind;
    }
  }

  function enableDatabaseBlockForActivePage(): void {
    const current = activePage.value;
    if (current && !pagesWithDatabaseBlock.value.includes(current.id)) {
      pagesWithDatabaseBlock.value = [...pagesWithDatabaseBlock.value, current.id];
    }
    showEmbeddedDatabase.value = true;
  }

  function removeDatabaseBlockFromActivePage(): void {
    const current = activePage.value;
    if (current) {
      pagesWithDatabaseBlock.value = pagesWithDatabaseBlock.value.filter(
        (id) => id !== current.id,
      );
    }
    showEmbeddedDatabase.value = false;
  }

  function enableDiagramBlockForActivePage(kind: DiagramKind = 'mermaid'): void {
    const current = activePage.value;
    if (current) {
      pagesWithDiagramBlock.value = {
        ...pagesWithDiagramBlock.value,
        [current.id]: kind,
      };
    }
    activeDiagramKind.value = kind;
    showEmbeddedDiagrams.value = true;
  }

  function removeDiagramBlockFromActivePage(): void {
    const current = activePage.value;
    if (current) {
      const next = { ...pagesWithDiagramBlock.value };
      delete next[current.id];
      pagesWithDiagramBlock.value = next;
    }
    showEmbeddedDiagrams.value = false;
  }

  function selectPage(id: string): void {
    const t0 = performance.now();
    const target = pages.value.find((p) => p.id === id && p.deletedAt === null);
    if (target) {
      activePageId.value = target.id;
      syncEmbeddedBlocksForPage(target.id);
    }
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));
  }

  async function createPage(input: CreatePageInput): Promise<MindPage> {
    const t0 = performance.now();
    const now = new Date().toISOString();
    const title = input.title.trim() || 'Nova Página';
    const id = input.id ?? `page-${Math.random().toString(36).slice(2, 10)}`;
    const slug = input.slug ?? slugifyTitle(title);
    const contentMarkdown = input.contentMarkdown ?? 'Comece a digitar ou use `/` para comandos de bloco...';
    const contentJson = input.contentJson ?? markdownToTiptap(contentMarkdown);
    const tags = input.tags ? [...input.tags] : ['nota'];

    const newPage: MindPage = {
      id,
      slug,
      title,
      icon: input.icon ?? '📄',
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? pages.value.length + 1,
      contentMarkdown,
      contentJson,
      isFavorite: input.isFavorite ?? false,
      isInbox: input.isInbox ?? false,
      tags,
      embedding: generateDeterministicEmbedding(`${title} ${tags.join(' ')} ${contentMarkdown}`),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    pages.value = [...pages.value, newPage];
    activePageId.value = newPage.id;
    syncEmbeddedBlocksForPage(newPage.id);
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));

    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPage),
      });
      if (res.ok) {
        const body = (await res.json()) as { page?: MindPage };
        if (body.page) {
          pages.value = pages.value.map((p) => (p.id === newPage.id ? body.page! : p));
        }
      }
    } catch {
      // Offline / demo mode keeps local state
    }

    return newPage;
  }

  let patchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function updateActivePageContent(doc: TiptapDoc): Promise<void> {
    const current = activePage.value;
    if (!current) return;

    const t0 = performance.now();
    const markdown = tiptapToMarkdown(doc);
    const embedding = generateDeterministicEmbedding(
      `${current.title} ${current.tags.join(' ')} ${markdown}`,
    );
    const now = new Date().toISOString();

    const updated: MindPage = {
      ...current,
      contentJson: doc,
      contentMarkdown: markdown,
      embedding,
      updatedAt: now,
    };

    pages.value = pages.value.map((p) => (p.id === current.id ? updated : p));
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));

    if (patchDebounceTimer) {
      clearTimeout(patchDebounceTimer);
    }
    patchDebounceTimer = setTimeout(async () => {
      try {
        await fetch(`/api/pages/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentJson: doc,
            contentMarkdown: markdown,
          }),
        });
      } catch {
        // Local state already updated
      }
    }, 300);
  }

  async function updateActivePageMarkdown(markdown: string): Promise<void> {
    const current = activePage.value;
    if (!current) return;

    const t0 = performance.now();
    const doc = markdownToTiptap(markdown);
    const embedding = generateDeterministicEmbedding(
      `${current.title} ${current.tags.join(' ')} ${markdown}`,
    );
    const now = new Date().toISOString();

    const updated: MindPage = {
      ...current,
      contentJson: doc,
      contentMarkdown: markdown,
      embedding,
      updatedAt: now,
    };

    pages.value = pages.value.map((p) => (p.id === current.id ? updated : p));
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));

    try {
      await fetch(`/api/pages/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentJson: doc,
          contentMarkdown: markdown,
        }),
      });
    } catch {
      // Local state already updated
    }
  }

  async function updatePageMeta(id: string, input: UpdatePageInput): Promise<void> {
    const target = pages.value.find((p) => p.id === id);
    if (!target) return;

    const t0 = performance.now();
    const updatedTitle = input.title !== undefined ? input.title : target.title;
    const updated: MindPage = {
      ...target,
      title: updatedTitle,
      slug: input.title !== undefined ? slugifyTitle(updatedTitle) : target.slug,
      icon: input.icon !== undefined ? input.icon : target.icon,
      parentId: input.parentId !== undefined ? input.parentId : target.parentId,
      isFavorite: input.isFavorite ?? target.isFavorite,
      tags: input.tags ? [...input.tags] : target.tags,
      updatedAt: new Date().toISOString(),
    };

    pages.value = pages.value.map((p) => (p.id === id ? updated : p));
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));

    try {
      await fetch(`/api/pages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    } catch {
      // Offline resilient
    }
  }

  function isDescendantOf(pageId: string, potentialAncestorId: string): boolean {
    if (pageId === potentialAncestorId) return true;
    let curr = pages.value.find((p) => p.id === pageId);
    while (curr && curr.parentId) {
      if (curr.parentId === potentialAncestorId) return true;
      curr = pages.value.find((p) => p.id === curr?.parentId);
    }
    return false;
  }

  async function duplicatePage(
    id: string,
    options: { withChildren?: boolean } = { withChildren: true },
  ): Promise<MindPage | null> {
    const target = pages.value.find((p) => p.id === id);
    if (!target) return null;

    const newTitle = `${target.title} (Cópia)`;
    const newSlug = `${target.slug}-copia-${Math.random().toString(36).slice(2, 6)}`;
    const newId = `page-${Math.random().toString(36).slice(2, 10)}`;

    const duplicated = await createPage({
      id: newId,
      title: newTitle,
      slug: newSlug,
      icon: target.icon,
      parentId: target.parentId,
      tags: [...target.tags],
      contentMarkdown: target.contentMarkdown,
      contentJson: JSON.parse(JSON.stringify(target.contentJson)),
      isFavorite: false,
    });

    if (options.withChildren) {
      const children = pages.value.filter((p) => p.parentId === id && p.deletedAt === null);
      for (const child of children) {
        await duplicateChildRecursively(child.id, duplicated.id);
      }
    }

    return duplicated;
  }

  async function duplicateChildRecursively(childId: string, newParentId: string): Promise<void> {
    const child = pages.value.find((p) => p.id === childId);
    if (!child) return;

    const newChildId = `page-${Math.random().toString(36).slice(2, 10)}`;
    const newChild = await createPage({
      id: newChildId,
      title: child.title,
      slug: `${child.slug}-${Math.random().toString(36).slice(2, 6)}`,
      icon: child.icon,
      parentId: newParentId,
      tags: [...child.tags],
      contentMarkdown: child.contentMarkdown,
      contentJson: JSON.parse(JSON.stringify(child.contentJson)),
      isFavorite: false,
    });

    const grandChildren = pages.value.filter((p) => p.parentId === childId && p.deletedAt === null);
    for (const gc of grandChildren) {
      await duplicateChildRecursively(gc.id, newChild.id);
    }
  }

  async function renamePage(id: string, newTitle: string): Promise<void> {
    const cleaned = newTitle.trim();
    if (!cleaned) return;
    await updatePageMeta(id, { title: cleaned });
  }

  async function toggleFavorite(id: string): Promise<void> {
    const target = pages.value.find((p) => p.id === id);
    if (!target) return;
    await updatePageMeta(id, { isFavorite: !target.isFavorite });
  }

  async function movePage(id: string, newParentId: string | null): Promise<boolean> {
    if (newParentId === id) return false;
    if (newParentId && isDescendantOf(newParentId, id)) {
      // Loop protection: cannot move a parent inside its own child!
      return false;
    }
    await updatePageMeta(id, { parentId: newParentId });
    return true;
  }

  async function softDeletePage(id: string): Promise<void> {
    const target = pages.value.find((p) => p.id === id && p.deletedAt === null);
    if (!target) return;

    const now = new Date().toISOString();
    pages.value = pages.value.map((p) =>
      p.id === id ? { ...p, deletedAt: now, updatedAt: now } : p,
    );

    if (activePageId.value === id) {
      const nextPage = pages.value.find((p) => p.id !== id && p.deletedAt === null);
      if (nextPage) {
        activePageId.value = nextPage.id;
      }
    }

    try {
      await fetch(`/api/pages/${id}`, { method: 'DELETE' });
    } catch {
      // Offline resilient
    }
  }

  async function restorePage(id: string): Promise<void> {
    const target = pages.value.find((p) => p.id === id && p.deletedAt !== null);
    if (!target) return;

    const now = new Date().toISOString();
    pages.value = pages.value.map((p) =>
      p.id === id ? { ...p, deletedAt: null, updatedAt: now } : p,
    );
    activePageId.value = id;

    try {
      await fetch(`/api/pages/${id}/restore`, { method: 'POST' });
    } catch {
      // Offline resilient
    }
  }

  async function permanentlyDeletePage(id: string): Promise<void> {
    pages.value = pages.value.filter((p) => p.id !== id);
    if (activePageId.value === id) {
      const remaining = activePages.value;
      if (remaining.length > 0 && remaining[0]) {
        activePageId.value = remaining[0].id;
      }
    }

    try {
      await fetch(`/api/pages/${id}/permanent`, { method: 'DELETE' });
    } catch {
      // Offline resilient
    }
  }

  async function emptyTrash(): Promise<void> {
    pages.value = pages.value.filter((p) => p.deletedAt === null);

    try {
      await fetch('/api/pages/trash/empty', { method: 'POST' });
    } catch {
      // Offline resilient
    }
  }

  async function submitQuickInsight(text: string, tags: string[] = []): Promise<MindPage> {
    const cleaned = text.trim();
    if (!cleaned) {
      throw new Error('Insight vazio');
    }

    const t0 = performance.now();
    let inbox = pages.value.find((p) => p.isInbox && p.deletedAt === null);

    if (!inbox) {
      inbox = await createPage({
        id: 'page-inbox',
        title: 'Inbox & Insights Rápidos',
        icon: '📥',
        isInbox: true,
        isFavorite: true,
        tags: ['inbox', 'captura-rapida'],
        contentMarkdown: '# Caixa de Entrada (Inbox Livre)\n',
      });
    }

    const hhmm = new Date().toISOString().slice(11, 16);
    const updatedMarkdown = `${inbox.contentMarkdown.trimEnd()}\n- [ ] ${cleaned} _(${hhmm})_`;
    const updatedJson = markdownToTiptap(updatedMarkdown);
    const mergedTags = Array.from(new Set([...inbox.tags, ...tags]));

    const updatedInbox: MindPage = {
      ...inbox,
      contentMarkdown: updatedMarkdown,
      contentJson: updatedJson,
      tags: mergedTags,
      embedding: generateDeterministicEmbedding(`${inbox.title} ${updatedMarkdown}`),
      updatedAt: new Date().toISOString(),
    };

    pages.value = pages.value.map((p) => (p.id === inbox!.id ? updatedInbox : p));
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));

    try {
      await fetch('/api/insights/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleaned, tags }),
      });
    } catch {
      // Offline resilient
    }

    return updatedInbox;
  }

  function runSearch(query?: string, mode?: SearchMode): SearchResultItem[] {
    const t0 = performance.now();
    if (query !== undefined) searchQuery.value = query;
    if (mode !== undefined) searchMode.value = mode;

    const results = searchPagesEngine(pages.value, {
      query: searchQuery.value,
      mode: searchMode.value,
      limit: 15,
    });
    searchResults.value = results;
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));
    return results;
  }

  async function askAiAssistant(question: string): Promise<AiChatEntry> {
    const trimmed = question.trim();
    const userEntry: AiChatEntry = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    aiChatHistory.value.push(userEntry);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          apiKey: geminiApiKey.value || undefined,
          nvidiaApiKey: nvidiaApiKey.value || undefined,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as AiChatResponse;
        const assistantEntry: AiChatEntry = {
          id: `msg-${Date.now()}-a`,
          role: 'assistant',
          text: data.answer,
          provider: data.provider,
          referencedPages: data.referencedPages,
          createdAt: new Date().toISOString(),
        };
        aiChatHistory.value.push(assistantEntry);
        return assistantEntry;
      }
    } catch {
      // Fallback to local RAG engine
    }

    const hits = searchPagesEngine(pages.value, {
      query: trimmed,
      mode: 'hybrid',
      limit: 3,
    });

    const answerLines =
      hits.length > 0
        ? [
            `Encontrei **${hits.length} página(s)** relevantes no seu Second Brain para *"${trimmed}"*:`,
            '',
            ...hits.map(
              (h, idx) =>
                `${idx + 1}. **${h.page.icon} ${h.page.title}** *(score ${h.score.toFixed(1)})*\n   > ${h.snippet}`,
            ),
          ]
        : [
            `Não encontrei notas específicas para **"${trimmed}"**. Experimente criar um ADR ou capturar um Insight Rápido!`,
          ];

    const fallbackEntry: AiChatEntry = {
      id: `msg-${Date.now()}-a`,
      role: 'assistant',
      text: answerLines.join('\n'),
      provider: 'local-rag',
      referencedPages: hits.map((h) => ({
        id: h.page.id,
        title: h.page.title,
        score: h.score,
      })),
      createdAt: new Date().toISOString(),
    };
    aiChatHistory.value.push(fallbackEntry);
    return fallbackEntry;
  }

  function exportMarkdownVault(): GitSyncSnapshot {
    const files = activePages.value.map((page) => ({
      path: `${page.slug}.md`,
      pageId: page.id,
      title: page.title,
      markdown: exportPageWithFrontmatter(page),
    }));

    const snapshot: GitSyncSnapshot = {
      exportedAt: new Date().toISOString(),
      totalFiles: files.length,
      files,
    };

    lastSyncSnapshot.value = snapshot;
    return snapshot;
  }

  function cycleDatabaseRowStatus(rowId: string): void {
    const order: DatabaseStatus[] = [
      'Backlog',
      'In Progress',
      'In Review',
      'Blocked',
      'Done',
    ];
    databaseRows.value = databaseRows.value.map((row) => {
      if (row.id !== rowId) return row;
      const idx = order.indexOf(row.status);
      const nextStatus = order[(idx + 1) % order.length] ?? 'Backlog';
      return { ...row, status: nextStatus };
    });

    void fetch(`/api/database/tasks/${rowId}/cycle-status`, {
      method: 'POST',
    }).catch(() => undefined);
  }

  function addDatabaseTaskRow(status: DatabaseStatus = 'Backlog'): DatabaseTaskRow {
    const nextNum = databaseRows.value.length + 1;
    const newRow: DatabaseTaskRow = {
      id: `task-${nextNum}-${Date.now().toString(36)}`,
      rowNumber: nextNum,
      task: `New Roadmap Task #${nextNum}`,
      team: { label: 'Product', tone: 'gray' },
      tags: [{ label: 'Feature', tone: 'blue' }],
      assignees: ['Philip'],
      dueDate: 'Oct 15, 2026',
      dueDateIso: '2026-10-15',
      budget: 7500,
      effort: 2,
      status,
      priority: 'Medium',
      deletedAt: null,
    };
    databaseRows.value = [...databaseRows.value, newRow];

    void fetch('/api/database/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRow),
    }).catch(() => undefined);

    return newRow;
  }

  function addCommentReply(threadId: string, body: string): void {
    const cleaned = body.trim();
    if (!cleaned) return;
    pageComments.value = pageComments.value.map((thread) => {
      if (thread.id !== threadId) return thread;
      return {
        ...thread,
        replies: [
          ...thread.replies,
          {
            id: `reply-${Date.now()}`,
            authorName: 'Philip',
            authorInitials: 'PH',
            createdAtLabel: 'Just now',
            body: cleaned,
          },
        ],
      };
    });

    void fetch(`/api/comments/${threadId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorName: 'Philip',
        authorInitials: 'PH',
        body: cleaned,
      }),
    }).catch(() => undefined);
  }

  async function importMarkdownBulk(
    files: RawMarkdownFileEntry[],
    options: {
      useSampleSecondBrain?: boolean;
      conflictStrategy?: 'upsert' | 'skip';
    } = {},
  ): Promise<BulkImportApiResponse> {
    const t0 = performance.now();
    const effectiveFiles =
      options.useSampleSecondBrain || files.length === 0
        ? createSampleSecondBrainBatch()
        : files;
    const conflictStrategy = options.conflictStrategy ?? 'upsert';

    try {
      const response = await fetch('/api/import/markdown-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: effectiveFiles,
          useSampleSecondBrain: options.useSampleSecondBrain ?? false,
          conflictStrategy,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as BulkImportApiResponse;
        if (data.pages && data.pages.length > 0) {
          pages.value = data.pages;
        }
        lastBulkImportReport.value = data;
        lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));
        return data;
      }
    } catch {
      // Offline / local fallback execution
    }

    const plan = planBulkVaultImport(effectiveFiles, activePages.value, {
      conflictStrategy,
    });
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const nextMap = new Map<string, MindPage>();
    for (const p of pages.value) {
      nextMap.set(p.id, p);
    }

    for (const candidate of plan.pagesToUpsert) {
      const existing =
        nextMap.get(candidate.id) ??
        Array.from(nextMap.values()).find(
          (p) =>
            (candidate.sourcePath && p.sourcePath === candidate.sourcePath) ||
            (p.slug === candidate.slug && p.parentId === candidate.parentId),
        );

      if (existing) {
        if (
          conflictStrategy === 'skip' ||
          (candidate.sourceHash && existing.sourceHash === candidate.sourceHash)
        ) {
          skippedCount += 1;
          continue;
        }
        nextMap.set(existing.id, {
          ...existing,
          ...candidate,
          id: existing.id,
          updatedAt: new Date().toISOString(),
        });
        updatedCount += 1;
      } else {
        nextMap.set(candidate.id, candidate);
        createdCount += 1;
      }
    }

    pages.value = Array.from(nextMap.values());
    const localResult: BulkImportApiResponse = {
      importedAt: new Date().toISOString(),
      notesProcessed: plan.notesProcessed,
      folderPagesCreated: plan.folderPagesCreated,
      createdCount,
      updatedCount,
      skippedCount,
      wikiLinksResolved: plan.wikiLinksResolved,
      discoveredTags: plan.discoveredTags,
      pages: pages.value,
    };
    lastBulkImportReport.value = localResult;
    lastLatencyMs.value = Number((performance.now() - t0).toFixed(2));
    return localResult;
  }

  async function syncServerSecondBrainDirectory(
    directoryPath?: string,
  ): Promise<BulkImportApiResponse> {
    try {
      const response = await fetch('/api/import/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directoryPath,
          conflictStrategy: 'upsert',
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as BulkImportApiResponse;
        if (data.pages && data.pages.length > 0) {
          pages.value = data.pages;
        }
        lastBulkImportReport.value = data;
        return data;
      }
    } catch {
      // Fallback to sample Second Brain batch
    }
    return importMarkdownBulk([], { useSampleSecondBrain: true });
  }

  return {
    pages,
    activePages,
    activePageId,
    activePage,
    darkMode,
    activeSurface,
    editorReadMode,
    rightDrawerMode,
    isCommentsDrawerOpen,
    showEmbeddedDatabase,
    showEmbeddedDiagrams,
    activeDiagramKind,
    pagesWithDatabaseBlock,
    pagesWithDiagramBlock,
    pageComments,
    databaseRows,
    searchQuery,
    searchMode,
    searchResults,
    isSearchDialogOpen,
    isQuickInsightOpen,
    isAiDrawerOpen,
    isMcpModalOpen,
    isImportModalOpen,
    isVersionHistoryModalOpen,
    currentVersion,
    repoUrl,
    versionHistory,
    lastBulkImportReport,
    geminiApiKey,
    nvidiaApiKey,
    aiChatHistory,
    lastSyncSnapshot,
    lastLatencyMs,
    backendConnected,
    pageTree,
    favoritePages,
    deletedPages,
    breadcrumbs,
    slashCommands,
    initializeStore,
    selectPage,
    enableDatabaseBlockForActivePage,
    removeDatabaseBlockFromActivePage,
    enableDiagramBlockForActivePage,
    removeDiagramBlockFromActivePage,
    createPage,
    updateActivePageContent,
    updateActivePageMarkdown,
    updatePageMeta,
    renamePage,
    toggleFavorite,
    duplicatePage,
    movePage,
    isDescendantOf,
    softDeletePage,
    restorePage,
    permanentlyDeletePage,
    emptyTrash,
    submitQuickInsight,
    runSearch,
    askAiAssistant,
    exportMarkdownVault,
    cycleDatabaseRowStatus,
    addDatabaseTaskRow,
    addCommentReply,
    importMarkdownBulk,
    syncServerSecondBrainDirectory,
  };
});
