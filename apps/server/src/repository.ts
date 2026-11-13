import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  buildPageTree,
  computeMarkdownHash,
  computeOkfPagePath,
  createInitialSeedComments,
  createInitialSeedDatabaseTasks,
  createInitialSeedDiagrams,
  createInitialSeedPages,
  exportPageAsOkfMarkdown,
  generateDeterministicEmbedding,
  markdownToMindDoc,
  mindDocToMarkdown,
  resolveAssetStoragePath,
  searchPagesEngine,
  slugifyTitle,
  type AddCommentReplyInput,
  type CreateAssetInput,
  type CreateDatabaseTaskInput,
  type CreatePageCommentInput,
  type CreatePageInput,
  type DatabaseStatus,
  type DatabaseTaskRow,
  type DiagramBlockItem,
  type GitHubSyncHistoryEntry,
  type GitSyncSnapshot,
  type MindAsset,
  type MindPage,
  type PageCommentThread,
  type PageTreeNode,
  type QuickInsightInput,
  type SearchPagesQuery,
  type SearchResultItem,
  type UpdateDatabaseTaskInput,
  type UpdatePageInput,
  type UpsertDiagramInput,
} from '@mind-hub/shared';

export interface StoredSyncConfig {
  id: string;
  provider: 'github';
  repository: string;
  branch: string;
  token: string;
  autoSyncEnabled: boolean;
  debounceSeconds: number;
  lastSyncAt: string | null;
  lastCommitSha: string | null;
  lastError: string | null;
  history: GitHubSyncHistoryEntry[];
  updatedAt: string;
}

export class PageConflictError extends Error {
  readonly code = 'HASH_CONFLICT';
  readonly currentPage: MindPage;

  constructor(currentPage: MindPage) {
    super(`Conflito de versão detectado na página "${currentPage.title}"`);
    this.name = 'PageConflictError';
    this.currentPage = currentPage;
  }
}

export interface DurableStoreSnapshot {
  version: number;
  updatedAt: string;
  pages: MindPage[];
  databaseTasks: DatabaseTaskRow[];
  comments: PageCommentThread[];
  diagrams: DiagramBlockItem[];
  assets?: MindAsset[];
  syncConfig?: StoredSyncConfig | null;
}

export interface PageRepository {
  listPages(includeDeleted?: boolean): Promise<MindPage[]>;
  getPageTree(): Promise<PageTreeNode[]>;
  getPageById(id: string, includeDeleted?: boolean): Promise<MindPage | null>;
  getPageBySlug(slug: string, includeDeleted?: boolean): Promise<MindPage | null>;
  createPage(input: CreatePageInput): Promise<MindPage>;
  updatePage(id: string, input: UpdatePageInput): Promise<MindPage | null>;
  upsertPagesBatch(
    pagesToUpsert: ReadonlyArray<MindPage>,
    conflictStrategy?: 'upsert' | 'skip',
  ): Promise<{ createdCount: number; updatedCount: number; skippedCount: number; pages: MindPage[] }>;
  softDeletePage(id: string): Promise<MindPage | null>;
  permanentlyDeletePage(id: string): Promise<boolean>;
  restorePage(id: string): Promise<MindPage | null>;
  emptyTrash(): Promise<{ deletedCount: number }>;
  appendQuickInsight(input: QuickInsightInput): Promise<MindPage>;
  searchPages(
    query: SearchPagesQuery,
    customQueryEmbedding?: ReadonlyArray<number>,
  ): Promise<SearchResultItem[]>;
  exportGitSnapshot(): Promise<GitSyncSnapshot>;

  // Database Tasks (Table & Kanban Board)
  listDatabaseTasks(includeDeleted?: boolean): Promise<DatabaseTaskRow[]>;
  createDatabaseTask(input: CreateDatabaseTaskInput): Promise<DatabaseTaskRow>;
  updateDatabaseTask(id: string, input: UpdateDatabaseTaskInput): Promise<DatabaseTaskRow | null>;
  cycleDatabaseTaskStatus(id: string): Promise<DatabaseTaskRow | null>;
  softDeleteDatabaseTask(id: string): Promise<DatabaseTaskRow | null>;

