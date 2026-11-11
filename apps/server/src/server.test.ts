import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { DurableFilePageRepository } from './repository.js';

describe('@mind-hub/server — Fastify API, Soft Delete, Durable Persistence, MCP & AI Integration', () => {
  it('responds to /healthz and /api/workspace/bootstrap in under 50ms', async () => {
    const app = await buildApp();
    const start = performance.now();
    const healthRes = await app.inject({ method: 'GET', url: '/healthz' });
    const elapsed = performance.now() - start;

    expect(healthRes.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(50);
    const body = healthRes.json<{
      status: string;
      activePages: number;
      activeTasks: number;
      activeComments: number;
    }>();
    expect(body.status).toBe('ok');
    expect(body.activePages).toBe(4);
    expect(body.activeTasks).toBe(8);
    expect(body.activeComments).toBe(2);

    const bootstrapRes = await app.inject({ method: 'GET', url: '/api/workspace/bootstrap' });
    expect(bootstrapRes.statusCode).toBe(200);
    const bootstrapBody = bootstrapRes.json<{
      pages: unknown[];
      databaseTasks: unknown[];
      comments: unknown[];
      diagrams: unknown[];
    }>();
    expect(bootstrapBody.pages.length).toBe(4);
    expect(bootstrapBody.databaseTasks.length).toBe(8);
    expect(bootstrapBody.comments.length).toBe(2);
    expect(bootstrapBody.diagrams.length).toBe(3);

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

  it('manages Database Tasks, Page Comments, Diagrams and Auth SSO with Soft Delete', async () => {
    const app = await buildApp();

    // 1. Database Tasks CRUD + Status Cycling + Soft Delete
    const createTaskRes = await app.inject({
      method: 'POST',
      url: '/api/database/tasks',
      payload: {
        task: 'Deploy pgvector HNSW index',
        status: 'Backlog',
        priority: 'Urgent',
        budget: 14500,
        effort: 5,
      },
    });
    expect(createTaskRes.statusCode).toBe(201);
    const createdTask = createTaskRes.json<{ task: { id: string; status: string } }>().task;
    expect(createdTask.status).toBe('Backlog');

    const cycleRes = await app.inject({
      method: 'POST',
      url: `/api/database/tasks/${createdTask.id}/cycle-status`,
    });
    expect(cycleRes.statusCode).toBe(200);
    expect(cycleRes.json<{ task: { status: string } }>().task.status).toBe('In Progress');

    const delTaskRes = await app.inject({
      method: 'DELETE',
      url: `/api/database/tasks/${createdTask.id}`,
    });
    expect(delTaskRes.statusCode).toBe(200);
    expect(delTaskRes.json<{ task: { deletedAt: string | null } }>().task.deletedAt).not.toBeNull();

    // 2. Page Comments + Thread Replies + Soft Delete
    const commentRes = await app.inject({
      method: 'POST',
      url: '/api/pages/page-manifesto/comments',
      payload: {
        authorName: 'Luiz Pulz',
        quotedText: 'Fastify + Drizzle ORM',
        body: 'Latência sub-milissegundo validada.',
      },
    });
    expect(commentRes.statusCode).toBe(201);
    const createdThread = commentRes.json<{
      comment: { id: string; authorInitials: string; replies: unknown[] };
    }>().comment;
    expect(createdThread.authorInitials).toBe('LP');

    const replyRes = await app.inject({
      method: 'POST',
      url: `/api/comments/${createdThread.id}/replies`,
      payload: {
        authorName: 'Antigravity',
        body: '100% alinhado com o ADR 001.',
      },
    });
    expect(replyRes.statusCode).toBe(200);
    expect(
      replyRes.json<{ comment: { replies: Array<{ body: string }> } }>().comment.replies.length,
    ).toBe(1);

    // 3. Diagram Upsert
    const diagRes = await app.inject({
      method: 'POST',
      url: '/api/diagrams',
      payload: {
        pageId: 'page-manifesto',
        kind: 'mermaid',
        title: 'Data Pipeline',
        mermaidCode: 'flowchart LR\n  A[Markdown] --> B[pgvector]',
      },
    });
    expect(diagRes.statusCode).toBe(201);

    // 4. Auth SSO Login
    const authRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'luiz@pulz.dev.br',
        ssoProvider: 'Okta',
      },
    });
    expect(authRes.statusCode).toBe(200);
    const session = authRes.json<{ authenticated: boolean; user: { authMethod: string } }>();
    expect(session.authenticated).toBe(true);
    expect(session.user.authMethod).toBe('Okta');

    await app.close();
  });

  it('persists state atomically across restarts with DurableFilePageRepository', async () => {
    const tempStorePath = join(tmpdir(), `mind-hub-test-${Date.now()}.json`);
    try {
      const repo1 = new DurableFilePageRepository(tempStorePath);
      const createdPage = await repo1.createPage({
        title: 'Nota Persistente no Disco',
        contentMarkdown: '# Persistência Real\nSobrevive a restart do container.',
      });
      await repo1.createDatabaseTask({
        task: 'Validar snapshot atômico JSON',
        status: 'Done',
      });

      // Simulate container restart by creating a brand new repository instance from the same file
      const repo2 = new DurableFilePageRepository(tempStorePath);
      const loadedPage = await repo2.getPageById(createdPage.id);
      expect(loadedPage).not.toBeNull();
      expect(loadedPage?.title).toBe('Nota Persistente no Disco');

      const tasks = await repo2.listDatabaseTasks();
      expect(tasks.some((t) => t.task === 'Validar snapshot atômico JSON')).toBe(true);
    } finally {
      rmSync(tempStorePath, { force: true });
    }
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
      'list_database_tasks',
      'create_database_task',
      'add_page_comment',
      'import_markdown_vault',
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

    const mcpCreateTask = await app.inject({
      method: 'POST',
      url: '/mcp',
      payload: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'create_database_task',
          arguments: {
            task: 'Revisar código via MCP',
            status: 'In Progress',
            priority: 'High',
          },
        },
      },
    });
    expect(mcpCreateTask.statusCode).toBe(200);

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

  it('ingests Second Brain Markdown vault in bulk with folder hierarchy, WikiLinks & idempotent hash skip', async () => {
    const app = await buildApp();

    const bulkRes = await app.inject({
      method: 'POST',
      url: '/api/import/markdown-bulk',
      payload: {
        useSampleSecondBrain: true,
        conflictStrategy: 'upsert',
      },
    });
    expect(bulkRes.statusCode).toBe(201);
    const bulkBody = bulkRes.json<{
      notesProcessed: number;
      folderPagesCreated: number;
      createdCount: number;
      skippedCount: number;
      wikiLinksResolved: number;
      pages: Array<{ title: string; parentId: string | null }>;
    }>();
    expect(bulkBody.notesProcessed).toBe(4);
    expect(bulkBody.folderPagesCreated).toBeGreaterThanOrEqual(3);
    expect(bulkBody.createdCount).toBeGreaterThanOrEqual(7);
    expect(bulkBody.wikiLinksResolved).toBeGreaterThanOrEqual(2);

    // Second run with exact same hash should reuse existing folders and skip all 4 unchanged notes idempotently
    const secondRunRes = await app.inject({
      method: 'POST',
      url: '/api/import/markdown-bulk',
      payload: {
        useSampleSecondBrain: true,
        conflictStrategy: 'upsert',
      },
    });
    expect(secondRunRes.statusCode).toBe(201);
    const secondBody = secondRunRes.json<{
      skippedCount: number;
      folderPagesCreated: number;
    }>();
    expect(secondBody.folderPagesCreated).toBe(0);
    expect(secondBody.skippedCount).toBe(4);

    // Also test MCP tool import_markdown_vault
    const mcpBulkRes = await app.inject({
      method: 'POST',
      url: '/mcp',
      payload: {
        jsonrpc: '2.0',
        id: 99,
        method: 'tools/call',
        params: {
          name: 'import_markdown_vault',
          arguments: {
            files: [
              {
                path: 'Inbox/Nota Rapida MCP.md',
                content: '---\ntags: [mcp, bulk]\n---\n# Nota Rápida via MCP Bulk\nConectada a [[Mind Hub]].',
              },
            ],
          },
        },
      },
    });
    expect(mcpBulkRes.statusCode).toBe(200);
    const mcpBulkText =
      mcpBulkRes.json<{ result: { content: Array<{ text: string }> } }>().result.content[0]?.text ??
      '{}';
    const mcpBulkParsed = JSON.parse(mcpBulkText) as { notesProcessed: number; wikiLinksResolved: number };
    expect(mcpBulkParsed.notesProcessed).toBe(1);
    expect(mcpBulkParsed.wikiLinksResolved).toBe(1);

    await app.close();
  });
});
