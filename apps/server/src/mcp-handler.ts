import type { SearchMode } from '@mind-hub/shared';
import type { PageRepository } from './repository.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const MCP_TOOLS: ReadonlyArray<McpToolSchema> = [
  {
    name: 'search_pages',
    description:
      'Busca textual, semântica (pgvector) ou híbrida em todas as páginas ativas do Mind Hub.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo ou pergunta de busca' },
        semantic_mode: {
          type: 'string',
          enum: ['text', 'semantic', 'hybrid'],
          description: 'Modo de busca (text, semantic ou hybrid)',
        },
        limit: { type: 'number', description: 'Limite máximo de resultados' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_page',
    description: 'Retorna o conteúdo completo em Markdown e metadados de uma página pelo ID.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: { type: 'string', description: 'ID único da página' },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'create_page',
    description: 'Cria uma nova página ou ADR estruturado em Markdown no Mind Hub.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da página' },
        content: { type: 'string', description: 'Conteúdo em Markdown puro' },
        parent_id: { type: 'string', description: 'ID opcional da página-mãe' },
        icon: { type: 'string', description: 'Emoji ou ícone opcional' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags da página',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'update_page',
    description: 'Atualiza programaticamente o conteúdo ou título de uma página existente.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: { type: 'string', description: 'ID da página a atualizar' },
        title: { type: 'string', description: 'Novo título opcional' },
        content: { type: 'string', description: 'Novo conteúdo em Markdown' },
      },
      required: ['page_id', 'content'],
    },
  },
];

export class McpHandler {
  private readonly repo: PageRepository;

  constructor(repo: PageRepository) {
    this.repo = repo;
  }

  getTools(): ReadonlyArray<McpToolSchema> {
    return MCP_TOOLS;
  }

  async handleJsonRpc(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = req.id ?? null;

    try {
      switch (req.method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: {
                name: 'mind-hub-mcp',
                version: '0.1.0',
              },
              capabilities: {
                tools: {},
              },
            },
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: MCP_TOOLS,
            },
          };

        case 'tools/call':
          return await this.handleToolCall(id, req.params ?? {});

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${req.method}`,
            },
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal MCP error';
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message,
        },
      };
    }
  }

  private async handleToolCall(
    id: string | number | null,
    params: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    const toolName = typeof params.name === 'string' ? params.name : '';
    const args =
      params.arguments && typeof params.arguments === 'object'
        ? (params.arguments as Record<string, unknown>)
        : {};

    switch (toolName) {
      case 'search_pages': {
        const query = typeof args.query === 'string' ? args.query : '';
        const rawMode = typeof args.semantic_mode === 'string' ? args.semantic_mode : 'hybrid';
        const mode: SearchMode =
          rawMode === 'text' || rawMode === 'semantic' || rawMode === 'hybrid'
            ? rawMode
            : 'hybrid';
        const limit = typeof args.limit === 'number' ? args.limit : 10;

        const results = await this.repo.searchPages({ query, mode, limit });
        const formatted = results.map((r) => ({
          id: r.page.id,
          title: r.page.title,
          slug: r.page.slug,
          score: r.score,
          snippet: r.snippet,
          tags: r.page.tags,
        }));

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(formatted, null, 2),
              },
            ],
          },
        };
      }

      case 'get_page': {
        const pageId =
          typeof args.page_id === 'string'
            ? args.page_id
            : typeof args.id === 'string'
              ? args.id
              : '';
        const page = await this.repo.getPageById(pageId);
        if (!page) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: `Page not found: ${pageId}` }],
            },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `# ${page.icon} ${page.title}\n\n${page.contentMarkdown}`,
              },
            ],
          },
        };
      }

      case 'create_page': {
        const title = typeof args.title === 'string' ? args.title : '';
        const content = typeof args.content === 'string' ? args.content : '';
        if (!title) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing required parameter: title' },
          };
        }
        const parentId = typeof args.parent_id === 'string' ? args.parent_id : null;
        const icon = typeof args.icon === 'string' ? args.icon : '📄';
        const tags = Array.isArray(args.tags)
          ? args.tags.filter((t): t is string => typeof t === 'string')
          : [];

        const created = await this.repo.createPage({
          title,
          contentMarkdown: content,
          parentId,
          icon,
          tags,
        });

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    id: created.id,
                    slug: created.slug,
                    title: created.title,
                    updatedAt: created.updatedAt,
                  },
                  null,
                  2,
                ),
              },
            ],
          },
        };
      }

      case 'update_page': {
        const pageId =
          typeof args.page_id === 'string'
            ? args.page_id
            : typeof args.id === 'string'
              ? args.id
              : '';
        const content = typeof args.content === 'string' ? args.content : undefined;
        const title = typeof args.title === 'string' ? args.title : undefined;

        const updated = await this.repo.updatePage(pageId, {
          title,
          contentMarkdown: content,
        });

        if (!updated) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: `Page not found: ${pageId}` }],
            },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    id: updated.id,
                    slug: updated.slug,
                    title: updated.title,
                    updatedAt: updated.updatedAt,
                  },
                  null,
                  2,
                ),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown MCP tool: ${toolName}`,
          },
        };
    }
  }
}
