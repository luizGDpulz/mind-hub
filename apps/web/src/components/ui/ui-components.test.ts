import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Copy, Link2, Trash2 } from 'lucide-vue-next';
import MindActionMenu from './MindActionMenu.vue';
import MindIconButton from './MindIconButton.vue';
import MindSubpageLink from './MindSubpageLink.vue';
import MindSidebarSearch from './MindSidebarSearch.vue';
import MindTrashModal from './MindTrashModal.vue';
import MindSearchModal from './MindSearchModal.vue';
import type { ActionMenuItem } from './types.js';
import type { MindPage } from '@mind-hub/shared';

describe('@mind-hub/web — Atomic UI Components (Refs #27, #30, #31, #32, #33)', () => {
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

  it('MindSidebarSearch renders trigger button and emits open on click', async () => {
    const wrapper = mount(MindSidebarSearch);
    expect(wrapper.text()).toContain('Busque ou peça');
    expect(wrapper.text()).toContain('Ctrl+K');

    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toBeTruthy();
  });

  it('MindTrashModal renders deleted list, filters query and emits restore', async () => {
    const sampleDeleted: MindPage[] = [
      {
        id: 'del-1',
        slug: 'nota-velha',
        title: 'Nota Antiga de Reunião',
        icon: '🗑️',
        parentId: null,
        sortOrder: 1,
        contentMarkdown: 'Conteúdo antigo',
        contentJson: { type: 'doc', content: [] },
        isFavorite: false,
        isInbox: false,
        tags: ['reuniao'],
        embedding: [],
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-02T10:00:00Z',
        deletedAt: '2026-10-01T10:00:00Z',
        sourcePath: 'Work/Secullum/Reuniao.md',
      },
    ];

    const wrapper = mount(MindTrashModal, {
      props: {
        modelValue: true,
        deletedPages: sampleDeleted,
      },
      global: {
        stubs: {
          'q-dialog': {
            template: '<div><slot /></div>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Lixeira');
    expect(wrapper.text()).toContain('1');
    expect(wrapper.text()).toContain('Nota Antiga de Reunião');

    const restoreBtn = wrapper.find('[data-testid="restore-btn-del-1"]');
    expect(restoreBtn.exists()).toBe(true);
    await restoreBtn.trigger('click');

    expect(wrapper.emitted('restore')?.[0]?.[0]).toBe('del-1');
  });

  it('MindSearchModal renders split 2-columns with date groups and reactive preview', async () => {
    const samplePages: MindPage[] = [
      {
        id: 'p-1',
        slug: 'secullum',
        title: 'Secullum Core',
        icon: '⚡',
        parentId: null,
        sortOrder: 1,
        contentMarkdown: '# Secullum Core\nDocumentação de integração com banco de dados.',
        contentJson: { type: 'doc', content: [] },
        isFavorite: false,
        isInbox: false,
        tags: ['infra', 'secullum'],
        embedding: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        sourcePath: 'Projects/Secullum.md',
      },
      {
        id: 'p-2',
        slug: 'padrao-soft-delete',
        title: 'Padrão de Soft Delete Universal',
        icon: '📐',
        parentId: null,
        sortOrder: 2,
        contentMarkdown: '# Soft Delete Universal\nTodas as tabelas devem usar deleted_at.',
        contentJson: { type: 'doc', content: [] },
        isFavorite: false,
        isInbox: false,
        tags: ['padroes'],
        embedding: [],
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        deletedAt: null,
        sourcePath: '_Padrões/Soft Delete.md',
      },
    ];

    const wrapper = mount(MindSearchModal, {
      props: {
        modelValue: true,
        pages: samplePages,
        searchResults: [],
        searchQuery: '',
      },
      global: {
        stubs: {
          'q-dialog': {
            template: '<div><slot /></div>',
          },
        },
      },
    });

    // Shows recent groups when search query is empty
    expect(wrapper.text()).toContain('Hoje');
    expect(wrapper.text()).toContain('Semana passada');
    expect(wrapper.text()).toContain('Secullum Core');
    expect(wrapper.text()).toContain('Padrão de Soft Delete Universal');

    // Right column displays preview of active page
    expect(wrapper.find('.preview-page-title').text()).toBe('Secullum Core');
    expect(wrapper.find('.preview-content-box').text()).toContain('Documentação de integração');

    // Selecting a page emits select
    const row = wrapper.find('[data-testid="recent-page-p-1"]');
    await row.trigger('click');
    expect(wrapper.emitted('select')?.[0]?.[0]).toBe('p-1');
  });
});
