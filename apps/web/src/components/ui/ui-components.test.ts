import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Copy, Link2, Trash2 } from 'lucide-vue-next';
import MindActionMenu from './MindActionMenu.vue';
import MindIconButton from './MindIconButton.vue';
import MindSubpageLink from './MindSubpageLink.vue';
import MindSidebarSearch from './MindSidebarSearch.vue';
import MindTrashModal from './MindTrashModal.vue';
import MindSearchModal from './MindSearchModal.vue';
import MindIconPickerModal from './MindIconPickerModal.vue';
import MindWorkspaceMenu from './MindWorkspaceMenu.vue';
import MindSidebarAppsMenu from './MindSidebarAppsMenu.vue';
import MindHelpVersionsMenu from './MindHelpVersionsMenu.vue';
import MindVersionHistoryModal from './MindVersionHistoryModal.vue';
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
          Teleport: true,
          Transition: false,
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
          Teleport: true,
          Transition: false,
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

  it('MindIconPickerModal renders tabs, filters emojis, handles technical presets, image URLs and remove (Issue #26)', async () => {
    const wrapper = mount(MindIconPickerModal, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.find('[data-testid="mind-icon-picker-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Escolher ícone');
    expect(wrapper.text()).toContain('Emojis');
    expect(wrapper.text()).toContain('Ícones Técnicos');
    expect(wrapper.text()).toContain('Link de Imagem');

    // Filter emojis
    const input = wrapper.find('[data-testid="icon-picker-search"]');
    await input.setValue('foguete');
    expect(wrapper.find('.emoji-grid').text()).toContain('🚀');

    // Click an emoji emits select and update:modelValue false
    const emojiBtn = wrapper.find('.emoji-grid-item');
    await emojiBtn.trigger('click');
    expect(wrapper.emitted('select')?.[0]?.[0]).toBe('🚀');
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe(false);

    // Click remove icon emits empty string
    const removeBtn = wrapper.find('[data-testid="icon-picker-remove-btn"]');
    await removeBtn.trigger('click');
    expect(wrapper.emitted('select')?.[1]?.[0]).toBe('');
  });

  it('MindTrashModal supports permanent delete and empty trash with two-step confirmation (Issue #46)', async () => {
    const sampleDeleted: MindPage[] = [
      {
        id: 'del-purge-1',
        slug: 'nota-lixo',
        title: 'Nota Para Apagar',
        icon: '🗑️',
        parentId: null,
        sortOrder: 1,
        contentMarkdown: 'Conteúdo para expurgar',
        contentJson: { type: 'doc', content: [] },
        isFavorite: false,
        isInbox: false,
        tags: ['teste'],
        embedding: [],
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-02T10:00:00Z',
        deletedAt: '2026-10-01T10:00:00Z',
      },
    ];

    const wrapper = mount(MindTrashModal, {
      props: {
        modelValue: true,
        deletedPages: sampleDeleted,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    // 1. Permanent delete: first click asks confirmation
    const purgeBtn = wrapper.find('[data-testid="purge-btn-del-purge-1"]');
    expect(purgeBtn.exists()).toBe(true);
    await purgeBtn.trigger('click');
    expect(purgeBtn.text()).toContain('Confirmar exclusão?');
    expect(wrapper.emitted('permanent-delete')).toBeUndefined();

    // Second click emits permanent-delete
    await purgeBtn.trigger('click');
    expect(wrapper.emitted('permanent-delete')?.[0]?.[0]).toBe('del-purge-1');

    // 2. Empty all trash: first click asks confirmation
    const emptyAllBtn = wrapper.find('[data-testid="empty-trash-btn"]');
    expect(emptyAllBtn.exists()).toBe(true);
    await emptyAllBtn.trigger('click');
    expect(emptyAllBtn.text()).toContain('Confirmar esvaziar tudo?');
    expect(wrapper.emitted('empty-trash')).toBeUndefined();

    // Second click emits empty-trash
    await emptyAllBtn.trigger('click');
    expect(wrapper.emitted('empty-trash')).toHaveLength(1);
  });

  it('MindWorkspaceMenu renders profile, version badge and triggers actions (Issue #46)', async () => {
    const wrapper = mount(MindWorkspaceMenu, {
      props: {
        modelValue: true,
        workspaceName: 'Mind de Teste',
        userEmail: 'user@pulz.dev.br',
        currentVersion: '0.2.0',
        repoUrl: 'https://github.com/luizGDpulz/mind-hub',
      },
    });

    expect(wrapper.find('[data-testid="workspace-menu-popover"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Mind de Teste');
    expect(wrapper.text()).toContain('v0.2.0');

    // Click settings action
    const settingsBtn = wrapper.find('[data-testid="workspace-settings-btn"]');
    await settingsBtn.trigger('click');
    expect(wrapper.emitted('open-settings')).toHaveLength(1);

    // Click import Second Brain action (Issue #70)
    const importBtn = wrapper.find('[data-testid="workspace-import-btn"]');
    expect(importBtn.text()).toContain('Importar Second Brain');
    await importBtn.trigger('click');
    expect(wrapper.emitted('open-import')).toHaveLength(1);

    // Click versions action
    const versionsBtn = wrapper.find('[data-testid="workspace-versions-btn"]');
    await versionsBtn.trigger('click');
    expect(wrapper.emitted('open-versions')).toHaveLength(1);
  });

  it('MindSidebarAppsMenu renders utility shortcuts and emits events (Issue #46)', async () => {
    const wrapper = mount(MindSidebarAppsMenu, {
      props: {
        modelValue: true,
        trashCount: 3,
      },
    });

    expect(wrapper.find('[data-testid="sidebar-apps-popover"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Lixeira');
    expect(wrapper.text()).toContain('3');

    // Click trash option
    const trashItem = wrapper.find('[data-testid="apps-trash-btn"]');
    await trashItem.trigger('click');
    expect(wrapper.emitted('open-trash')).toHaveLength(1);
  });

  it('MindVersionHistoryModal renders timeline and release highlights (Issue #46)', async () => {
    const sampleHistory = [
      {
        version: '0.2.0',
        releaseDate: '2026-11-11',
        milestoneTitle: 'M9: Notion-like UI',
        summary: 'Resumo da release 0.2.0',
        highlights: ['Destaque 1', 'Destaque 2'],
      },
    ];

    const wrapper = mount(MindVersionHistoryModal, {
      props: {
        modelValue: true,
        currentVersion: '0.2.0',
        repoUrl: 'https://github.com/luizGDpulz/mind-hub',
        versionHistory: sampleHistory,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    expect(wrapper.find('[data-testid="version-history-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('v0.2.0');
    expect(wrapper.text()).toContain('M9: Notion-like UI');
    expect(wrapper.text()).toContain('Resumo da release 0.2.0');
    expect(wrapper.text()).toContain('Destaque 1');
  });

  it('MindHelpVersionsMenu renders docs, support and vertical timeline with releases (Issue #46)', async () => {
    const sampleHistory = [
      {
        version: '0.2.0',
        releaseDate: '2026-11-11',
        milestoneTitle: 'M9: Notion-like UI',
        summary: 'Resumo da release 0.2.0',
        highlights: ['Destaque 1'],
      },
    ];

    const wrapper = mount(MindHelpVersionsMenu, {
      props: {
        modelValue: true,
        currentVersion: '0.2.0',
        versionHistory: sampleHistory,
        repoUrl: 'https://github.com/luizGDpulz/mind-hub',
      },
    });

    expect(wrapper.find('[data-testid="help-versions-popover"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Documentação');
    expect(wrapper.text()).toContain('Obter suporte');
    expect(wrapper.text()).toContain('Novidades');
    expect(wrapper.text()).toContain('Mind Hub 0.2.0');
    expect(wrapper.text()).toContain('Ver todos os lançamentos');

    // Click "Ver todos os lançamentos"
    const allReleasesRow = wrapper.find('[data-testid="help-action-all-releases"]');
    await allReleasesRow.trigger('click');
    expect(wrapper.emitted('open-all-releases')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe(false);
  });
});
