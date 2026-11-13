import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';
import type {
  AssetKind,
  DatabasePriority,
  DatabaseStatus,
  DatabaseTagBadge,
  DiagramKind,
  DrawioLayerNode,
  ExcalidrawShapeItem,
  GitHubSyncHistoryEntry,
  MindDoc,
  OkfPageType,
  PageCommentReply,
} from '@mind-hub/shared';

export const pagesTable = pgTable(
  'pages',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    slug: varchar('slug', { length: 255 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    icon: varchar('icon', { length: 32 }).notNull().default('📄'),
    pageType: varchar('page_type', { length: 32 }).$type<OkfPageType>().notNull().default('concept'),
    description: text('description').notNull().default(''),
    coverUrl: varchar('cover_url', { length: 1024 }),
    coverYPosition: integer('cover_y_position').notNull().default(50),
    parentId: varchar('parent_id', { length: 64 }),
    sortOrder: integer('sort_order').notNull().default(0),
    contentMarkdown: text('content_markdown').notNull().default(''),
    contentJson: jsonb('content_json').$type<MindDoc>().notNull(),
    isFavorite: boolean('is_favorite').notNull().default(false),
    isInbox: boolean('is_inbox').notNull().default(false),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    embedding: vector('embedding', { dimensions: 64 }),
    sourcePath: varchar('source_path', { length: 1024 }),
    sourceHash: varchar('source_hash', { length: 128 }),
    lastSyncedHash: varchar('last_synced_hash', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('pages_slug_unique').on(table.slug),
    index('pages_parent_id_idx').on(table.parentId),
    index('pages_deleted_at_idx').on(table.deletedAt),
    index('pages_is_inbox_idx').on(table.isInbox),
    index('pages_source_path_idx').on(table.sourcePath),
    index('pages_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);

export const tasksTable = pgTable(
  'tasks',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    rowNumber: integer('row_number').notNull(),
    task: varchar('task', { length: 500 }).notNull(),
    team: jsonb('team').$type<DatabaseTagBadge>().notNull(),
    tags: jsonb('tags').$type<DatabaseTagBadge[]>().notNull().default([]),
    assignees: jsonb('assignees').$type<string[]>().notNull().default([]),
    dueDate: varchar('due_date', { length: 64 }).notNull(),
    dueDateIso: varchar('due_date_iso', { length: 32 }).notNull(),
    budget: integer('budget').notNull().default(0),
    effort: integer('effort').notNull().default(1),
    status: varchar('status', { length: 32 }).$type<DatabaseStatus>().notNull().default('Backlog'),
    priority: varchar('priority', { length: 32 }).$type<DatabasePriority>().notNull().default('Medium'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('tasks_status_idx').on(table.status),
    index('tasks_deleted_at_idx').on(table.deletedAt),
  ],
);

export const pageCommentsTable = pgTable(
  'page_comments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    pageId: varchar('page_id', { length: 64 }).notNull(),
    authorName: varchar('author_name', { length: 128 }).notNull(),
    authorInitials: varchar('author_initials', { length: 8 }).notNull(),
    createdAtLabel: varchar('created_at_label', { length: 64 }).notNull(),
    quotedText: text('quoted_text').notNull().default(''),
    body: text('body').notNull(),
    replies: jsonb('replies').$type<PageCommentReply[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('page_comments_page_id_idx').on(table.pageId),
    index('page_comments_deleted_at_idx').on(table.deletedAt),
  ],
);

export const diagramsTable = pgTable(
  'diagrams',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    pageId: varchar('page_id', { length: 64 }).notNull(),
    kind: varchar('kind', { length: 32 }).$type<DiagramKind>().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    mermaidCode: text('mermaid_code'),
    excalidrawZoom: integer('excalidraw_zoom'),
    excalidrawShapes: jsonb('excalidraw_shapes').$type<ExcalidrawShapeItem[]>(),
    drawioNodes: jsonb('drawio_nodes').$type<DrawioLayerNode[]>(),
    drawioXml: text('drawio_xml'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('diagrams_page_id_idx').on(table.pageId),
    index('diagrams_kind_idx').on(table.kind),
    index('diagrams_deleted_at_idx').on(table.deletedAt),
  ],
);

export const pageAssetsTable = pgTable(
  'page_assets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    pageId: varchar('page_id', { length: 64 }),
    kind: varchar('kind', { length: 32 }).$type<AssetKind>().notNull().default('inline_image'),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    storagePath: varchar('storage_path', { length: 1024 }).notNull(),
    url: varchar('url', { length: 1024 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('page_assets_page_id_idx').on(table.pageId),
    index('page_assets_deleted_at_idx').on(table.deletedAt),
  ],
);

export const syncConfigsTable = pgTable(
  'sync_configs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    provider: varchar('provider', { length: 32 }).notNull().default('github'),
    repository: varchar('repository', { length: 255 }).notNull(),
    branch: varchar('branch', { length: 128 }).notNull().default('main'),
    encryptedToken: text('encrypted_token').notNull(),
    autoSyncEnabled: boolean('auto_sync_enabled').notNull().default(true),
    debounceSeconds: integer('debounce_seconds').notNull().default(120),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastCommitSha: varchar('last_commit_sha', { length: 128 }),
    lastError: text('last_error'),
    history: jsonb('history').$type<GitHubSyncHistoryEntry[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sync_configs_provider_unique').on(table.provider),
  ],
);

export type DbPage = typeof pagesTable.$inferSelect;
export type DbPageInsert = typeof pagesTable.$inferInsert;
export type DbTask = typeof tasksTable.$inferSelect;
export type DbPageComment = typeof pageCommentsTable.$inferSelect;
export type DbDiagram = typeof diagramsTable.$inferSelect;
export type DbPageAsset = typeof pageAssetsTable.$inferSelect;
export type DbSyncConfig = typeof syncConfigsTable.$inferSelect;
