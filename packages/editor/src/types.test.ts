import { describe, it, expect } from 'vitest';
import type { EditorFrontmatter, PageReference } from './types.js';

describe('Editor Contracts', () => {
  it('correctly models frontmatter properties', () => {
    const meta: EditorFrontmatter = {
      title: 'Arquitetura do Mind Editor',
      tags: ['editor', 'tiptap', 'vue3'],
      status: 'ativo',
      project: 'Mind Hub',
      created: '2026-11-12',
    };

    expect(meta.title).toBe('Arquitetura do Mind Editor');
    expect(meta.tags).toHaveLength(3);
    expect(meta.status).toBe('ativo');
  });

  it('correctly models page reference structure', () => {
    const page: PageReference = {
      id: 'p-1',
      title: 'Nota de Teste',
      slug: 'nota-de-teste',
      icon: '📄',
      summary: 'Resumo da nota de teste',
    };

    expect(page.id).toBe('p-1');
    expect(page.title).toBe('Nota de Teste');
  });
});
