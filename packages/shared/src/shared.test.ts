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

  it('slugifies Portuguese titles removing accents and handling edge cases', () => {
    expect(slugifyTitle('Mind Hub — Gestão & Soberania!')).toBe('mind-hub-gestao-soberania');
    expect(slugifyTitle('   ')).toBe('sem-titulo');
  });

  it('builds hierarchical page tree, flattens it, and resolves breadcrumbs while filtering soft-deleted pages', () => {
    const pages = createInitialSeedPages();
    const deletedPage = {
      ...pages[0]!,
      id: 'page-deleted',
      title: 'Página Excluída',
      deletedAt: '2026-11-10T19:00:00.000Z',
    };

    const tree = buildPageTree([...pages, deletedPage]);
    expect(tree.length).toBe(2);
    const manifestoNode = tree.find((n) => n.id === 'page-manifesto');
    expect(manifestoNode).toBeDefined();
    expect(manifestoNode?.children.length).toBe(2);

    const flat = flattenPageTree(tree);
    expect(flat.length).toBe(4);
    const adrEntry = flat.find((f) => f.page.id === 'page-adr-stack');
    expect(adrEntry?.depth).toBe(1);

    const crumbs = getPageBreadcrumbs(pages, 'page-adr-stack');
    expect(crumbs.map((c) => c.id)).toEqual(['page-manifesto', 'page-adr-stack']);
  });

  it('computes deterministic embeddings and ranks search results in text, semantic, and hybrid modes', () => {
    const vec1 = generateDeterministicEmbedding('Fastify Drizzle PostgreSQL pgvector');
    const vec2 = generateDeterministicEmbedding('Fastify Drizzle SQL performance');
    const vec3 = generateDeterministicEmbedding('Receita de bolo de chocolate caseiro');

    expect(cosineSimilarity(vec1, vec1)).toBeCloseTo(1, 3);
    expect(cosineSimilarity(vec1, vec2)).toBeGreaterThan(cosineSimilarity(vec1, vec3));

    const pages = createInitialSeedPages();
    const hybridResults = searchPagesEngine(pages, {
      query: 'Drizzle Rust Prisma',
      mode: 'hybrid',
    });
    expect(hybridResults.length).toBeGreaterThan(0);
    expect(hybridResults[0]?.page.id).toBe('page-adr-stack');

    const semanticResults = searchPagesEngine(pages, {
      query: 'agentes autônomos claude cursor protocolo',
      mode: 'semantic',
    });
    expect(semanticResults.length).toBeGreaterThan(0);
  });

  it('exports page with clean YAML frontmatter for Git sovereignty and provides default slash commands', () => {
    const pages = createInitialSeedPages();
    const exported = exportPageWithFrontmatter(pages[0]!);
    expect(exported).toContain('---\nid: page-manifesto');
    expect(exported).toContain('tags: [arquitetura, rfc, mcp, tiptap]');
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
});
