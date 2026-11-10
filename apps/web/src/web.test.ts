import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMindStore } from './stores/mind-store.js';

describe('@mind-hub/web — Pinia Store, Page Tree, Quick Insight & Search Engine', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with RFC seed pages, hierarchical pageTree and breadcrumbs', () => {
    const store = useMindStore();
    expect(store.activePages.length).toBe(4);
    expect(store.pageTree.length).toBe(2);
    expect(store.activePage?.id).toBe('page-manifesto');

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
});
