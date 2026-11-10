import { randomUUID } from 'node:crypto';
import {
  buildPageTree,
  createInitialSeedPages,
  exportPageWithFrontmatter,
  generateDeterministicEmbedding,
  markdownToTiptap,
  searchPagesEngine,
  slugifyTitle,
  tiptapToMarkdown,
  type CreatePageInput,
  type GitSyncSnapshot,
  type MindPage,
  type PageTreeNode,
  type QuickInsightInput,
  type SearchPagesQuery,
  type SearchResultItem,
  type UpdatePageInput,
} from '@mind-hub/shared';

export interface PageRepository {
  listPages(includeDeleted?: boolean): Promise<MindPage[]>;
  getPageTree(): Promise<PageTreeNode[]>;
  getPageById(id: string, includeDeleted?: boolean): Promise<MindPage | null>;
  createPage(input: CreatePageInput): Promise<MindPage>;
  updatePage(id: string, input: UpdatePageInput): Promise<MindPage | null>;
  softDeletePage(id: string): Promise<MindPage | null>;
  restorePage(id: string): Promise<MindPage | null>;
  appendQuickInsight(input: QuickInsightInput): Promise<MindPage>;
  searchPages(
    query: SearchPagesQuery,
    customQueryEmbedding?: ReadonlyArray<number>,
  ): Promise<SearchResultItem[]>;
  exportGitSnapshot(): Promise<GitSyncSnapshot>;
}

export class InMemoryPageRepository implements PageRepository {
  private readonly pages = new Map<string, MindPage>();

  constructor(initialPages?: ReadonlyArray<MindPage>) {
    const seeds = initialPages ?? createInitialSeedPages();
    for (const page of seeds) {
      this.pages.set(page.id, {
        ...page,
        tags: [...page.tags],
        embedding: page.embedding ? [...page.embedding] : null,
      });
    }
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
      : markdownToTiptap(input.contentMarkdown ?? '');
    const contentMarkdown =
      input.contentMarkdown !== undefined
        ? input.contentMarkdown
        : tiptapToMarkdown(contentJson);

    const tags = input.tags ? [...input.tags] : [];
    const embedding = generateDeterministicEmbedding(
      `${title} ${tags.join(' ')} ${contentMarkdown}`,
    );

    const page: MindPage = {
      id,
      slug,
      title,
      icon: input.icon ?? '📄',
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? this.pages.size + 1,
      contentMarkdown,
      contentJson,
      isFavorite: input.isFavorite ?? false,
      isInbox: input.isInbox ?? false,
      tags,
      embedding,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.pages.set(page.id, page);
    return page;
  }

  async updatePage(id: string, input: UpdatePageInput): Promise<MindPage | null> {
    const existing = this.pages.get(id);
    if (!existing || existing.deletedAt !== null) {
      return null;
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
      contentJson = markdownToTiptap(input.contentMarkdown);
    } else if (input.contentJson !== undefined) {
      contentJson = input.contentJson;
      contentMarkdown = tiptapToMarkdown(input.contentJson);
    }

    const updatedTags = input.tags !== undefined ? [...input.tags] : existing.tags;
    const embedding = generateDeterministicEmbedding(
      `${updatedTitle} ${updatedTags.join(' ')} ${contentMarkdown}`,
    );

    const updated: MindPage = {
      ...existing,
      title: updatedTitle,
      slug: updatedSlug,
      icon: input.icon ?? existing.icon,
      parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      contentMarkdown,
      contentJson,
      isFavorite: input.isFavorite ?? existing.isFavorite,
      isInbox: input.isInbox ?? existing.isInbox,
      tags: updatedTags,
      embedding,
      updatedAt: new Date().toISOString(),
    };

    this.pages.set(id, updated);
    return updated;
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
    return deleted;
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
    return restored;
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
    const files = active.map((page) => ({
      path: `${page.slug}.md`,
      pageId: page.id,
      title: page.title,
      markdown: exportPageWithFrontmatter(page),
    }));

    return {
      exportedAt: new Date().toISOString(),
      totalFiles: files.length,
      files,
    };
  }
}