  // Page Comments & Replies
  listPageComments(pageId?: string, includeDeleted?: boolean): Promise<PageCommentThread[]>;
  createPageComment(input: CreatePageCommentInput): Promise<PageCommentThread>;
  addCommentReply(threadId: string, input: AddCommentReplyInput): Promise<PageCommentThread | null>;
  softDeletePageComment(threadId: string): Promise<PageCommentThread | null>;

  // Diagrams (Mermaid, Excalidraw, Draw.io)
  listDiagrams(pageId?: string, includeDeleted?: boolean): Promise<DiagramBlockItem[]>;
  upsertDiagram(input: UpsertDiagramInput): Promise<DiagramBlockItem>;
  softDeleteDiagram(id: string): Promise<DiagramBlockItem | null>;

  // Media & Icon Assets stored in repository snapshot/DB
  listAssets(): Promise<MindAsset[]>;
  getAssetById(id: string): Promise<MindAsset | null>;
  getAssetByStoragePath(storagePath: string): Promise<MindAsset | null>;
  createAsset(input: CreateAssetInput): Promise<MindAsset>;
  deleteAsset(id: string): Promise<boolean>;

  // GitHub OKF Sync Configuration & Delta Tracking
  getSyncConfig(): Promise<StoredSyncConfig | null>;
  saveSyncConfig(config: StoredSyncConfig): Promise<StoredSyncConfig>;
  deleteSyncConfig(): Promise<boolean>;
  getPendingSyncCount(): Promise<number>;
  markPagesSynced(pageHashes: ReadonlyMap<string, string>): Promise<void>;
}

export class InMemoryPageRepository implements PageRepository {
  protected readonly pages = new Map<string, MindPage>();
  protected readonly databaseTasks = new Map<string, DatabaseTaskRow>();
  protected readonly comments = new Map<string, PageCommentThread>();
  protected readonly diagrams = new Map<string, DiagramBlockItem>();
  protected readonly assets = new Map<string, MindAsset>();
  protected syncConfig: StoredSyncConfig | null = null;

  constructor(
    initialPages?: ReadonlyArray<MindPage>,
    initialTasks?: ReadonlyArray<DatabaseTaskRow>,
    initialComments?: ReadonlyArray<PageCommentThread>,
    initialDiagrams?: ReadonlyArray<DiagramBlockItem>,
  ) {
    const seeds = initialPages ?? createInitialSeedPages();
    for (const page of seeds) {
      this.pages.set(page.id, {
        ...page,
        tags: [...page.tags],
        embedding: page.embedding ? [...page.embedding] : null,
      });
    }

    const taskSeeds = initialTasks ?? createInitialSeedDatabaseTasks();
    for (const task of taskSeeds) {
      this.databaseTasks.set(task.id, {
        ...task,
        tags: [...task.tags],
        assignees: [...task.assignees],
        deletedAt: task.deletedAt ?? null,
      });
    }

    const commentSeeds = initialComments ?? createInitialSeedComments();
    for (const comment of commentSeeds) {
      this.comments.set(comment.id, {
        ...comment,
        replies: [...comment.replies],
        deletedAt: comment.deletedAt ?? null,
      });
    }

    const diagramSeeds = initialDiagrams ?? createInitialSeedDiagrams();
    for (const diagram of diagramSeeds) {
      this.diagrams.set(diagram.id, {
        ...diagram,
        deletedAt: diagram.deletedAt ?? null,
      });
    }
  }

  protected onMutate(): void {
    // Hook for DurableFilePageRepository subclasses to persist state atomically
  }

