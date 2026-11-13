import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import {
  createSampleSecondBrainBatch,
  planBulkVaultImport,
  type AddCommentReplyInput,
  type AiChatRequest,
  type AuthLoginInput,
  type AuthSessionResponse,
  type BulkImportApiResponse,
  type CreateDatabaseTaskInput,
  type CreatePageCommentInput,
  type CreatePageInput,
  type QuickInsightInput,
  type RawMarkdownFileEntry,
  type SearchMode,
  type UpdateDatabaseTaskInput,
  type UpdatePageInput,
  type UpsertDiagramInput,
} from '@mind-hub/shared';
import {
  DurableFilePageRepository,
  InMemoryPageRepository,
  type PageRepository,
} from './repository.js';
import { AiService } from './ai-service.js';
import { McpHandler, type JsonRpcRequest } from './mcp-handler.js';

const IGNORED_VAULT_DIRS = new Set([
  '.git',
  '.obsidian',
  '.trash',
  '.design-refs',
  'node_modules',
  'dist',
  'coverage',
]);

export function scanMarkdownDirectoryRecursively(
  rootDir: string,
  maxFiles = 250,
): RawMarkdownFileEntry[] {
  const entries: RawMarkdownFileEntry[] = [];
  if (typeof rootDir !== 'string' || !rootDir.trim() || !fs.existsSync(rootDir)) {
    return entries;
  }

  const resolvedRoot = path.resolve(rootDir);
  const maxFileSizeBytes = 1024 * 1024; // 1MB guard per Markdown file

  function walk(currentDir: string): void {
    if (entries.length >= maxFiles) return;
    const resolvedCurrent = path.resolve(currentDir);
    if (
      resolvedCurrent !== resolvedRoot &&
      !resolvedCurrent.startsWith(resolvedRoot + path.sep)
    ) {
      return;
    }

    let dirItems: fs.Dirent[];
    try {
      dirItems = fs.readdirSync(resolvedCurrent, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of dirItems) {
      if (entries.length >= maxFiles) break;
      if (
        item.isSymbolicLink() ||
        item.name.startsWith('.') ||
        IGNORED_VAULT_DIRS.has(item.name)
      ) {
        continue;
      }

      const fullPath = path.join(resolvedCurrent, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && /\.(md|markdown)$/i.test(item.name)) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > maxFileSizeBytes) continue;
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relPath = path.relative(resolvedRoot, fullPath).replace(/\\/g, '/');
          entries.push({ path: relPath, content });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walk(resolvedRoot);
  return entries;
}

export interface BuildAppOptions {
  repository?: PageRepository;
  dataFilePath?: string;
  geminiApiKey?: string;
  nvidiaApiKey?: string;
  staticDir?: string;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: 6 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const dataFilePath = options.dataFilePath ?? process.env.DATA_FILE_PATH;
  const repo =
    options.repository ??
    (dataFilePath
      ? new DurableFilePageRepository(dataFilePath)
      : new InMemoryPageRepository());

  const aiService = new AiService(
    options.geminiApiKey ?? process.env.GEMINI_API_KEY,
    options.nvidiaApiKey ?? process.env.NVIDIA_API_KEY,
  );
  const mcpHandler = new McpHandler(repo);

  app.setErrorHandler(async (error, request, reply) => {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (request.url.startsWith('/mcp')) {
      return reply.code(500).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message },
      });
    }
    return reply.code(500).send({ error: message });
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Engine', 'Mind-Hub-Fastify-Drizzle');
    return payload;
  });

  app.get('/healthz', async () => {
    const [pages, tasks, comments] = await Promise.all([
      repo.listPages(false),
      repo.listDatabaseTasks(false),
      repo.listPageComments(undefined, false),
    ]);
    return {
      status: 'ok',
      service: 'mind-hub-server',
      persistence: dataFilePath ? 'durable-file' : 'in-memory',
      activePages: pages.length,
      activeTasks: tasks.length,
      activeComments: comments.length,
      timestamp: new Date().toISOString(),
    };
  });

  // =========================================================================
  // WORKSPACE BOOTSTRAP (Single Sub-Millisecond Hydration Payload)
  // =========================================================================

  app.get('/api/workspace/bootstrap', async () => {
    const [pages, databaseTasks, comments, diagrams] = await Promise.all([
      repo.listPages(true),
      repo.listDatabaseTasks(false),
      repo.listPageComments(undefined, false),
      repo.listDiagrams(undefined, false),
    ]);
    return {
      pages,
      databaseTasks,
      comments,
      diagrams,
    };
  });

  // =========================================================================
  // PAGES & SEMANTIC SEARCH
  // =========================================================================

  app.get<{ Querystring: { includeDeleted?: string } }>(
    '/api/pages',
    async (request) => {
      const includeDeleted = request.query.includeDeleted === 'true';
      const pages = await repo.listPages(includeDeleted);
      return { pages };
    },
  );

  app.get('/api/pages/tree', async () => {
    const tree = await repo.getPageTree();
    return { tree };
  });

  app.get<{
    Querystring: {
      q?: string;
      mode?: string;
      limit?: string;
      includeDeleted?: string;
    };
  }>('/api/pages/search', async (request) => {
    const query = request.query.q ?? '';
    const rawMode = request.query.mode ?? 'hybrid';
    const mode: SearchMode =
      rawMode === 'text' || rawMode === 'semantic' || rawMode === 'hybrid'
        ? rawMode
        : 'hybrid';
    const limit = request.query.limit ? Number(request.query.limit) : 20;
    const includeDeleted = request.query.includeDeleted === 'true';

    const results = await repo.searchPages({
      query,
      mode,
      limit: Number.isFinite(limit) ? limit : 20,
      includeDeleted,
    });
    return { results };
  });

  app.get<{ Params: { id: string } }>('/api/pages/:id', async (request, reply) => {
    const page = await repo.getPageById(request.params.id);
    if (!page) {
      return reply.code(404).send({ error: 'Page not found' });
    }
    return { page };
  });

  app.post<{ Body: CreatePageInput }>('/api/pages', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body.title !== 'string') {
      return reply.code(400).send({ error: 'Title is required' });
    }
    const created = await repo.createPage(body);
    return reply.code(201).send({ page: created });
  });

  app.patch<{ Params: { id: string }; Body: UpdatePageInput }>(
    '/api/pages/:id',
    async (request, reply) => {
      const updated = await repo.updatePage(request.params.id, request.body ?? {});
      if (!updated) {
        return reply.code(404).send({ error: 'Page not found' });
      }
      return { page: updated };
    },
  );

  app.delete<{ Params: { id: string } }>('/api/pages/:id', async (request, reply) => {
    const deleted = await repo.softDeletePage(request.params.id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Page not found or already deleted' });
    }
    return { page: deleted };
  });

  app.delete<{ Params: { id: string } }>(
    '/api/pages/:id/permanent',
    async (request, reply) => {
      const removed = await repo.permanentlyDeletePage(request.params.id);
      if (!removed) {
        return reply.code(404).send({ error: 'Page not found' });
      }
      return { success: true, id: request.params.id };
    },
  );

  app.post('/api/pages/trash/empty', async () => {
    const result = await repo.emptyTrash();
    return result;
  });

  app.post<{ Params: { id: string } }>(
    '/api/pages/:id/restore',
    async (request, reply) => {
      const restored = await repo.restorePage(request.params.id);
      if (!restored) {
        return reply.code(404).send({ error: 'Deleted page not found' });
      }
      return { page: restored };
    },
  );

  app.post<{ Body: QuickInsightInput }>(
    '/api/insights/quick',
    async (request, reply) => {
      const text = request.body?.text?.trim();
      if (!text) {
        return reply.code(400).send({ error: 'Insight text is required' });
      }
      const inboxPage = await repo.appendQuickInsight({
        text,
        tags: request.body.tags,
      });
      return reply.code(201).send({ page: inboxPage });
    },
  );

  // =========================================================================
  // DATABASE TASKS (TABLE & KANBAN BOARD)
  // =========================================================================

  app.get<{ Querystring: { includeDeleted?: string } }>(
    '/api/database/tasks',
    async (request) => {
      const includeDeleted = request.query.includeDeleted === 'true';
      const tasks = await repo.listDatabaseTasks(includeDeleted);
      return { tasks };
    },
  );

  app.post<{ Body: CreateDatabaseTaskInput }>(
    '/api/database/tasks',
    async (request, reply) => {
      const body = request.body ?? { task: 'New Task' };
      const created = await repo.createDatabaseTask({
        ...body,
        task: body.task ?? 'New Task',
      });
      return reply.code(201).send({ task: created });
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateDatabaseTaskInput }>(
    '/api/database/tasks/:id',
    async (request, reply) => {
      const updated = await repo.updateDatabaseTask(
        request.params.id,
        request.body ?? {},
      );
      if (!updated) {
        return reply.code(404).send({ error: 'Database task not found' });
      }
      return { task: updated };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/database/tasks/:id/cycle-status',
    async (request, reply) => {
      const updated = await repo.cycleDatabaseTaskStatus(request.params.id);
      if (!updated) {
        return reply.code(404).send({ error: 'Database task not found' });
      }
      return { task: updated };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/database/tasks/:id',
    async (request, reply) => {
      const deleted = await repo.softDeleteDatabaseTask(request.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'Database task not found' });
      }
      return { task: deleted };
    },
  );

  // =========================================================================
  // PAGE COMMENTS & REPLIES
  // =========================================================================

  app.get<{ Querystring: { pageId?: string; includeDeleted?: string } }>(
    '/api/comments',
    async (request) => {
      const includeDeleted = request.query.includeDeleted === 'true';
      const comments = await repo.listPageComments(request.query.pageId, includeDeleted);
      return { comments };
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/pages/:id/comments',
    async (request) => {
      const comments = await repo.listPageComments(request.params.id, false);
      return { comments };
    },
  );

  app.post<{ Params: { id: string }; Body: Omit<CreatePageCommentInput, 'pageId'> }>(
    '/api/pages/:id/comments',
    async (request, reply) => {
      const bodyText = request.body?.body?.trim();
      if (!bodyText) {
        return reply.code(400).send({ error: 'Comment body is required' });
      }
      const created = await repo.createPageComment({
        pageId: request.params.id,
        authorName: request.body.authorName,
        authorInitials: request.body.authorInitials,
        quotedText: request.body.quotedText ?? 'Selected text',
        body: bodyText,
      });
      return reply.code(201).send({ comment: created });
    },
  );

  app.post<{ Params: { threadId: string }; Body: AddCommentReplyInput }>(
    '/api/comments/:threadId/replies',
    async (request, reply) => {
      const bodyText = request.body?.body?.trim();
      if (!bodyText) {
        return reply.code(400).send({ error: 'Reply body is required' });
      }
      const updated = await repo.addCommentReply(request.params.threadId, {
        authorName: request.body.authorName,
        authorInitials: request.body.authorInitials,
        body: bodyText,
      });
      if (!updated) {
        return reply.code(404).send({ error: 'Comment thread not found' });
      }
      return { comment: updated };
    },
  );

  app.delete<{ Params: { threadId: string } }>(
    '/api/comments/:threadId',
    async (request, reply) => {
      const deleted = await repo.softDeletePageComment(request.params.threadId);
      if (!deleted) {
        return reply.code(404).send({ error: 'Comment thread not found' });
      }
      return { comment: deleted };
    },
  );

  // =========================================================================
  // DIAGRAMS (MERMAID, EXCALIDRAW, DRAW.IO)
  // =========================================================================

  app.get<{ Querystring: { pageId?: string } }>('/api/diagrams', async (request) => {
    const diagrams = await repo.listDiagrams(request.query.pageId, false);
    return { diagrams };
  });

  app.post<{ Body: UpsertDiagramInput }>('/api/diagrams', async (request, reply) => {
    const body = request.body;
    if (!body || !body.pageId || !body.kind) {
      return reply.code(400).send({ error: 'pageId and kind are required' });
    }
    const diagram = await repo.upsertDiagram({
      ...body,
      title: body.title ?? `${body.kind} Diagram`,
    });
    return reply.code(201).send({ diagram });
  });

  app.delete<{ Params: { id: string } }>(
    '/api/diagrams/:id',
    async (request, reply) => {
      const deleted = await repo.softDeleteDiagram(request.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'Diagram not found' });
      }
      return { diagram: deleted };
    },
  );

  // =========================================================================
  // AUTH / SSO SESSION
  // =========================================================================

  app.post<{ Body: AuthLoginInput }>('/api/auth/login', async (request, reply) => {
    const body = request.body ?? {};
    const email = body.email?.trim() || 'philip@acme.inc';
    const authMethod = body.ssoProvider ?? 'Email & Password';

    if (!body.ssoProvider && !body.email) {
      return reply.code(400).send({ error: 'Email or SSO provider is required' });
    }

    const namePart = email.split('@')[0] ?? 'Philip';
    const displayName =
      namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._-]/g, ' ');
    const initials = displayName.slice(0, 2).toUpperCase();

    const session: AuthSessionResponse = {
      authenticated: true,
      user: {
        id: 'user-philip-1',
        name: displayName,
        initials,
        email,
        workspace: 'Product Management',
        authMethod,
      },
      token: `mh_sess_${Buffer.from(`${email}:${Date.now()}`).toString('base64url')}`,
      issuedAt: new Date().toISOString(),
    };

    return reply.code(200).send(session);
  });

  // =========================================================================
  // AI COPILOT (NVIDIA NIM / GEMINI BYOK / LOCAL RAG) & GIT EXPORT & MCP
  // =========================================================================

  app.post<{ Body: AiChatRequest }>('/api/ai/chat', async (request, reply) => {
    const question = request.body?.question?.trim();
    if (!question) {
      return reply.code(400).send({ error: 'Question is required' });
    }
    const response = await aiService.answerQuestion(repo, request.body);
    return response;
  });

  // =========================================================================
  // BULK SECOND BRAIN / MARKDOWN IMPORTER ENGINE
  // =========================================================================

  app.post<{
    Body: {
      files?: RawMarkdownFileEntry[];
      useSampleSecondBrain?: boolean;
      conflictStrategy?: 'upsert' | 'skip';
      rootParentId?: string | null;
      defaultTags?: string[];
    };
  }>('/api/import/markdown-bulk', async (request, reply) => {
    const body = request.body ?? {};
    const filesToImport =
      body.useSampleSecondBrain || (!body.files || body.files.length === 0)
        ? body.useSampleSecondBrain
          ? createSampleSecondBrainBatch()
          : (body.files ?? [])
        : body.files;

    if (filesToImport.length === 0) {
      return reply
        .code(400)
        .send({ error: 'Provide files array or set useSampleSecondBrain=true' });
    }

    const conflictStrategy = body.conflictStrategy === 'skip' ? 'skip' : 'upsert';
    const existingPages = await repo.listPages(false);
    const plan = planBulkVaultImport(filesToImport, existingPages, {
      conflictStrategy,
      rootParentId: body.rootParentId ?? null,
      defaultTags: body.defaultTags,
    });

    const upsertStats = await repo.upsertPagesBatch(plan.pagesToUpsert, conflictStrategy);
    const allActivePages = await repo.listPages(true);

    const responsePayload: BulkImportApiResponse = {
      importedAt: new Date().toISOString(),
      notesProcessed: plan.notesProcessed,
      folderPagesCreated: plan.folderPagesCreated,
      createdCount: upsertStats.createdCount,
      updatedCount: upsertStats.updatedCount,
      skippedCount: upsertStats.skippedCount,
      wikiLinksResolved: plan.wikiLinksResolved,
      discoveredTags: plan.discoveredTags,
      pages: allActivePages,
    };

    return reply.code(201).send(responsePayload);
  });

  app.post<{
    Body: {
      directoryPath?: string;
      conflictStrategy?: 'upsert' | 'skip';
      maxFiles?: number;
    };
  }>('/api/import/directory', async (request, reply) => {
    const body = request.body ?? {};
    const baseVaultRoot = path.resolve(
      process.env.SECOND_BRAIN_DIR || '/home/ubuntu/mind',
    );
    const requestedSubpath = body.directoryPath?.trim();
    let targetDir = baseVaultRoot;
    if (requestedSubpath && requestedSubpath !== '/home/ubuntu/mind') {
      const candidate = path.resolve(baseVaultRoot, requestedSubpath);
      if (
        candidate === baseVaultRoot ||
        candidate.startsWith(baseVaultRoot + path.sep)
      ) {
        targetDir = candidate;
      }
    }

    const scannedFiles = scanMarkdownDirectoryRecursively(
      targetDir,
      Math.min(Math.max(body.maxFiles ?? 250, 1), 500),
    );

    const filesToImport =
      scannedFiles.length > 0 ? scannedFiles : createSampleSecondBrainBatch();

    const conflictStrategy = body.conflictStrategy === 'skip' ? 'skip' : 'upsert';
    const existingPages = await repo.listPages(false);
    const plan = planBulkVaultImport(filesToImport, existingPages, {
      conflictStrategy,
      defaultTags: ['vault-sync'],
    });

    const upsertStats = await repo.upsertPagesBatch(plan.pagesToUpsert, conflictStrategy);
    const allActivePages = await repo.listPages(true);

    const responsePayload: BulkImportApiResponse = {
      importedAt: new Date().toISOString(),
      notesProcessed: plan.notesProcessed,
      folderPagesCreated: plan.folderPagesCreated,
      createdCount: upsertStats.createdCount,
      updatedCount: upsertStats.updatedCount,
      skippedCount: upsertStats.skippedCount,
      wikiLinksResolved: plan.wikiLinksResolved,
      discoveredTags: plan.discoveredTags,
      pages: allActivePages,
    };

    return reply.code(201).send(responsePayload);
  });

  app.get('/api/git/export', async () => {
    const snapshot = await repo.exportGitSnapshot();
    return snapshot;
  });

  // =========================================================================
  // MEDIA & ICON ASSETS (Database / Store Persistence)
  // =========================================================================
  const ALLOWED_ASSET_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]);
  const MAX_ASSET_BYTES = 2.5 * 1024 * 1024;

  app.post<{
    Body: {
      filename?: string;
      mimeType?: string;
      dataBase64?: string;
    };
  }>('/api/assets', async (request, reply) => {
    const body = request.body ?? {};
    const rawMime = (body.mimeType ?? '').toLowerCase().trim();
    const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
    const rawData = body.dataBase64 ?? '';

    if (!ALLOWED_ASSET_MIME_TYPES.has(mimeType)) {
      return reply.code(400).send({
        error: 'Tipo de imagem não suportado. Use PNG, JPG, WebP, GIF ou SVG.',
      });
    }

    const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '').trim();
    if (!cleanBase64) {
      return reply.code(400).send({ error: 'Conteúdo da imagem ausente.' });
    }

    const decoded = Buffer.from(cleanBase64, 'base64');
    if (decoded.byteLength === 0 || decoded.byteLength > MAX_ASSET_BYTES) {
      return reply.code(400).send({
        error: 'Imagem inválida ou maior que o limite de 2,5 MB.',
      });
    }

    const asset = await repo.createAsset({
      filename: body.filename?.trim() || 'icon-upload',
      mimeType,
      dataBase64: cleanBase64,
    });

    return reply.code(201).send({
      asset: {
        id: asset.id,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        url: asset.url,
        createdAt: asset.createdAt,
      },
    });
  });

  app.get<{ Params: { id: string } }>('/api/assets/:id', async (request, reply) => {
    const asset = await repo.getAssetById(request.params.id);
    if (!asset) {
      return reply.code(404).send({ error: 'Asset not found' });
    }

    const payload = Buffer.from(asset.dataBase64, 'base64');
    reply.header('Content-Type', asset.mimeType);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    if (asset.mimeType === 'image/svg+xml') {
      reply.header('Content-Security-Policy', 'sandbox');
    }
    return reply.send(payload);
  });

  app.get('/mcp', async () => {
    return {
      protocol: 'Model Context Protocol (MCP)',
      version: '2024-11-05',
      server: 'mind-hub-mcp',
      tools: mcpHandler.getTools(),
    };
  });

  app.post<{ Body: JsonRpcRequest }>('/mcp', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body.method !== 'string') {
      return reply.code(400).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid JSON-RPC request' },
      });
    }
    const rpcResponse = await mcpHandler.handleJsonRpc(body);
    return rpcResponse;
  });

  const staticDir = options.staticDir ?? process.env.STATIC_DIR;
  if (staticDir && fs.existsSync(staticDir)) {
    const resolvedStatic = path.resolve(staticDir);
    await app.register(fastifyStatic, {
      root: resolvedStatic,
      prefix: '/',
      wildcard: false,
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/mcp')) {
        return reply.code(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
