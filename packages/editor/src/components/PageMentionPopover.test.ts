import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PageMentionPopover from './PageMentionPopover.vue';
import type { PageReference } from '../types.js';

describe('PageMentionPopover.vue', () => {
  const dummyPages: PageReference[] = [
    {
      id: 'p-1',
      title: 'Nota 1',
      icon: '📄',
      summary: 'Resumo da nota 1',
    },
    {
      id: 'p-2',
      title: 'Nota 2',
      icon: '🚀',
      summary: 'Resumo da nota 2',
    },
  ];

  it('renders suggestion menu when suggestionVisible is true', async () => {
    const wrapper = mount(PageMentionPopover, {
      props: {
        suggestionVisible: true,
        pages: dummyPages,
        query: '',
      },
    });

    expect(wrapper.find('[data-testid="page-mention-suggest-popover"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="suggest-page-item"]')).toHaveLength(2);

    await wrapper.findAll('[data-testid="suggest-page-item"]')[0]!.trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]![0]).toEqual(dummyPages[0]);
  });

  it('renders hover preview card when hoverPreviewVisible is true', async () => {
    const wrapper = mount(PageMentionPopover, {
      props: {
        hoverPreviewVisible: true,
        pages: dummyPages,
        activeHoverPage: dummyPages[1],
      },
    });

    expect(wrapper.find('[data-testid="page-mention-hover-card"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Nota 2');
    expect(wrapper.text()).toContain('Resumo da nota 2');

    await wrapper.find('[data-testid="hover-card-open-btn"]').trigger('click');
    expect(wrapper.emitted('openPage')).toBeTruthy();
    expect(wrapper.emitted('openPage')![0]![0]).toBe('p-2');
  });
});
