import { markdownToTiptap } from './markdown-ast.js';
import { generateDeterministicEmbedding, slugifyTitle } from './tree-and-search.js';
import type { MindPage } from './types.js';

function createSeedPage(params: {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  isFavorite?: boolean;
  isInbox?: boolean;
  tags: string[];
  markdown: string;
}): MindPage {
  const now = '2026-11-10T18:00:00.000Z';
  const contentJson = markdownToTiptap(params.markdown);
  const embedding = generateDeterministicEmbedding(
    `${params.title} ${params.tags.join(' ')} ${params.markdown}`,
  );
  return {
    id: params.id,
    slug: slugifyTitle(params.title),
    title: params.title,
    icon: params.icon,
    parentId: params.parentId,
    sortOrder: params.sortOrder,
    contentMarkdown: params.markdown,
    contentJson,
    isFavorite: params.isFavorite ?? false,
    isInbox: params.isInbox ?? false,
    tags: params.tags,
    embedding,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function createInitialSeedPages(): MindPage[] {
  return [
    createSeedPage({
      id: 'page-manifesto',
      title: 'Mind Hub — RFC 001 & Manifesto',
      icon: '🧠',
      parentId: null,
      sortOrder: 1,
      isFavorite: true,
      tags: ['arquitetura', 'rfc', 'mcp', 'tiptap'],
      markdown: [
        '# A Nova Geração de Gestão de Conhecimento',
        '',
        'O **Mind Hub** nasce para romper o ciclo entre SaaS lentos e soluções open-core predatórias, entregando **latência inferior a 10ms**, ergonomia fluida em blocos e **soberania perpétua via Git**.',
        '',
        '## Pilares Inegociáveis',
        '',
        '- [x] Editor em blocos **Tiptap v2** com Slash Commands (`/h1`, `/tarefa`, `/codigo`, `/tabela`)',
        '- [x] Backend **Fastify + Drizzle ORM** com execução SQL sub-milissegundo',
        '- [x] Servidor **Model Context Protocol (`/mcp`)** nativo e 100% aberto',
        '- [x] Busca Híbrida (`tsvector` + **pgvector** por similaridade de cosseno)',
        '- [ ] Sincronização contínua com repositório Git em Markdown puro',
        '',
        '## Comparativo de Desempenho',
        '',
        '| Critério | Notion | Docmost Free | Mind Hub |',
        '| --- | --- | --- | --- |',
        '| Latência de Abertura | 1000ms - 3000ms | 250ms | < 10ms |',
        '| Consumo de RAM | > 1500 MB | 450 MB | < 150 MB |',
        '| Servidor MCP Nativo | Apenas Cloud | Bloqueado ($720/ano) | Nativo Gratuito |',
        '',
        '> O conhecimento dita o código. A fonte única da verdade é a documentação.',
      ].join('\n'),
    }),
    createSeedPage({
      id: 'page-adr-stack',
      title: 'ADR 001: Fastify + Drizzle vs NestJS + Prisma',
      icon: '⚡',
      parentId: 'page-manifesto',
      sortOrder: 1,
      isFavorite: true,
      tags: ['adr', 'fastify', 'drizzle', 'pgvector', 'performance'],
      markdown: [
        '# ADR 001: Escolha de Fastify e Drizzle ORM',
        '',
        '## Contexto e Problema',
        '',
        'ORMs tradicionais com engine binária externa (como o Prisma em Rust) adicionam de **10ms a 25ms** de serialização IPC por query e exigem queries cruas sem tipagem para operadores vetoriais do `pgvector`.',
        '',
        '## Decisão Arquitetural',
        '',
        '- Adotar **Fastify** (até 70.000 req/s com ~30MB de RAM em repouso)',
        '- Adotar **Drizzle ORM** com compilação TypeScript-native direta para SQL (< 1ms)',
        '- Suporte nativo de primeira classe a `vector(768)` e distância de cosseno `<=>`',
        '',
        '```typescript',
        'const results = await db',
        '  .select()',
        '  .from(pagesTable)',
        '  .where(isNull(pagesTable.deletedAt))',
        '  .orderBy(cosineDistance(pagesTable.embedding, queryVector))',
        '  .limit(10);',
        '```',
      ].join('\n'),
    }),
    createSeedPage({
      id: 'page-mcp-guide',
      title: 'Guia do Servidor MCP Nativo (/mcp)',
      icon: '🤖',
      parentId: 'page-manifesto',
      sortOrder: 2,
      isFavorite: false,
      tags: ['mcp', 'ia', 'agentes', 'byok'],
      markdown: [
        '# Integração Direta com Agentes Autônomos',
        '',
        'Qualquer cliente compatível com o **Model Context Protocol** (Claude Desktop, Cursor, Antigravity CLI) pode se conectar diretamente ao endpoint `/mcp`.',
        '',
        '## Ferramentas Expostas',
        '',
        '- `search_pages`: Busca textual, semântica ou híbrida em toda a base de conhecimento',
        '- `get_page`: Retorna o conteúdo limpo em Markdown com metadados estruturados',
        '- `create_page`: Permite que agentes criem novas notas, atas ou ADRs automaticamente',
        '- `update_page`: Atualiza páginas existentes preservando histórico e integridade',
      ].join('\n'),
    }),
    createSeedPage({
      id: 'page-inbox',
      title: 'Inbox & Insights Rápidos',
      icon: '📥',
      parentId: null,
      sortOrder: 2,
      isFavorite: true,
      isInbox: true,
      tags: ['inbox', 'captura-rapida', 'pwa'],
      markdown: [
        '# Caixa de Entrada (Inbox Livre)',
        '',
        'Espaço de captura instantânea sem burocracia através do botão flutuante **💡 Insight Rápido** no desktop ou smartphone.',
        '',
        '- [x] Configurar licença AGPLv3 para blindar o projeto contra modelos open-core',
        '- [x] Estruturar monorepo `pnpm-workspace` com testes automatizados via Vitest',
        '- [ ] Testar captura de insight rápido em 2 segundos pelo modal atalho',
      ].join('\n'),
    }),
  ];
}