  async listPages(includeDeleted = false): Promise<MindPage[]> {
    const result: MindPage[] = [];
    for (const page of this.pages.values()) {
      if (includeDeleted || page.deletedAt === null) {
        result.push(page);
      }
    }
    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPageTree(): Promise<PageTreeNode[]> {
    const active = await this.listPages(false);
    return buildPageTree(active);
  }

  async getPageById(id: string, includeDeleted = false): Promise<MindPage | null> {
    const page = this.pages.get(id);
    if (!page) return null;
    if (!includeDeleted && page.deletedAt !== null) return null;
    return page;
  }

  async getPageBySlug(slug: string, includeDeleted = false): Promise<MindPage | null> {
    const normalized = slug.trim().toLowerCase();
    for (const page of this.pages.values()) {
      if (page.slug.toLowerCase() === normalized) {
        if (!includeDeleted && page.deletedAt !== null) return null;
        return page;
      }
    }
    return null;
  }

  private resolveUniqueSlug(title: string, excludeId?: string): string {
    const base = slugifyTitle(title);
    let candidate = base;
    let counter = 1;
    const all = Array.from(this.pages.values());
    while (all.some((p) => p.id !== excludeId && p.slug === candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    return candidate;
  }

  async createPage(input: CreatePageInput): Promise<MindPage> {
    const now = new Date().toISOString();
    const id = input.id ?? `page-${randomUUID().slice(0, 8)}`;
    const title = input.title.trim() || 'Sem Título';
    const slug = input.slug ?? this.resolveUniqueSlug(title, id);

    const contentJson = input.contentJson
      ? input.contentJson
      : markdownToMindDoc(input.contentMarkdown ?? '');
    const contentMarkdown =
      input.contentMarkdown !== undefined
        ? input.contentMarkdown
        : mindDocToMarkdown(contentJson);

    const tags = input.tags ? [...input.tags] : [];
    const embedding = generateDeterministicEmbedding(
      `${title} ${tags.join(' ')} ${contentMarkdown}`,
    );
    const computedHash =
      input.sourceHash ??
      computeMarkdownHash(
        `${slug}::${title}::${input.icon ?? '📄'}::${input.coverUrl ?? ''}::${tags.join(',')}::${contentMarkdown}`,
      );

    const page: MindPage = {
      id,
      slug,
      title,
      icon: input.icon ?? '📄',
      pageType: input.pageType ?? 'concept',
      description: input.description ?? '',
      coverUrl: input.coverUrl ?? null,
      coverYPosition: input.coverYPosition ?? 50,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? this.pages.size + 1,
      contentMarkdown,
      contentJson,
      isFavorite: input.isFavorite ?? false,
      isInbox: input.isInbox ?? false,
      tags,
      embedding,
      sourcePath: input.sourcePath ?? null,
      sourceHash: computedHash,
      lastSyncedHash: input.lastSyncedHash ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.pages.set(page.id, page);
    this.onMutate();
    return page;
  }

  async updatePage(id: string, input: UpdatePageInput): Promise<MindPage | null> {
    const existing = this.pages.get(id);
    if (!existing || existing.deletedAt !== null) {
      return null;
    }

    if (
      input.expectedHash !== undefined &&
      input.expectedHash !== null &&
      existing.sourceHash &&
      input.expectedHash !== existing.sourceHash
    ) {
      throw new PageConflictError(existing);
    }

    const updatedTitle =
      input.title !== undefined ? input.title.trim() || 'Sem Título' : existing.title;
    const updatedSlug =
      input.title !== undefined && input.title !== existing.title
        ? this.resolveUniqueSlug(updatedTitle, id)
        : existing.slug;

    let contentMarkdown = existing.contentMarkdown;
    let contentJson = existing.contentJson;

    if (input.contentMarkdown !== undefined && input.contentJson !== undefined) {
      contentMarkdown = input.contentMarkdown;
      contentJson = input.contentJson;
    } else if (input.contentMarkdown !== undefined) {
      contentMarkdown = input.contentMarkdown;
      contentJson = markdownToMindDoc(input.contentMarkdown);
    } else if (input.contentJson !== undefined) {
      contentJson = input.contentJson;
      contentMarkdown = mindDocToMarkdown(input.contentJson);
    }

    const updatedTags = input.tags !== undefined ? [...input.tags] : existing.tags;
    const updatedIcon = input.icon ?? existing.icon;
    const updatedCoverUrl =
      input.coverUrl !== undefined ? input.coverUrl : (existing.coverUrl ?? null);
    const updatedCoverY =
      input.coverYPosition !== undefined ? input.coverYPosition : (existing.coverYPosition ?? 50);
    const embedding = generateDeterministicEmbedding(
      `${updatedTitle} ${updatedTags.join(' ')} ${contentMarkdown}`,
    );

    const nextSourceHash =
      input.sourceHash !== undefined
        ? input.sourceHash
        : computeMarkdownHash(
            `${updatedSlug}::${updatedTitle}::${updatedIcon}::${updatedCoverUrl ?? ''}::${updatedTags.join(',')}::${contentMarkdown}`,
          );

    const updated: MindPage = {
      ...existing,
      title: updatedTitle,
      slug: updatedSlug,
      icon: updatedIcon,
      pageType: input.pageType ?? existing.pageType ?? 'concept',
      description: input.description !== undefined ? input.description : (existing.description ?? ''),
      coverUrl: updatedCoverUrl,
      coverYPosition: updatedCoverY,
      parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      contentMarkdown,
      contentJson,
      isFavorite: input.isFavorite ?? existing.isFavorite,
      isInbox: input.isInbox ?? existing.isInbox,
      tags: updatedTags,
      embedding,
      sourcePath: input.sourcePath !== undefined ? input.sourcePath : existing.sourcePath,
      sourceHash: nextSourceHash,
      lastSyncedHash:
        input.lastSyncedHash !== undefined ? input.lastSyncedHash : (existing.lastSyncedHash ?? null),
      updatedAt: new Date().toISOString(),
    };

    this.pages.set(id, updated);
    this.onMutate();
    return updated;
  }

  async upsertPagesBatch(
    pagesToUpsert: ReadonlyArray<MindPage>,
    conflictStrategy: 'upsert' | 'skip' = 'upsert',
  ): Promise<{ createdCount: number; updatedCount: number; skippedCount: number; pages: MindPage[] }> {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const resultPages: MindPage[] = [];

    for (const candidate of pagesToUpsert) {
      const existingById = this.pages.get(candidate.id);
      const existingByPath = candidate.sourcePath
        ? Array.from(this.pages.values()).find((p) => p.sourcePath === candidate.sourcePath)
        : undefined;
      const existingBySlug = Array.from(this.pages.values()).find(
        (p) => p.slug === candidate.slug && p.parentId === candidate.parentId,
      );

      const existing = existingById ?? existingByPath ?? existingBySlug;

      if (existing) {
        if (
          conflictStrategy === 'skip' ||
          (candidate.sourceHash && existing.sourceHash === candidate.sourceHash && existing.deletedAt === null)
        ) {
          skippedCount += 1;
          resultPages.push(existing);
          continue;
        }

        const merged: MindPage = {
          ...existing,
          title: candidate.title,
          icon: candidate.icon,
          parentId: candidate.parentId,
          sortOrder: candidate.sortOrder,
          contentMarkdown: candidate.contentMarkdown,
          contentJson: candidate.contentJson,
          tags: [...candidate.tags],
          embedding: candidate.embedding ? [...candidate.embedding] : existing.embedding,
          sourcePath: candidate.sourcePath ?? existing.sourcePath ?? null,
          sourceHash: candidate.sourceHash ?? existing.sourceHash ?? null,
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };
        this.pages.set(existing.id, merged);
        updatedCount += 1;
        resultPages.push(merged);
      } else {
        const uniqueSlug = this.resolveUniqueSlug(candidate.title, candidate.id);
        const created: MindPage = {
          ...candidate,
          slug: uniqueSlug,
          tags: [...candidate.tags],
          embedding: candidate.embedding ? [...candidate.embedding] : null,
          deletedAt: null,
        };
        this.pages.set(created.id, created);
        createdCount += 1;
        resultPages.push(created);
      }
    }

    if (createdCount > 0 || updatedCount > 0) {
      this.onMutate();
    }

    return {
      createdCount,
      updatedCount,
      skippedCount,
      pages: resultPages,
    };
  }

  async softDeletePage(id: string): Promise<MindPage | null> {
    const existing = this.pages.get(id);
    if (!existing || existing.deletedAt !== null) {
      return null;
    }

    const now = new Date().toISOString();
    const deleted: MindPage = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
    };

    this.pages.set(id, deleted);
    this.onMutate();
    return deleted;
  }

  async permanentlyDeletePage(id: string): Promise<boolean> {
    const existing = this.pages.get(id);
    if (!existing) {
      return false;
    }
    const removed = this.pages.delete(id);
    if (removed) {
      this.onMutate();
    }
    return removed;
  }

  async restorePage(id: string): Promise<MindPage | null> {
    const existing = this.pages.get(id);
    if (!existing || existing.deletedAt === null) {
      return null;
    }

    const restored: MindPage = {
      ...existing,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    this.pages.set(id, restored);
    this.onMutate();
    return restored;
  }

  async emptyTrash(): Promise<{ deletedCount: number }> {
    let deletedCount = 0;
    for (const [id, page] of this.pages.entries()) {
      if (page.deletedAt !== null) {
        this.pages.delete(id);
        deletedCount += 1;
      }
    }
    if (deletedCount > 0) {
      this.onMutate();
    }
    return { deletedCount };
  }

  async appendQuickInsight(input: QuickInsightInput): Promise<MindPage> {
    const text = input.text.trim();
    if (!text) {
      throw new Error('Quick insight text cannot be empty');
    }

    let inbox = Array.from(this.pages.values()).find(
      (p) => p.isInbox && p.deletedAt === null,
    );

    if (!inbox) {
      inbox = await this.createPage({
        id: 'page-inbox',
        title: 'Inbox & Insights Rápidos',
        icon: '📥',
        isInbox: true,
        isFavorite: true,
        tags: ['inbox', 'captura-rapida'],
        contentMarkdown: '# Caixa de Entrada (Inbox Livre)\n',
      });
    }

    const timestamp = new Date().toISOString().slice(11, 16);
    const appendedMarkdown = `${inbox.contentMarkdown.trimEnd()}\n- [ ] ${text} _(${timestamp} UTC)_`;
    const mergedTags = input.tags
      ? Array.from(new Set([...inbox.tags, ...input.tags]))
      : inbox.tags;

    const updated = await this.updatePage(inbox.id, {
      contentMarkdown: appendedMarkdown,
      tags: mergedTags,
    });

    if (!updated) {
      throw new Error('Failed to append insight to Inbox');
    }
    return updated;
  }

  async searchPages(
    query: SearchPagesQuery,
    customQueryEmbedding?: ReadonlyArray<number>,
  ): Promise<SearchResultItem[]> {
    const allPages = Array.from(this.pages.values());
    return searchPagesEngine(allPages, query, customQueryEmbedding);
  }

  async exportGitSnapshot(): Promise<GitSyncSnapshot> {
    const active = await this.listPages(false);
    const assets = await this.listAssets();
    const files = active.map((page) => ({
      path: page.sourcePath ?? computeOkfPagePath(page, active),
      pageId: page.id,
      title: page.title,
      markdown: exportPageAsOkfMarkdown(page, active, assets),
    }));

    return {
      exportedAt: new Date().toISOString(),
      totalFiles: files.length,
      files,
    };
  }

  // =========================================================================
  // DATABASE TASKS (TABLE & KANBAN BOARD)
  // =========================================================================

  async listDatabaseTasks(includeDeleted = false): Promise<DatabaseTaskRow[]> {
    const result: DatabaseTaskRow[] = [];
    for (const row of this.databaseTasks.values()) {
      if (includeDeleted || !row.deletedAt) {
        result.push(row);
      }
    }
    return result.sort((a, b) => a.rowNumber - b.rowNumber);
  }

  async createDatabaseTask(input: CreateDatabaseTaskInput): Promise<DatabaseTaskRow> {
    const nextRowNumber = this.databaseTasks.size + 1;
    const id = input.id ?? `task-${randomUUID().slice(0, 8)}`;
    const row: DatabaseTaskRow = {
      id,
      rowNumber: nextRowNumber,
      task: input.task.trim() || `New Roadmap Task #${nextRowNumber}`,
      team: input.team ?? { label: 'Product', tone: 'gray' },
      tags: input.tags ? [...input.tags] : [{ label: 'Feature', tone: 'blue' }],
      assignees: input.assignees ? [...input.assignees] : ['Philip'],
      dueDate: input.dueDate ?? 'Oct 15, 2026',
      dueDateIso: input.dueDateIso ?? '2026-10-15',
      budget: input.budget ?? 7500,
      effort: input.effort ?? 2,
      status: input.status ?? 'Backlog',
      priority: input.priority ?? 'Medium',
      deletedAt: null,
    };
    this.databaseTasks.set(row.id, row);
    this.onMutate();
    return row;
  }

  async updateDatabaseTask(
    id: string,
    input: UpdateDatabaseTaskInput,
  ): Promise<DatabaseTaskRow | null> {
    const existing = this.databaseTasks.get(id);
    if (!existing || existing.deletedAt) return null;

    const updated: DatabaseTaskRow = {
      ...existing,
      task: input.task !== undefined ? input.task.trim() || existing.task : existing.task,
      team: input.team ?? existing.team,
      tags: input.tags ? [...input.tags] : existing.tags,
      assignees: input.assignees ? [...input.assignees] : existing.assignees,
      dueDate: input.dueDate ?? existing.dueDate,
      dueDateIso: input.dueDateIso ?? existing.dueDateIso,
      budget: input.budget ?? existing.budget,
      effort: input.effort ?? existing.effort,
      status: input.status ?? existing.status,
      priority: input.priority ?? existing.priority,
    };

    this.databaseTasks.set(id, updated);
    this.onMutate();
    return updated;
  }

  async cycleDatabaseTaskStatus(id: string): Promise<DatabaseTaskRow | null> {
    const existing = this.databaseTasks.get(id);
    if (!existing || existing.deletedAt) return null;

    const order: DatabaseStatus[] = [
      'Backlog',
      'In Progress',
      'In Review',
      'Blocked',
      'Done',
    ];
    const currentIndex = order.indexOf(existing.status);
    const nextStatus = order[(currentIndex + 1) % order.length] ?? 'Backlog';

    const updated: DatabaseTaskRow = {
      ...existing,
      status: nextStatus,
    };

    this.databaseTasks.set(id, updated);
    this.onMutate();
    return updated;
  }

  async softDeleteDatabaseTask(id: string): Promise<DatabaseTaskRow | null> {
    const existing = this.databaseTasks.get(id);
    if (!existing || existing.deletedAt) return null;

    const deleted: DatabaseTaskRow = {
      ...existing,
      deletedAt: new Date().toISOString(),
    };
    this.databaseTasks.set(id, deleted);
    this.onMutate();
    return deleted;
  }

  // =========================================================================
  // PAGE COMMENTS & THREAD REPLIES
  // =========================================================================

  async listPageComments(
    pageId?: string,
    includeDeleted = false,
  ): Promise<PageCommentThread[]> {
    const result: PageCommentThread[] = [];
    for (const thread of this.comments.values()) {
      if (!includeDeleted && thread.deletedAt) continue;
      if (pageId && thread.pageId !== pageId) continue;
      result.push(thread);
    }
    return result;
  }

  async createPageComment(input: CreatePageCommentInput): Promise<PageCommentThread> {
    const authorName = input.authorName?.trim() || 'Philip';
    const authorInitials =
      input.authorInitials?.trim() ||
      authorName
        .split(' ')
        .map((part) => part[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const thread: PageCommentThread = {
      id: `thread-${randomUUID().slice(0, 8)}`,
      pageId: input.pageId,
      authorName,
      authorInitials,
      createdAtLabel: 'Just now',
      quotedText: input.quotedText.trim(),
      body: input.body.trim(),
      replies: [],
      deletedAt: null,
    };

    this.comments.set(thread.id, thread);
    this.onMutate();
    return thread;
  }

  async addCommentReply(
    threadId: string,
    input: AddCommentReplyInput,
  ): Promise<PageCommentThread | null> {
    const existing = this.comments.get(threadId);
    if (!existing || existing.deletedAt) return null;

    const authorName = input.authorName?.trim() || 'Philip';
    const authorInitials =
      input.authorInitials?.trim() ||
      authorName
        .split(' ')
        .map((part) => part[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const updated: PageCommentThread = {
      ...existing,
      replies: [
        ...existing.replies,
        {
          id: `reply-${randomUUID().slice(0, 8)}`,
          authorName,
          authorInitials,
          createdAtLabel: 'Just now',
          body: input.body.trim(),
        },
      ],
    };

    this.comments.set(threadId, updated);
    this.onMutate();
    return updated;
  }

  async softDeletePageComment(threadId: string): Promise<PageCommentThread | null> {
    const existing = this.comments.get(threadId);
    if (!existing || existing.deletedAt) return null;

    const deleted: PageCommentThread = {
      ...existing,
      deletedAt: new Date().toISOString(),
    };
    this.comments.set(threadId, deleted);
    this.onMutate();
    return deleted;
  }

  // =========================================================================
  // DIAGRAMS (MERMAID, EXCALIDRAW, DRAW.IO)
  // =========================================================================

  async listDiagrams(pageId?: string, includeDeleted = false): Promise<DiagramBlockItem[]> {
    const result: DiagramBlockItem[] = [];
    for (const diag of this.diagrams.values()) {
      if (!includeDeleted && diag.deletedAt) continue;
      if (pageId && diag.pageId !== pageId) continue;
      result.push(diag);
    }
    return result;
  }

  async upsertDiagram(input: UpsertDiagramInput): Promise<DiagramBlockItem> {
    const now = new Date().toISOString();
    const id = input.id ?? `diag-${input.kind}-${randomUUID().slice(0, 6)}`;
    const existing = this.diagrams.get(id);

    const record: DiagramBlockItem = {
      id,
      pageId: input.pageId,
      kind: input.kind,
      title: input.title.trim() || existing?.title || `${input.kind} diagram`,
      mermaidCode: input.mermaidCode ?? existing?.mermaidCode,
      excalidrawZoom: input.excalidrawZoom ?? existing?.excalidrawZoom,
      excalidrawShapes: input.excalidrawShapes ?? existing?.excalidrawShapes,
      drawioNodes: input.drawioNodes ?? existing?.drawioNodes,
      drawioXml: input.drawioXml ?? existing?.drawioXml,
      updatedAt: now,
      deletedAt: null,
    };

    this.diagrams.set(id, record);
    this.onMutate();
    return record;
  }

  async softDeleteDiagram(id: string): Promise<DiagramBlockItem | null> {
    const existing = this.diagrams.get(id);
    if (!existing || existing.deletedAt) return null;

    const deleted: DiagramBlockItem = {
      ...existing,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.diagrams.set(id, deleted);
    this.onMutate();
    return deleted;
  }

  async listAssets(): Promise<MindAsset[]> {
    return Array.from(this.assets.values());
  }

  async getAssetById(id: string): Promise<MindAsset | null> {
    return this.assets.get(id) ?? null;
  }

  async getAssetByStoragePath(storagePath: string): Promise<MindAsset | null> {
    const normalized = storagePath.replace(/^\.?\//, '');
    for (const asset of this.assets.values()) {
      const candidate = resolveAssetStoragePath(asset);
      if (candidate === normalized || candidate.endsWith(`/${normalized}`)) {
        return asset;
      }
    }
    return null;
  }

  async createAsset(input: CreateAssetInput): Promise<MindAsset> {
    const id = input.id?.trim() || `asset-${randomUUID()}`;
    const cleanBase64 = input.dataBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const sizeBytes = Buffer.byteLength(cleanBase64, 'base64');
    const filename = input.filename.trim() || `${id}.bin`;
    const kind = input.kind ?? 'inline_image';
    const baseAsset: MindAsset = {
      id,
      pageId: input.pageId ?? null,
      kind,
      filename,
      mimeType: input.mimeType.trim(),
      dataBase64: cleanBase64,
      sizeBytes,
      url: `/api/assets/${encodeURIComponent(id)}`,
      createdAt: new Date().toISOString(),
    };
    baseAsset.storagePath = resolveAssetStoragePath(baseAsset);
    this.assets.set(id, baseAsset);
    this.onMutate();
    return baseAsset;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const existed = this.assets.delete(id);
    if (existed) {
      this.onMutate();
    }
    return existed;
  }

  async getSyncConfig(): Promise<StoredSyncConfig | null> {
    return this.syncConfig;
  }

  async saveSyncConfig(config: StoredSyncConfig): Promise<StoredSyncConfig> {
    this.syncConfig = { ...config, history: [...config.history] };
    this.onMutate();
    return this.syncConfig;
  }

  async deleteSyncConfig(): Promise<boolean> {
    const had = this.syncConfig !== null;
    this.syncConfig = null;
    if (had) {
      this.onMutate();
    }
    return had;
  }

  async getPendingSyncCount(): Promise<number> {
    let count = 0;
    for (const page of this.pages.values()) {
      if (page.deletedAt !== null) continue;
      if (!page.lastSyncedHash || page.sourceHash !== page.lastSyncedHash) {
        count += 1;
      }
    }
    return count;
  }

  async markPagesSynced(pageHashes: ReadonlyMap<string, string>): Promise<void> {
    let mutated = false;
    for (const [pageId, syncedHash] of pageHashes.entries()) {
      const existing = this.pages.get(pageId);
      if (existing) {
        this.pages.set(pageId, {
          ...existing,
          lastSyncedHash: syncedHash,
        });
        mutated = true;
      }
    }
    if (mutated) {
      this.onMutate();
    }
  }
}

export class DurableFilePageRepository extends InMemoryPageRepository {
  private readonly filePath: string;
  private isHydrating = false;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
    this.hydrateFromDisk();
  }

  private hydrateFromDisk(): void {
    this.isHydrating = true;
    try {
      if (!existsSync(this.filePath)) {
        this.persistToDisk();
        return;
      }

      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DurableStoreSnapshot>;

      if (Array.isArray(parsed.pages)) {
        this.pages.clear();
        for (const p of parsed.pages) {
          this.pages.set(p.id, p);
        }
      }

      if (Array.isArray(parsed.databaseTasks)) {
        this.databaseTasks.clear();
        for (const t of parsed.databaseTasks) {
          this.databaseTasks.set(t.id, t);
        }
      }

      if (Array.isArray(parsed.comments)) {
        this.comments.clear();
        for (const c of parsed.comments) {
          this.comments.set(c.id, c);
        }
      }

      if (Array.isArray(parsed.diagrams)) {
        this.diagrams.clear();
        for (const d of parsed.diagrams) {
          this.diagrams.set(d.id, d);
        }
      }

      if (Array.isArray(parsed.assets)) {
        this.assets.clear();
        for (const a of parsed.assets) {
          this.assets.set(a.id, a);
        }
      }

      if (parsed.syncConfig) {
        this.syncConfig = parsed.syncConfig;
      }
    } catch {
      // If snapshot is corrupted or unreadable, keep seed state and overwrite cleanly on next mutation
    } finally {
      this.isHydrating = false;
    }
  }

  private persistToDisk(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const snapshot: DurableStoreSnapshot = {
        version: 1,
        updatedAt: new Date().toISOString(),
        pages: Array.from(this.pages.values()),
        databaseTasks: Array.from(this.databaseTasks.values()),
        comments: Array.from(this.comments.values()),
        diagrams: Array.from(this.diagrams.values()),
        assets: Array.from(this.assets.values()),
        syncConfig: this.syncConfig,
      };

      const tmpPath = `${this.filePath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8');
      renameSync(tmpPath, this.filePath);
    } catch {
      // Non-fatal in read-only test environments
    }
  }

  protected override onMutate(): void {
    if (!this.isHydrating) {
      this.persistToDisk();
    }
  }
}
