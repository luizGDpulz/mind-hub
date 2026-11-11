import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { diagramsTable, pageCommentsTable, pagesTable, tasksTable } from './db/schema.js';

const allTables = [pagesTable, tasksTable, pageCommentsTable, diagramsTable];

describe('@mind-hub/server — Drizzle schema naming (refs #22)', () => {
  it('uses clean physical table names without redundant project prefix', () => {
    expect(allTables.map((t) => getTableName(t))).toEqual([
      'pages',
      'tasks',
      'page_comments',
      'diagrams',
    ]);
  });

  it('never reintroduces the "mind_" prefix on tables or indexes', () => {
    for (const table of allTables) {
      const config = getTableConfig(table);
      expect(config.name.startsWith('mind_')).toBe(false);
      for (const idx of config.indexes) {
        const idxName = idx.config.name ?? '';
        expect(idxName.startsWith('mind_')).toBe(false);
        expect(idxName.startsWith(`${config.name}_`)).toBe(true);
      }
    }
  });
});
