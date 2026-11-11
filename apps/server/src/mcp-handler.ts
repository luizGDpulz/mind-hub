import {
  planBulkVaultImport,
  type DatabasePriority,
  type DatabaseStatus,
  type RawMarkdownFileEntry,
  type SearchMode,
} from '@mind-hub/shared';
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
  {
    name: 'list_database_tasks',
    description: 'Lista todas as tarefas ativas da Database (Table & Kanban Board).',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Backlog', 'In Progress', 'In Review', 'Blocked', 'Done'],
          description: 'Filtro opcional de status',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_database_task',
    description: 'Cria uma nova linha/tarefa na Database do Mind Hub (Table & Kanban).',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Nome da tarefa' },
        status: {
          type: 'string',
          enum: ['Backlog', 'In Progress', 'In Review', 'Blocked', 'Done'],
          description: 'Status inicial',
        },
        priority: {
          type: 'string',
          enum: ['Low', 'Medium', 'High', 'Urgent'],
          description: 'Prioridade',
        },
        budget: { type: 'number', description: 'Orçamento em USD' },
        effort: { type: 'number', description: 'Pontos de esforço' },
      },
      required: ['task'],
    },
  },
  {
    name: 'add_page_comment',
    description: 'Adiciona um comentário em linha ou revisão em uma página do Mind Hub.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: { type: 'string', description: 'ID da página comentada' },
        quoted_text: { type: 'string', description: 'Trecho citado da página' },
        body: { type: 'string', description: 'Conteúdo do comentário' },
        author_name: { type: 'string', description: 'Autor do comentário' },
      },
      required: ['page_id', 'body'],
    },
  },
  {
    name: 'import_markdown_vault',
    description:
      'Importa em massa múltiplos arquivos Markdown (.md) com Frontmatter YAML, hierarquia de pastas e [[WikiLinks]] para o banco de dados do Mind Hub.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Lista de arquivos Markdown ({ path, content })',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
            },
          },
        },
        conflict_strategy: {
          type: 'string',
          enum: ['upsert', 'skip'],
          description: 'Estratégia em caso de página já existente (upsert ou skip)',
        },
      },
      required: ['files'],
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
                version: '0.2.0',
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

      case 'list_database_tasks': {
        const statusFilter = typeof args.status === 'string' ? args.status : undefined;
        const allTasks = await this.repo.listDatabaseTasks(false);
        const filtered = statusFilter
          ? allTasks.filter((t) => t.status === statusFilter)
          : allTasks;

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(filtered, null, 2),
              },
            ],
          },
        };
      }

      case 'create_database_task': {
        const task = typeof args.task === 'string' ? args.task : '';
        if (!task) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing required parameter: task' },
          };
        }
        const status =
          typeof args.status === 'string' ? (args.status as DatabaseStatus) : 'Backlog';
        const priority =
          typeof args.priority === 'string'
            ? (args.priority as DatabasePriority)
            : 'Medium';
        const budget = typeof args.budget === 'number' ? args.budget : 7500;
        const effort = typeof args.effort === 'number' ? args.effort : 2;

        const created = await this.repo.createDatabaseTask({
          task,
          status,
          priority,
          budget,
          effort,
        });

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(created, null, 2),
              },
            ],
          },
        };
      }

      case 'add_page_comment': {
        const pageId = typeof args.page_id === 'string' ? args.page_id : '';
        const body = typeof args.body === 'string' ? args.body : '';
        if (!pageId || !body) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Missing required parameters: page_id, body',
            },
          };
        }
        const quotedText = typeof args.quoted_text === 'string' ? args.quoted_text : 'General';
        const authorName = typeof args.author_name === 'string' ? args.author_name : 'AI Agent';

        const comment = await this.repo.createPageComment({
          pageId,
          quotedText,
          body,
          authorName,
        });

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(comment, null, 2),
              },
            ],
          },
        };
      }

      case 'import_markdown_vault': {
        const rawFiles = Array.isArray(args.files) ? args.files : [];
        const files: RawMarkdownFileEntry[] = [];
        for (const item of rawFiles) {
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            if (typeof obj.path === 'string' && typeof obj.content === 'string') {
              files.push({ path: obj.path, content: obj.content });
            }
          }
        }

        if (files.length === 0) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Missing or empty files array for import_markdown_vault',
            },
          };
        }

        const conflictStrategy =
          args.conflict_strategy === 'skip' ? 'skip' : 'upsert';
        const existingPages = await this.repo.listPages(false);
        const plan = planBulkVaultImport(files, existingPages, {
          conflictStrategy,
        });
        const upsertResult = await this.repo.upsertPagesBatch(
          plan.pagesToUpsert,
          conflictStrategy,
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    notesProcessed: plan.notesProcessed,
                    folderPagesCreated: plan.folderPagesCreated,
                    createdCount: upsertResult.createdCount,
                    updatedCount: upsertResult.updatedCount,
                    skippedCount: upsertResult.skippedCount,
                    wikiLinksResolved: plan.wikiLinksResolved,
                    discoveredTags: plan.discoveredTags,
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
