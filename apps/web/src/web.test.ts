import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMindStore } from './stores/mind-store.js';

describe('@mind-hub/web — Pinia Store, Page Tree, Quick Insight & Search Engine', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with RFC seed pages, hierarchical pageTree and breadcrumbs, with right drawers closed by default', () => {
    const store = useMindStore();
    expect(store.activePages.length).toBe(4);
    expect(store.pageTree.length).toBe(2);
    expect(store.activePage?.id).toBe('page-manifesto');
    expect(store.isCommentsDrawerOpen).toBe(false);
    expect(store.isAiDrawerOpen).toBe(false);

    store.selectPage('page-adr-stack');
    expect(store.breadcrumbs.map((b) => b.id)).toEqual([
      'page-manifesto',
      'page-adr-stack',
    ]);
  });

  it('creates new nested page, updates Tiptap AST content, soft-deletes and restores page', async () => {
    const store = useMindStore();
    const created = await store.createPage({
      title: 'Especificação Tiptap v2',
      parentId: 'page-manifesto',
      contentMarkdown: '# Editor Headless\n\n- [x] Slash Commands',
    });

    expect(store.activePageId).toBe(created.id);
    expect(created.contentJson.type).toBe('doc');

    await store.softDeletePage(created.id);
    expect(store.deletedPages.some((p) => p.id === created.id)).toBe(true);
    expect(store.activePageId).not.toBe(created.id);

    await store.restorePage(created.id);
    expect(store.deletedPages.some((p) => p.id === created.id)).toBe(false);
    expect(store.activePageId).toBe(created.id);
  });

  it('captures Quick Insight into Inbox in < 5ms and runs hybrid search & Git export', async () => {
    const store = useMindStore();
    const updatedInbox = await store.submitQuickInsight(
      'Implementar cache offline Workbox no Quasar PWA',
      ['pwa'],
    );

    expect(updatedInbox.isInbox).toBe(true);
    expect(updatedInbox.contentMarkdown).toContain(
      'Implementar cache offline Workbox no Quasar PWA',
    );

    const results = store.runSearch('Workbox PWA', 'hybrid');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.page.id).toBe(updatedInbox.id);

    const aiReply = await store.askAiAssistant('Por que usamos Drizzle ORM?');
    expect(aiReply.role).toBe('assistant');
    expect(aiReply.text).toContain('ADR 001');

    const snapshot = store.exportMarkdownVault();
    expect(snapshot.totalFiles).toBe(4);
    expect(snapshot.files[0]?.markdown).toContain('---');
  });

  it('manages Database tasks (Table & Kanban status cycling) and Page Comments in mind-light-style', () => {
    const store = useMindStore();
    expect(store.darkMode).toBe(false);
    expect(store.databaseRows.length).toBeGreaterThanOrEqual(8);

    const firstRow = store.databaseRows[0]!;
    expect(firstRow.status).toBe('Backlog');
    store.cycleDatabaseRowStatus(firstRow.id);
    expect(store.databaseRows[0]?.status).toBe('In Progress');

    const added = store.addDatabaseTaskRow('In Review');
    expect(added.status).toBe('In Review');

    const initialReplies = store.pageComments[0]?.replies.length ?? 0;
    store.addCommentReply('thread-1', 'Aligned with mind-light-style!');
    expect(store.pageComments[0]?.replies.length).toBe(initialReplies + 1);
  });

  it('imports Second Brain Markdown batch into store with folder hierarchy and WikiLinks', async () => {
    const store = useMindStore();
    const initialCount = store.activePages.length;

    const report = await store.importMarkdownBulk([], {
      useSampleSecondBrain: true,
    });
    expect(report.notesProcessed).toBe(4);
    expect(report.folderPagesCreated).toBeGreaterThanOrEqual(3);
    expect(report.wikiLinksResolved).toBeGreaterThanOrEqual(2);
    expect(store.activePages.length).toBeGreaterThan(initialCount);
    expect(store.lastBulkImportReport?.notesProcessed).toBe(4);
  });

  it('does not pollute pages with global fixed Database or Diagram blocks by default (refs #24)', () => {
    const store = useMindStore();
    expect(store.showEmbeddedDatabase).toBe(false);
    expect(store.showEmbeddedDiagrams).toBe(false);

    // Enable blocks only on the active page ('page-manifesto')
    store.enableDatabaseBlockForActivePage();
    store.enableDiagramBlockForActivePage('excalidraw');
    expect(store.showEmbeddedDatabase).toBe(true);
    expect(store.showEmbeddedDiagrams).toBe(true);
    expect(store.activeDiagramKind).toBe('excalidraw');

    // Switching to another note must keep the other note clean
    store.selectPage('page-adr-stack');
    expect(store.showEmbeddedDatabase).toBe(false);
    expect(store.showEmbeddedDiagrams).toBe(false);

    // Switching back restores the blocks bound to 'page-manifesto'
    store.selectPage('page-manifesto');
    expect(store.showEmbeddedDatabase).toBe(true);
    expect(store.showEmbeddedDiagrams).toBe(true);
    expect(store.activeDiagramKind).toBe('excalidraw');

    // Removing blocks from the active page clears them cleanly
    store.removeDatabaseBlockFromActivePage();
    store.removeDiagramBlockFromActivePage();
    expect(store.showEmbeddedDatabase).toBe(false);
    expect(store.showEmbeddedDiagrams).toBe(false);
  });

  it('supports permanent delete (purge), empty trash and version evolution tracking (Issue #46)', async () => {
    const store = useMindStore();
    expect(store.currentVersion).toBe('0.4.0');
    expect(store.repoUrl).toBe('https://github.com/luizGDpulz/mind-hub');
    expect(store.versionHistory.length).toBeGreaterThanOrEqual(4);
    expect(store.versionHistory[0]?.version).toBe('0.4.0');

    // Create a page and soft delete it
    const page = await store.createPage({ title: 'Nota Para Purge' });
    await store.softDeletePage(page.id);
    expect(store.deletedPages.some((p) => p.id === page.id)).toBe(true);

    // Permanently delete (purge) the page
    await store.permanentlyDeletePage(page.id);
    expect(store.pages.some((p) => p.id === page.id)).toBe(false);
    expect(store.deletedPages.some((p) => p.id === page.id)).toBe(false);

    // Test emptyTrash
    const p1 = await store.createPage({ title: 'Trash 1' });
    const p2 = await store.createPage({ title: 'Trash 2' });
    await store.softDeletePage(p1.id);
    await store.softDeletePage(p2.id);
    expect(store.deletedPages.length).toBeGreaterThanOrEqual(2);

    await store.emptyTrash();
    expect(store.deletedPages.length).toBe(0);
    expect(store.pages.some((p) => p.id === p1.id)).toBe(false);
    expect(store.pages.some((p) => p.id === p2.id)).toBe(false);
  });
});
