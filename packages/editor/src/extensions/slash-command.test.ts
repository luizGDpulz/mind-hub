import { describe, it, expect } from 'vitest';
import { defineComponent, type Component } from 'vue';
import { SlashCommand, filterSlashItems } from './slash-command.js';
import type { SlashMenuItem } from '../types.js';

const DummyIcon: Component = defineComponent({ template: '<div>icon</div>' });

describe('SlashCommand Extension & Filter', () => {
  const dummyItems: SlashMenuItem[] = [
    {
      id: 'h1',
      title: 'Título 1',
      description: 'Cabeçalho de nível 1',
      category: 'basic',
      icon: DummyIcon,
      keywords: ['heading', 'header', 'h1'],
      action: () => {},
    },
    {
      id: 'mermaid',
      title: 'Diagrama Mermaid',
      description: 'Inserir fluxograma ou diagrama SVG',
      category: 'media',
      icon: DummyIcon,
      keywords: ['flowchart', 'graph', 'sequence'],
      action: () => {},
    },
    {
      id: 'callout',
      title: 'Callout',
      description: 'Caixa de destaque com ícone',
      category: 'highlight',
      icon: DummyIcon,
      keywords: ['aviso', 'dica', 'alert'],
      action: () => {},
    },
  ];

  it('filters items by title or keywords correctly', () => {
    expect(filterSlashItems(dummyItems, '')).toHaveLength(3);
    expect(filterSlashItems(dummyItems, 'mermaid')).toHaveLength(1);
    expect(filterSlashItems(dummyItems, 'mermaid')[0]!.id).toBe('mermaid');
    expect(filterSlashItems(dummyItems, 'flowchart')).toHaveLength(1);
    expect(filterSlashItems(dummyItems, 'dica')).toHaveLength(1);
    expect(filterSlashItems(dummyItems, 'dica')[0]!.id).toBe('callout');
  });

  it('instantiates SlashCommand extension properly', () => {
    const ext = SlashCommand.configure({
      items: dummyItems,
    });
    expect(ext.name).toBe('slashCommand');
  });
});
