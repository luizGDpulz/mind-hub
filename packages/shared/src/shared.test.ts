import { describe, expect, it } from 'vitest';
import {
  buildPageTree,
  cosineSimilarity,
  createInitialSeedPages,
  createSampleSecondBrainBatch,
  DEFAULT_SLASH_COMMANDS,
  exportPageWithFrontmatter,
  extractPlainText,
  flattenPageTree,
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
  computeOkfPagePath,
  exportPageAsOkfMarkdown,
  generateOkfRootIndex,
  generateOkfLogMarkdown,
} from './index.js';

describe('@mind-hub/shared — Markdown <-> Tiptap AST & Domain Engine', () => {
  it('converts Markdown with headings, tasks, lists, code, tables and quotes to Tiptap AST and back', () => {
    const sampleMd = [
      '# Título Principal',
      '',
      'Parágrafo com **negrito**, *itálico*, `código` e ~~riscado~~.',
      '',
      '- [x] Tarefa concluída',
      '- [ ] Tarefa pendente',
      '',
      '- Item de lista 1',
      '- Item de lista 2',
      '',
      '```typescript',
      'const latency = 1;',
      '```',
      '',
      '| Stack | Latência |',
      '| --- | --- |',
      '| Fastify + Drizzle | < 1ms |',
      '',
      '> Decisão arquitetural sólida',
      '',
      '---',
    ].join('\n');

    const ast = markdownToTiptap(sampleMd);
    expect(ast.type).toBe('doc');
    expect(ast.content.some((n) => n.type === 'heading')).toBe(true);
    expect(ast.content.some((n) => n.type === 'taskList')).toBe(true);
    expect(ast.content.some((n) => n.type === 'bulletList')).toBe(true);
    expect(ast.content.some((n) => n.type === 'codeBlock')).toBe(true);
    expect(ast.content.some((n) => n.type === 'table')).toBe(true);
    expect(ast.content.some((n) => n.type === 'blockquote')).toBe(true);
    expect(ast.content.some((n) => n.type === 'horizontalRule')).toBe(true);

    const roundtrip = tiptapToMarkdown(ast);
    expect(roundtrip).toContain('# Título Principal');
    expect(roundtrip).toContain('**negrito**');
    expect(roundtrip).toContain('- [x] Tarefa concluída');
    expect(roundtrip).toContain('- [ ] Tarefa pendente');
    expect(roundtrip).toContain('Fastify + Drizzle');
    expect(roundtrip).toContain('> Decisão arquitetural sólida');

    const plain = extractPlainText(ast);
    expect(plain).toContain('Título Principal');
    expect(plain).toContain('Fastify + Drizzle');
  });

  it('renders callout alerts in Markdown with semantic icons for NOTE, TIP, WARNING, IMPORTANT', () => {
    const calloutMd = [
      '> [!NOTE] Informação de contexto',
      '',
      '> [!TIP] Dica de otimização de cache',
      '',
      '> [!WARNING] Atenção ao soft delete',
      '',
      '> [!IMPORTANT] Passo obrigatório',
    ].join('\n');

    const ast = markdownToTiptap(calloutMd);
    expect(ast.content.length).toBe(4);
    const plain = extractPlainText(ast);
    expect(plain).toContain('ℹ️ [NOTE] Informação de contexto');
    expect(plain).toContain('💡 [TIP] Dica de otimização de cache');
    expect(plain).toContain('⚠️ [WARNING] Atenção ao soft delete');
    expect(plain).toContain('📌 [IMPORTANT] Passo obrigatório');
  });

  it('slugifies Portuguese titles removing accents and handling edge cases', () => {
    expect(slugifyTitle('Mind Hub — Gestão & Soberania!')).toBe('mind-hub-gestao-soberania');
    expect(slugifyTitle('   ')).toBe('sem-titulo');
  });

  it('builds hierarchical page tree, flattens it, and resolves breadcrumbs while filtering soft-deleted pages', () => {
    const pages = createInitialSeedPages();
    expect(pages.length).toBe(2);
    expect(pages.every((p) => p.icon === '')).toBe(true);

    const deletedPage = {
      ...pages[0]!,
      id: 'page-deleted',
      title: 'Página Excluída',
      deletedAt: '2026-11-10T19:00:00.000Z',
    };

    const tree = buildPageTree([...pages, deletedPage]);
    expect(tree.length).toBe(1);
    const rootNode = tree.find((n) => n.id === 'page-teste');
    expect(rootNode).toBeDefined();
    expect(rootNode?.children.length).toBe(1);

    const flat = flattenPageTree(tree);
    expect(flat.length).toBe(2);
    const innerEntry = flat.find((f) => f.page.id === 'page-teste-interno');
    expect(innerEntry?.depth).toBe(1);

    const crumbs = getPageBreadcrumbs(pages, 'page-teste-interno');
    expect(crumbs.map((c) => c.id)).toEqual(['page-teste', 'page-teste-interno']);
  });

  it('computes deterministic embeddings and ranks search results in text, semantic, and hybrid modes', () => {
    const vec1 = generateDeterministicEmbedding('Fastify Drizzle PostgreSQL pgvector');
    const vec2 = generateDeterministicEmbedding('Fastify Drizzle SQL performance');
    const vec3 = generateDeterministicEmbedding('Receita de bolo de chocolate caseiro');

    expect(cosineSimilarity(vec1, vec1)).toBeCloseTo(1, 3);
    expect(cosineSimilarity(vec1, vec2)).toBeGreaterThan(cosineSimilarity(vec1, vec3));

    const pages = createInitialSeedPages();
    const hybridResults = searchPagesEngine(pages, {
      query: 'Frase de destaque Tabela',
      mode: 'hybrid',
    });
    expect(hybridResults.length).toBeGreaterThan(0);
    expect(hybridResults[0]?.page.id).toBe('page-teste');

    const semanticResults = searchPagesEngine(pages, {
      query: 'subpagina interna exemplo',
      mode: 'semantic',
    });
    expect(semanticResults.length).toBeGreaterThan(0);
  });

  it('exports page with clean YAML frontmatter for Git sovereignty and provides default slash commands', () => {
    const pages = createInitialSeedPages();
    const exported = exportPageWithFrontmatter(pages[0]!);
    expect(exported).toContain('---\nid: page-teste');
    expect(exported).toContain('\n# Nota de Testes\n');
    expect(DEFAULT_SLASH_COMMANDS.length).toBeGreaterThanOrEqual(8);
  });

  it('plans bulk Second Brain Markdown import with YAML Frontmatter, nested folder hierarchy and WikiLinks', () => {
    const sampleBatch = createSampleSecondBrainBatch();
    const plan = planBulkVaultImport(sampleBatch);

    expect(plan.notesProcessed).toBe(4);
    expect(plan.folderPagesCreated).toBeGreaterThanOrEqual(3);
    expect(plan.wikiLinksResolved).toBeGreaterThanOrEqual(2);
    expect(plan.discoveredTags).toContain('soft-delete');
    expect(plan.discoveredTags).toContain('mind-light-style');

    const softDeletePage = plan.pagesToUpsert.find((p) =>
      p.title.includes('Soft Delete Universal'),
    );
    expect(softDeletePage).toBeDefined();
    expect(softDeletePage?.icon).toBe('🛡️');
    expect(softDeletePage?.parentId).toBe('folder-padroes');
    expect(softDeletePage?.contentMarkdown).toContain('(#/page/mind-hub)');
  });

  it('exposes versioning configuration, release history and repository URL', () => {
    expect(CURRENT_MIND_VERSION).toBe('0.5.0');
    expect(MIND_REPO_URL).toBe('https://github.com/luizGDpulz/mind-hub');
    expect(MIND_VERSION_HISTORY.length).toBeGreaterThanOrEqual(5);
    expect(MIND_VERSION_HISTORY[0].version).toBe('0.5.0');
    expect(MIND_VERSION_HISTORY[0].highlights.length).toBeGreaterThan(0);
  });

  it('converts Notion-like subpageBlock nodes bidirectionally between Markdown and Tiptap AST', () => {
    const md = [
      '# Secullum',
      '',
      '[📅 Calendário Secullum](#/page/page-cal) <!-- mind:subpage id="page-cal" icon="📅" color="purple" -->',
      '[subpage: Ponto](./ponto.md){color="blue"}',
    ].join('\n');

    const doc = markdownToTiptap(md);
    const subpages = doc.content.filter((n) => n.type === 'subpageBlock');
    expect(subpages).toHaveLength(2);
    expect(subpages[0]?.attrs?.pageId).toBe('page-cal');
    expect(subpages[0]?.attrs?.icon).toBe('📅');
    expect(subpages[0]?.attrs?.color).toBe('purple');
    expect(subpages[1]?.attrs?.title).toBe('Ponto');
    expect(subpages[1]?.attrs?.color).toBe('blue');

    const backToMd = tiptapToMarkdown(doc);
    expect(backToMd).toContain('[📅 Calendário Secullum](#/page/page-cal) <!-- mind:subpage id="page-cal" icon="📅" color="purple" -->');
  });

  it('exports pages in Google Open Knowledge Format (OKF v0.2) with index.md folders and relative assets', () => {
    const now = '2026-11-13T18:00:00Z';
    const parentPage = {
      id: 'page-secullum',
      slug: 'secullum',
      title: 'Secullum',
      icon: '☀️',
      coverUrl: '/api/assets/asset-cover-1',
      coverYPosition: 35,
      parentId: null,
      sortOrder: 1,
      contentMarkdown: '[📅 Calendário](#/page/page-cal) <!-- mind:subpage id="page-cal" icon="📅" color="purple" -->\n\n![Rede](/api/assets/asset-img-1)',
      contentJson: { type: 'doc' as const, content: [] },
      isFavorite: true,
      isInbox: false,
      tags: ['trabalho', 'secullum'],
      embedding: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const childPage = {
      ...parentPage,
      id: 'page-cal',
      slug: 'calendario',
      title: 'Calendário',
      icon: '📅',
      coverUrl: null,
      parentId: 'page-secullum',
      contentMarkdown: 'Eventos do mês.',
    };
    const allPages = [parentPage, childPage];
    const assets = [
      {
        id: 'asset-cover-1',
        kind: 'cover' as const,
        filename: 'cover.webp',
        mimeType: 'image/webp',
        dataBase64: '',
        sizeBytes: 120,
        storagePath: 'assets/covers/asset-cover-1-cover.webp',
        url: '/api/assets/asset-cover-1',
        createdAt: now,
      },
      {
        id: 'asset-img-1',
        kind: 'inline_image' as const,
        filename: 'rede.png',
        mimeType: 'image/png',
        dataBase64: '',
        sizeBytes: 120,
        storagePath: 'assets/images/asset-img-1-rede.png',
        url: '/api/assets/asset-img-1',
        createdAt: now,
      },
    ];

    expect(computeOkfPagePath(parentPage, allPages)).toBe('secullum/index.md');
    expect(computeOkfPagePath(childPage, allPages)).toBe('secullum/calendario.md');

    const okfParent = exportPageAsOkfMarkdown(parentPage, allPages, assets);
    expect(okfParent).toContain('type: "index"');
    expect(okfParent).toContain('cover_url: "../assets/covers/asset-cover-1-cover.webp"');
    expect(okfParent).toContain('cover_y: 35');
    expect(okfParent).toContain('![Rede](../assets/images/asset-img-1-rede.png)');
    expect(okfParent).toContain('[📅 Calendário](./calendario.md)');

    const rootIndex = generateOkfRootIndex(allPages);
    expect(rootIndex).toContain('type: "index"');
    expect(rootIndex).toContain('[☀️ Secullum](./secullum/index.md)');

    const logMd = generateOkfLogMarkdown([
      {
        id: 'sync-1',
        timestamp: now,
        direction: 'push',
        commitSha: 'abc1234567890',
        filesChanged: 2,
        summary: 'Sync OKF bundle',
        status: 'success',
      },
    ]);
    expect(logMd).toContain('abc1234');
    expect(logMd).toContain('Sync OKF bundle');
  });
});
