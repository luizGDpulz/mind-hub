import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { markRaw } from 'vue';
import SlashMenu from './SlashMenu.vue';
import type { SlashMenuItem } from '../types.js';

describe('SlashMenu.vue', () => {
  const dummyItems: SlashMenuItem[] = [
    {
      id: 'p',
      title: 'Texto',
      description: 'Parágrafo de texto puro',
      category: 'basic',
      icon: markRaw({ template: '<div>T</div>' }) as any,
      keywords: ['paragraph'],
      action: () => {},
    },
    {
      id: 'mermaid',
      title: 'Diagrama Mermaid',
      description: 'Diagrama interativo SVG',
      category: 'media',
      icon: markRaw({ template: '<div>M</div>' }) as any,
      keywords: ['flowchart'],
      action: () => {},
    },
  ];

  it('renders nothing when visible is false', () => {
    const wrapper = mount(SlashMenu, {
      props: { visible: false, items: dummyItems },
    });
    expect(wrapper.find('[data-testid="slash-menu-shell"]').exists()).toBe(false);
  });

  it('renders items list and selects on click', async () => {
    const wrapper = mount(SlashMenu, {
      props: { visible: true, items: dummyItems, query: '' },
    });

    expect(wrapper.find('[data-testid="slash-menu-shell"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="slash-item"]')).toHaveLength(2);

    await wrapper.findAll('[data-testid="slash-item"]')[1]!.trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]![0]).toEqual(dummyItems[1]);
  });

  it('navigates with keyboard and emits select on Enter', async () => {
    const wrapper = mount(SlashMenu, {
      props: { visible: true, items: dummyItems, query: '' },
    });

    const input = wrapper.find('[data-testid="slash-search-input"]');
    // Arrow down selects second item
    await input.trigger('keydown', { key: 'ArrowDown' });
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('[data-testid="slash-item"]')[1]!.classes()).toContain('is-selected');

    // Enter executes the selected item
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]![0]).toEqual(dummyItems[1]);
  });
});
