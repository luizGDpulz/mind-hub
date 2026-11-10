import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('@mind-hub/server — Fastify API, Soft Delete, MCP & AI Integration', () => {
  it('responds to /healthz and lists initial seed pages in under 10ms', async () => {
    const app = await buildApp();
    const start = performance.now();
    const healthRes = await app.inject({ method: 'GET', url: '/healthz' });
    const elapsed = performance.now() - start;

    expect(healthRes.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(50);
    const body = healthRes.json<{ status: string; activePages: number }>();
    expect(body.status).toBe('ok');
    expect(body.activePages).toBe(4);

    const treeRes = await app.inject({ method: 'GET', url: '/api/pages/tree' });
    expect(treeRes.statusCode).toBe(200);
    const treeBody = treeRes.json<{ tree: Array<{ id: string; children: unknown[] }> }>();
    expect(treeBody.tree.length).toBe(2);
    await app.close();
  });

  it('creates, updates, soft-deletes (preserving deletedAt) and restores a page', async () => {
    const app = await buildApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: {
        title: 'Arquitetura de Testes Automatizados',
        icon: '🧪',
        contentMarkdown: '# Testes Religiosos\n\n- [x] Pipeline Vitest configurado',
        tags: ['testes', 'ci'],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<{ page: { id: string; slug: string; deletedAt: string | null } }>().page;
    expect(created.slug).toBe('arquitetura-de-testes-automatizados');
    expect(created.deletedAt).toBeNull();

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/pages/${created.id}`,
      payload: {
        title: 'Arquitetura de Testes v2',
        isFavorite: true,
      },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json<{ page: { title: string; isFavorite: boolean } }>().page.isFavorite).toBe(true);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/pages/${created.id}`,
    });
    expect(deleteRes.statusCode).toBe(200);
    const deletedPage = deleteRes.json<{ page: { deletedAt: string | null } }>().page;
    expect(deletedPage.deletedAt).not.toBeNull();

    const getDeletedRes = await app.inject({
      method: 'GET',
      url: `/api/pages/${created.id}`,
    });
    expect(getDeletedRes.statusCode).toBe(404);

    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/pages/${created.id}/restore`,
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json<{ page: { deletedAt: string | null } }>().page.deletedAt).toBeNull();

    await app.close();
  });

  it('captures Quick Insight into Inbox in 1 request and exports Git sovereignty Markdown snapshot', async () => {
    const app = await buildApp();

    const insightRes = await app.inject({
      method: 'POST',
      url: '/api/insights/quick',
      payload: {
        text: 'Validar latência do pgvector com índice HNSW',
        tags: ['insight'],
      },
    });
    expect(insightRes.statusCode).toBe(201);
    const inboxPage = insightRes.json<{ page: { contentMarkdown: string; isInbox: boolean } }>().page;
    expect(inboxPage.isInbox).toBe(true);
    expect(inboxPage.contentMarkdown).toContain('Validar latência do pgvector com índice HNSW');

    const gitRes = await app.inject({
      method: 'GET',
      url: '/api/git/export',
    });
    expect(gitRes.statusCode).toBe(200);
    const snapshot = gitRes.json<{ totalFiles: number; files: Array<{ path: string; markdown: string }> }>();
    expect(snapshot.totalFiles).toBe(4);
    expect(snapshot.files[0]?.markdown).toContain('---');

    await app.close();
  });

  it('serves native MCP protocol (/mcp) tools/list and tools/call for AI agents and answers AI chat queries', async () => {
    const app = await buildApp();

    const mcpInit = await app.inject({
      method: 'POST',
      url: '/mcp',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
      },
    });
    expect(mcpInit.statusCode).toBe(200);
    expect(mcpInit.json<{ result: { serverInfo: { name: string } } }>().result.serverInfo.name).toBe(
      'mind-hub-mcp',
    );

    const mcpTools = await app.inject({
      method: 'POST',
      url: '/mcp',
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      },
    });
    const toolsList = mcpTools.json<{ result: { tools: Array<{ name: string }> } }>().result.tools;
    expect(toolsList.map((t) => t.name)).toEqual([
      'search_pages',
      'get_page',
      'create_page',
      'update_page',
    ]);

    const mcpCreate = await app.inject({
      method: 'POST',
      url: '/mcp',
      payload: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'create_page',
          arguments: {
            title: 'Nota Criada via Agente MCP',
            content: '# Criada remotamente pelo Claude/Antigravity',
            tags: ['mcp-agent'],
          },
        },
      },
    });
    expect(mcpCreate.statusCode).toBe(200);
    const createdText =
      mcpCreate.json<{ result: { content: Array<{ text: string }> } }>().result.content[0]?.text ??
      '{}';
    const createdObj = JSON.parse(createdText) as { id: string; title: string };
    expect(createdObj.title).toBe('Nota Criada via Agente MCP');

    const mcpGet = await app.inject({
      method: 'POST',
      url: '/mcp',
      payload: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'get_page',
          arguments: {
            page_id: createdObj.id,
          },
        },
      },
    });
    expect(
      mcpGet.json<{ result: { content: Array<{ text: string }> } }>().result.content[0]?.text,
    ).toContain('Criada remotamente pelo Claude/Antigravity');

    const aiRes = await app.inject({
      method: 'POST',
      url: '/api/ai/chat',
      payload: {
        question: 'Por que escolhemos Fastify e Drizzle ORM?',
      },
    });
    expect(aiRes.statusCode).toBe(200);
    const aiBody = aiRes.json<{ answer: string; provider: string; referencedPages: unknown[] }>();
    expect(aiBody.provider).toBe('local-rag');
    expect(aiBody.answer).toContain('ADR 001');
    expect(aiBody.referencedPages.length).toBeGreaterThan(0);

    await app.close();
  });
});
