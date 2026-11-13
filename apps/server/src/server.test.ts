import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    expect(body.activePages).toBe(2);
    expect(body.activeTasks).toBe(8);
    expect(body.activeComments).toBe(0);

    const bootstrapRes = await app.inject({ method: 'GET', url: '/api/workspace/bootstrap' });
    expect(bootstrapRes.statusCode).toBe(200);
    const bootstrapBody = bootstrapRes.json<{
      pages: unknown[];
      databaseTasks: unknown[];
      comments: unknown[];
      diagrams: unknown[];
    }>();
    expect(bootstrapBody.pages.length).toBe(2);
    expect(bootstrapBody.databaseTasks.length).toBe(8);
    expect(bootstrapBody.comments.length).toBe(0);
    expect(bootstrapBody.diagrams.length).toBe(0);

    const treeRes = await app.inject({ method: 'GET', url: '/api/pages/tree' });
    expect(treeRes.statusCode).toBe(200);
    const treeBody = treeRes.json<{ tree: Array<{ id: string; children: unknown[] }> }>();
    expect(treeBody.tree.length).toBe(1);
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

    // Permanent delete
    const permDeleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/pages/${created.id}/permanent`,
    });
    expect(permDeleteRes.statusCode).toBe(200);
    expect(permDeleteRes.json<{ success: boolean }>().success).toBe(true);

    const getPermDeletedRes = await app.inject({
      method: 'GET',
      url: `/api/pages/${created.id}`,
    });
    expect(getPermDeletedRes.statusCode).toBe(404);

    // Empty trash test
    const pageForTrash = await app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title: 'Nota Para Lixeira' },
    });
    const pageTrashId = pageForTrash.json<{ page: { id: string } }>().page.id;
    await app.inject({ method: 'DELETE', url: `/api/pages/${pageTrashId}` });

    const emptyTrashRes = await app.inject({
      method: 'POST',
      url: '/api/pages/trash/empty',
    });
    expect(emptyTrashRes.statusCode).toBe(200);
    expect(emptyTrashRes.json<{ deletedCount: number }>().deletedCount).toBeGreaterThanOrEqual(1);

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
    expect(snapshot.totalFiles).toBe(3);
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

    await app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: {
        title: 'ADR 001 — Fastify e Drizzle ORM',
        contentMarkdown: 'Escolhemos Fastify e Drizzle ORM pela latência baixa.',
        tags: ['adr', 'fastify', 'drizzle'],
      },
    });

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

  it('stores uploaded icon image assets on disk and serves them via /api/assets/:id with hardened headers', async () => {
    const storeFile = join(tmpdir(), `mind-hub-asset-store-${Date.now()}.json`);
    const repo1 = new DurableFilePageRepository(storeFile);
    const app1 = await buildApp({ repository: repo1 });

    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const uploadRes = await app1.inject({
      method: 'POST',
      url: '/api/assets',
      payload: {
        filename: 'logo.png',
        mimeType: 'image/png',
        dataBase64: `data:image/png;base64,${pngBase64}`,
      },
    });
    expect(uploadRes.statusCode).toBe(201);
    const uploadBody = uploadRes.json<{ asset: { id: string; url: string; mimeType: string } }>();
    expect(uploadBody.asset.url).toBe(`/api/assets/${uploadBody.asset.id}`);
    expect(uploadBody.asset.mimeType).toBe('image/png');

    await app1.close();

    // Verify disk durability across restart
    const repo2 = new DurableFilePageRepository(storeFile);
    const app2 = await buildApp({ repository: repo2 });
    const fetchRes = await app2.inject({
      method: 'GET',
      url: uploadBody.asset.url,
    });
    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.headers['content-type']).toBe('image/png');
    expect(fetchRes.headers['x-content-type-options']).toBe('nosniff');

    // Reject unsupported MIME type
    const badRes = await app2.inject({
      method: 'POST',
      url: '/api/assets',
      payload: {
        filename: 'malware.exe',
        mimeType: 'application/octet-stream',
        dataBase64: pngBase64,
      },
    });
    expect(badRes.statusCode).toBe(400);

    await app2.close();
    rmSync(storeFile, { force: true });
  });

  it('enforces optimistic concurrency control (409 Conflict) on stale expectedHash updates', async () => {
    const app = await buildApp();
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title: 'Nota Concorrente', contentMarkdown: 'Versão 1' },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<{ page: { id: string; sourceHash: string } }>().page;
    expect(created.sourceHash).toBeTruthy();

    // Update with stale expectedHash
    const conflictRes = await app.inject({
      method: 'PATCH',
      url: `/api/pages/${created.id}`,
      payload: { contentMarkdown: 'Sobrescrita cega', expectedHash: 'fnv64-0000000000000000' },
    });
    expect(conflictRes.statusCode).toBe(409);

    // Update with matching expectedHash succeeds
    const okRes = await app.inject({
      method: 'PATCH',
      url: `/api/pages/${created.id}`,
      payload: { contentMarkdown: 'Versão 2 limpa', expectedHash: created.sourceHash },
    });
    expect(okRes.statusCode).toBe(200);
    await app.close();
  });

  it('executes full Plug & Play GitHub OKF Delta Sync (push, no-op, single delta, pull) and serves assets by-path', async () => {
    const baseDir = join(tmpdir(), `mind-hub-gitsync-test-${Date.now()}`);
    const bareRepo = join(baseDir, 'remote.git');
    const vaultWork = join(baseDir, 'git-vault');
    const externalClone = join(baseDir, 'external-clone');
    mkdirSync(bareRepo, { recursive: true });
    execFileSync('git', ['init', '--bare', '-b', 'main', bareRepo]);

    const app = await buildApp({ gitVaultDir: vaultWork });

    // Upload a cover asset
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const assetRes = await app.inject({
      method: 'POST',
      url: '/api/assets',
      payload: {
        kind: 'cover',
        filename: 'secullum-cover.png',
        mimeType: 'image/png',
        dataBase64: pngBase64,
      },
    });
    expect(assetRes.statusCode).toBe(201);
    const { asset } = assetRes.json<{ asset: { id: string; url: string; storagePath: string } }>();
    expect(asset.storagePath).toContain('assets/covers/');

    // Serve via by-path
    const byPathRes = await app.inject({
      method: 'GET',
      url: `/api/assets/by-path/${asset.storagePath}`,
    });
    expect(byPathRes.statusCode).toBe(200);
    expect(byPathRes.headers['content-type']).toBe('image/png');

    // Create a parent page and child page
    const parentRes = await app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: {
        title: 'Secullum',
        icon: '☀️',
        coverUrl: asset.url,
        contentMarkdown: 'Central da Secullum.',
      },
    });
    const parent = parentRes.json<{ page: { id: string } }>().page;
    await app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: {
        title: 'Ponto Web',
        icon: '❄️',
        parentId: parent.id,
        contentMarkdown: 'Documentação do Ponto.',
      },
    });

    // Test connection
    const testConn = await app.inject({
      method: 'POST',
      url: '/api/sync/github/test-connection',
      payload: { repository: bareRepo, branch: 'main', token: '' },
    });
    expect(testConn.statusCode).toBe(200);
    expect(testConn.json<{ ok: boolean; isEmpty: boolean }>().ok).toBe(true);

    // Configure & Initial Push
    const configRes = await app.inject({
      method: 'POST',
      url: '/api/sync/github/configure',
      payload: {
        repository: bareRepo,
        branch: 'main',
        token: '',
        strategy: 'push_initial',
        autoSyncEnabled: false,
      },
    });
    expect(configRes.statusCode).toBe(200);
    const configBody = configRes.json<{
      status: { configured: boolean; state: string; pendingChangesCount: number };
      initialSync: { ok: boolean; pushedFiles: string[]; commitSha: string | null };
    }>();
    expect(configBody.status.configured).toBe(true);
    expect(configBody.status.state).toBe('connected');
    expect(configBody.initialSync.ok).toBe(true);
    expect(configBody.initialSync.commitSha).toBeTruthy();
    expect(existsSync(join(vaultWork, 'index.md'))).toBe(true);
    expect(existsSync(join(vaultWork, 'log.md'))).toBe(true);
    expect(existsSync(join(vaultWork, 'secullum', 'index.md'))).toBe(true);
    expect(existsSync(join(vaultWork, 'secullum', 'ponto-web.md'))).toBe(true);
    expect(existsSync(join(vaultWork, asset.storagePath))).toBe(true);

    // Second sync with zero changes -> no-op!
    const noopRes = await app.inject({ method: 'POST', url: '/api/sync/github/sync' });
    expect(noopRes.statusCode).toBe(200);
    const noopBody = noopRes.json<{ result: { pushedFiles: string[]; pulledFiles: string[] } }>();
    expect(noopBody.result.pushedFiles).toHaveLength(0);
    expect(noopBody.result.pulledFiles).toHaveLength(0);

    // External edit pushed to bareRepo -> Mind Hub pulls it cleanly
    execFileSync('git', ['clone', bareRepo, externalClone]);
    const pontoPath = join(externalClone, 'secullum', 'ponto-web.md');
    const updatedExternalMd = readFileSync(pontoPath, 'utf-8').replace(
      'Documentação do Ponto.',
      'Documentação atualizada via Obsidian.',
    );
    writeFileSync(pontoPath, updatedExternalMd, 'utf-8');
    execFileSync('git', ['-C', externalClone, 'config', 'user.email', 'ext@mind.local']);
    execFileSync('git', ['-C', externalClone, 'config', 'user.name', 'External User']);
    execFileSync('git', ['-C', externalClone, 'add', '-A']);
    execFileSync('git', ['-C', externalClone, 'commit', '-m', 'docs: external edit']);
    execFileSync('git', ['-C', externalClone, 'push', 'origin', 'main']);

    const pullRes = await app.inject({ method: 'POST', url: '/api/sync/github/sync' });
    expect(pullRes.statusCode).toBe(200);
    const pullBody = pullRes.json<{ result: { pulledFiles: string[] } }>();
    expect(pullBody.result.pulledFiles.length).toBeGreaterThanOrEqual(1);

    // Verify disconnect
    const disconnectRes = await app.inject({ method: 'POST', url: '/api/sync/github/disconnect' });
    expect(disconnectRes.statusCode).toBe(200);
    expect(disconnectRes.json<{ status: { configured: boolean } }>().status.configured).toBe(false);

    await app.close();
    rmSync(baseDir, { recursive: true, force: true });
  });
});
