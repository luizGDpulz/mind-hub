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
import type { TiptapDoc } from '@mind-hub/shared';

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('mind_pages_slug_unique').on(table.slug),
    index('mind_pages_parent_id_idx').on(table.parentId),
    index('mind_pages_deleted_at_idx').on(table.deletedAt),
    index('mind_pages_is_inbox_idx').on(table.isInbox),
    index('mind_pages_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);

export type DbPage = typeof pagesTable.$inferSelect;
export type DbPageInsert = typeof pagesTable.$inferInsert;
