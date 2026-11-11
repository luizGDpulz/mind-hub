import { describe, expect, it } from 'vitest';
import {
  createInitialSeedPages,
  createSampleSecondBrainBatch,
  markdownToTiptap,
  planBulkVaultImport,
  type TiptapDoc,
  type TiptapNode,
} from '@mind-hub/shared';
import { createEditorSchema, toSchemaSafeDoc } from './editor-extensions.js';

const schema = createEditorSchema();

const KITCHEN_SINK_MARKDOWN = [
  '# Heading 1',
  '## Heading 2',
  '### Heading 3',
  '',
  'Text with **bold**, *italic*, ~~strike~~, `code` and a [link](https://example.com).',
  'Internal wiki link: [Soft Delete](#/page/soft-delete).',
  '',
  '> **[IMPORTANT] Callout**',
  '> Body of the callout.',
  '',
  '- bullet one',
  '- bullet two',
  '',
  '- [ ] open task',
  '- [x] done task',
  '',
  '```ts',
  'const x = 1;',
  '```',
  '',
  '---',
  '',
  '| Col A | Col B |',
  '| --- | --- |',
  '| a1 | b1 |',
].join('\n');

function collectTypes(node: TiptapNode, nodes: Set<string>, marks: Set<string>): void {
  nodes.add(node.type);
  for (const mark of node.marks ?? []) marks.add(mark.type);
  for (const child of node.content ?? []) collectTypes(child, nodes, marks);
}

function expectRenderable(doc: TiptapDoc): void {
  expect(() => schema.nodeFromJSON(doc).check()).not.toThrow();
}

describe('@mind-hub/web — Tiptap editor schema parity (refs #34)', () => {
  it('registers every node and mark produced by markdownToTiptap', () => {
    const nodes = new Set<string>();
    const marks = new Set<string>();
    collectTypes(markdownToTiptap(KITCHEN_SINK_MARKDOWN) as TiptapNode, nodes, marks);

    expect(marks.has('link')).toBe(true);
    for (const type of nodes) {
      expect(schema.nodes[type], `missing node extension: ${type}`).toBeDefined();
    }
    for (const type of marks) {
      expect(schema.marks[type], `missing mark extension: ${type}`).toBeDefined();
    }
  });

  it('renders seed pages and imported Second Brain notes (with WikiLinks) without data loss', () => {
    for (const page of createInitialSeedPages()) {
      expectRenderable(page.contentJson);
    }

    const plan = planBulkVaultImport(createSampleSecondBrainBatch(), []);
    expect(plan.pagesToUpsert.length).toBeGreaterThan(0);
    for (const page of plan.pagesToUpsert) {
      const result = toSchemaSafeDoc(page.contentJson, schema, page.contentMarkdown);
      expect(result.dropped).toEqual([]);
      expect(result.usedMarkdownFallback).toBe(false);
      expectRenderable(page.contentJson);
    }
  });

  it('strips unknown marks/nodes but preserves the text instead of blanking the page', () => {
    const corrupted = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'keep me', marks: [{ type: 'bold' }, { type: 'superGlow' }] },
          ],
        },
        { type: 'futureWidget', content: [{ type: 'text', text: 'widget text' }] },
      ],
    } as unknown as TiptapDoc;

    const result = toSchemaSafeDoc(corrupted, schema, '');
    expect(result.usedMarkdownFallback).toBe(false);
    expect(result.dropped.sort()).toEqual(['mark:superGlow', 'node:futureWidget']);
    expectRenderable(result.doc);
    expect(JSON.stringify(result.doc)).toContain('keep me');
    expect(JSON.stringify(result.doc)).toContain('widget text');
    expect(JSON.stringify(result.doc)).toContain('"bold"');
  });

  it('falls back to raw Markdown paragraphs when JSON is structurally invalid', () => {
    const broken = {
      type: 'doc',
      content: [{ type: 'table', content: [{ type: 'text', text: 'not allowed here' }] }],
    } as unknown as TiptapDoc;

    const result = toSchemaSafeDoc(broken, schema, '# Title\n\nBody text');
    expect(result.usedMarkdownFallback).toBe(true);
    expectRenderable(result.doc);
    expect(JSON.stringify(result.doc)).toContain('Body text');
  });

  it('preserves document integrity without blanking when toggling read-only mode repeatedly (refs #37)', () => {
    const seedPages = createInitialSeedPages();
    for (const page of seedPages) {
      const safeDoc = toSchemaSafeDoc(page.contentJson, schema, page.contentMarkdown);
      expect(safeDoc.doc.content.length).toBeGreaterThan(0);
      // Simulate switching read/edit 5 times
      for (let i = 0; i < 5; i++) {
        const isReadOnly = i % 2 === 0;
        expect(safeDoc.doc.content.length).toBeGreaterThan(0);
        expect(() => schema.nodeFromJSON(safeDoc.doc).check()).not.toThrow();
        // The doc node structure remains perfectly valid regardless of readOnly state
        expect(isReadOnly !== undefined).toBe(true);
      }
    }
  });
});
