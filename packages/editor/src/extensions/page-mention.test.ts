import { describe, it, expect } from 'vitest';
import { PageMention, filterPages } from './page-mention.js';
import type { PageReference } from '../types.js';

describe('PageMention Extension & Filter', () => {
  const dummyPages: PageReference[] = [
    {
      id: 'p-1',
      title: 'Arquitetura do Homelab',
      slug: 'arquitetura-do-homelab',
      icon: '🏛️',
      summary: 'Especificação técnica do servidor Millennium Falcon',
    },
    {
      id: 'p-2',
      title: 'Decisões de Design System',
      slug: 'design-system',
      icon: '🎨',
      summary: 'Regras visuais mind-light-style e paleta de cores',
    },
  ];

  it('filters pages by query matching title or summary', () => {
    expect(filterPages(dummyPages, '')).toHaveLength(2);
    expect(filterPages(dummyPages, 'homelab')).toHaveLength(1);
    expect(filterPages(dummyPages, 'homelab')[0]!.id).toBe('p-1');
    expect(filterPages(dummyPages, '@design')).toHaveLength(1);
    expect(filterPages(dummyPages, '[[design')).toHaveLength(1);
    expect(filterPages(dummyPages, 'millennium')).toHaveLength(1);
  });

  it('instantiates PageMention node extension properly', () => {
    const ext = PageMention.configure({
      pages: dummyPages,
    });
    expect(ext.name).toBe('pageMention');
    expect(ext.type).toBe('node');
  });
});
