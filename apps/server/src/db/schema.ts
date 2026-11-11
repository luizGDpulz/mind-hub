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
  DatabasePriority,
  DatabaseStatus,
  DatabaseTagBadge,
  DiagramKind,
  DrawioLayerNode,
  ExcalidrawShapeItem,
  PageCommentReply,
  TiptapDoc,
} from '@mind-hub/shared';

export const pagesTable = pgTable(
  'mind_pages',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    slug: varchar('slug', { length: 255 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    icon: varchar('icon', { length: 32 }).notNull().default('📄'),
    parentId: varchar('parent_id', { length: 64 }),
    sortOrder: integer('sort_order').notNull().default(0),
    contentMarkdown: text('content_markdown').notNull().default(''),
    contentJson: jsonb('content_json').$type<TiptapDoc>().notNull(),
    isFavorite: boolean('is_favorite').notNull().default(false),
    isInbox: boolean('is_inbox').notNull().default(false),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    embedding: vector('embedding', { dimensions: 64 }),
    sourcePath: varchar('source_path', { length: 1024 }),
    sourceHash: varchar('source_hash', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('mind_pages_slug_unique').on(table.slug),
    index('mind_pages_parent_id_idx').on(table.parentId),
    index('mind_pages_deleted_at_idx').on(table.deletedAt),
    index('mind_pages_is_inbox_idx').on(table.isInbox),
    index('mind_pages_source_path_idx').on(table.sourcePath),
    index('mind_pages_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);

export const databaseTasksTable = pgTable(
  'mind_database_tasks',
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
    index('mind_db_tasks_status_idx').on(table.status),
    index('mind_db_tasks_deleted_at_idx').on(table.deletedAt),
  ],
);

export const pageCommentsTable = pgTable(
  'mind_page_comments',
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
    index('mind_page_comments_page_id_idx').on(table.pageId),
    index('mind_page_comments_deleted_at_idx').on(table.deletedAt),
  ],
);

export const diagramsTable = pgTable(
  'mind_diagrams',
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
    index('mind_diagrams_page_id_idx').on(table.pageId),
    index('mind_diagrams_kind_idx').on(table.kind),
    index('mind_diagrams_deleted_at_idx').on(table.deletedAt),
  ],
);

export type DbPage = typeof pagesTable.$inferSelect;
export type DbPageInsert = typeof pagesTable.$inferInsert;
export type DbDatabaseTask = typeof databaseTasksTable.$inferSelect;
export type DbPageComment = typeof pageCommentsTable.$inferSelect;
export type DbDiagram = typeof diagramsTable.$inferSelect;
