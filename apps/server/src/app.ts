import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import type {
  AiChatRequest,
  CreatePageInput,
  QuickInsightInput,
  SearchMode,
  UpdatePageInput,
} from '@mind-hub/shared';
import { InMemoryPageRepository, type PageRepository } from './repository.js';
import { AiService } from './ai-service.js';
import { McpHandler, type JsonRpcRequest } from './mcp-handler.js';

export interface BuildAppOptions {
  repository?: PageRepository;
  geminiApiKey?: string;
  staticDir?: string;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const repo = options.repository ?? new InMemoryPageRepository();
  const aiService = new AiService(options.geminiApiKey ?? process.env.GEMINI_API_KEY);
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

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Engine', 'Mind-Hub-Fastify-Drizzle');
    return payload;
  });

  app.get('/healthz', async () => {
    const pages = await repo.listPages(false);
    return {
      status: 'ok',
      service: 'mind-hub-server',
      activePages: pages.length,
      timestamp: new Date().toISOString(),
    };
  });

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

  app.post<{ Body: AiChatRequest }>('/api/ai/chat', async (request, reply) => {
    const question = request.body?.question?.trim();
    if (!question) {
      return reply.code(400).send({ error: 'Question is required' });
    }
    const response = await aiService.answerQuestion(repo, request.body);
    return response;
  });

  app.get('/api/git/export', async () => {
    const snapshot = await repo.exportGitSnapshot();
    return snapshot;
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
