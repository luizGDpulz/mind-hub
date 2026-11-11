import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Copy, Link2, Trash2 } from 'lucide-vue-next';
import MindActionMenu from './MindActionMenu.vue';
import MindIconButton from './MindIconButton.vue';
import MindSubpageLink from './MindSubpageLink.vue';
import type { ActionMenuItem } from './types.js';

describe('@mind-hub/web — Atomic UI Components (Refs #27, #30)', () => {
  const sampleActions: ActionMenuItem[] = [
    { id: 'act-copy', label: 'Copiar link', icon: Link2, shortcut: 'Ctrl+Alt+L' },
    { id: 'act-clone', label: 'Duplicar página', icon: Copy, shortcut: 'Ctrl+D' },
    { id: 'act-lock', label: 'Bloquear página', toggle: true, active: false },
    { id: 'act-del', label: 'Mover para lixeira', icon: Trash2, danger: true, shortcut: 'Del' },
  ];

  it('renders MindIconButton with label, shortcut and emits click', async () => {
    const onClick = vi.fn();
    const wrapper = mount(MindIconButton, {
      props: {
        icon: Link2,
        label: 'Copiar link',
        shortcut: 'Ctrl+Alt+L',
        active: true,
      },
      attrs: {
        onClick,
      },
    });

    expect(wrapper.attributes('title')).toBe('Copiar link (Ctrl+Alt+L)');
    expect(wrapper.classes()).toContain('is-active');

    await wrapper.trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('MindActionMenu filters actions dynamically on search query', async () => {
    const wrapper = mount(MindActionMenu, {
      props: {
        items: sampleActions,
        pageMeta: {
          lastEditedAuthor: 'Luiz Pulz',
          lastEditedDate: '22 de set. de 2026',
          wordCount: 142,
        },
      },
    });

    expect(wrapper.findAll('.action-menu-row').length).toBe(4);

    const input = wrapper.find('[data-testid="action-menu-search-input"]');
    await input.setValue('duplicar');

    const visibleRows = wrapper.findAll('.action-menu-row');
    expect(visibleRows.length).toBe(1);
    expect(visibleRows[0]?.text()).toContain('Duplicar página');
  });

  it('MindActionMenu emits select on click and renders footer metadata', async () => {
    const wrapper = mount(MindActionMenu, {
      props: {
        items: sampleActions,
        pageMeta: {
          lastEditedAuthor: 'Luiz Pulz',
          lastEditedDate: '22 de set. de 2026',
          wordCount: 142,
        },
      },
    });

    const firstRow = wrapper.find('[data-testid="action-item-act-copy"]');
    await firstRow.trigger('click');

    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual(sampleActions[0]);

    const footer = wrapper.find('[data-testid="action-menu-footer"]');
    expect(footer.exists()).toBe(true);
    expect(footer.text()).toContain('Luiz Pulz');
    expect(footer.text()).toContain('142 palavras');
  });

  it('MindSubpageLink renders subpage item and emits navigate with pageId', async () => {
    const wrapper = mount(MindSubpageLink, {
      props: {
        page: {
          id: 'sub-acesso',
          slug: 'acesso',
          title: 'Acesso & Permissões',
          icon: '🔑',
          parentId: 'root-secullum',
          sortOrder: 1,
          contentMarkdown: '# Acesso',
          contentJson: { type: 'doc', content: [] },
          isFavorite: false,
          isInbox: false,
          tags: ['security'],
          embedding: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      },
    });

    expect(wrapper.text()).toContain('🔑');
    expect(wrapper.text()).toContain('Acesso & Permissões');

    await wrapper.trigger('click');
    expect(wrapper.emitted('navigate')?.[0]?.[0]).toBe('sub-acesso');
  });
});
