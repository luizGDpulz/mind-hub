import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PageTreeItem from '../PageTreeItem.vue';
import MindMovePageModal from './MindMovePageModal.vue';
import MindSettingsModal from './MindSettingsModal.vue';
import MindQuickCaptureModal from './MindQuickCaptureModal.vue';
import MindTreeContextMenu from './MindTreeContextMenu.vue';
import type { PageTreeNode, MindPage } from '@mind-hub/shared';

describe('PageTreeItem — Árvore de Arquivos com Context Menu e Renomeação Inline', () => {
  const sampleNode: PageTreeNode = {
    id: 'page-1',
    slug: 'pagina-1',
    title: 'Página Raiz',
    icon: '📁',
    parentId: null,
    children: [
      {
        id: 'page-1-1',
        slug: 'subpagina-1',
        title: 'Subpágina Filha',
        icon: '📄',
        parentId: 'page-1',
        children: [],
      } as unknown as PageTreeNode,
    ],
  } as unknown as PageTreeNode;

  it('emite select ao clicar na linha da página', async () => {
    const wrapper = mount(PageTreeItem, {
      props: {
        node: sampleNode,
        activePageId: 'other-page',
        depth: 0,
      },
    });

    await wrapper.find('[data-testid="page-tree-row"]').trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['page-1']);
  });

  it('emite contextmenu com coordenadas ao disparar right-click ou botão ...', async () => {
    const wrapper = mount(PageTreeItem, {
      props: {
        node: sampleNode,
        activePageId: 'page-1',
        depth: 0,
      },
    });

    await wrapper.find('[data-testid="page-tree-row"]').trigger('contextmenu');
    expect(wrapper.emitted('contextmenu')).toBeTruthy();

    const moreBtn = wrapper.find('[data-testid="tree-more-options-btn"]');
    await moreBtn.trigger('click');
    expect(wrapper.emitted('contextmenu')).toBeTruthy();
  });

  it('ativa input de renomeação inline quando renamingId coincide com node.id', async () => {
    const wrapper = mount(PageTreeItem, {
      props: {
        node: sampleNode,
        activePageId: 'page-1',
        renamingId: 'page-1',
        depth: 0,
      },
    });

    const renameInput = wrapper.find('[data-testid="tree-rename-input"]');
    expect(renameInput.exists()).toBe(true);

    await renameInput.setValue('Novo Título Renomeado');
    await renameInput.trigger('keydown.enter');

    expect(wrapper.emitted('rename-save')?.[0]).toEqual(['page-1', 'Novo Título Renomeado']);
  });

  it('obedece a propriedade forceExpanded para expandir ou recolher subpastas', async () => {
    const wrapper = mount(PageTreeItem, {
      props: {
        node: sampleNode,
        activePageId: 'page-1',
        depth: 0,
        forceExpanded: false,
      },
    });

    expect(wrapper.find('.tree-children').exists()).toBe(false);

    await wrapper.setProps({ forceExpanded: true });
    expect(wrapper.find('.tree-children').exists()).toBe(true);
  });
});

describe('MindMovePageModal — Mover Páginas com Prevenção de Ciclos', () => {
  const pages: MindPage[] = [
    {
      id: 'root-1',
      slug: 'root-1',
      title: 'Pasta Mestre',
      icon: '📁',
      parentId: null,
      sortOrder: 1,
      contentMarkdown: '',
      contentJson: { type: 'doc', content: [] },
      isFavorite: false,
      isInbox: false,
      tags: [],
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    },
    {
      id: 'child-1',
      slug: 'child-1',
      title: 'Filho 1',
      icon: '📄',
      parentId: 'root-1',
      sortOrder: 2,
      contentMarkdown: '',
      contentJson: { type: 'doc', content: [] },
      isFavorite: false,
      isInbox: false,
      tags: [],
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    },
    {
      id: 'child-1-1',
      slug: 'child-1-1',
      title: 'Neto 1',
      icon: '📄',
      parentId: 'child-1',
      sortOrder: 3,
      contentMarkdown: '',
      contentJson: { type: 'doc', content: [] },
      isFavorite: false,
      isInbox: false,
      tags: [],
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    },
    {
      id: 'other-root',
      slug: 'other-root',
      title: 'Outra Pasta',
      icon: '📁',
      parentId: null,
      sortOrder: 4,
      contentMarkdown: '',
      contentJson: { type: 'doc', content: [] },
      isFavorite: false,
      isInbox: false,
      tags: [],
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    },
  ] as unknown as MindPage[];

  it('desativa seleção da própria página e de seus descendentes para evitar ciclos', () => {
    const wrapper = mount(MindMovePageModal, {
      props: {
        modelValue: true,
        pageId: 'child-1',
        pages,
      },
      global: {
        stubs: { Teleport: true, Transition: false },
      },
    });

    const selfTarget = wrapper.find('[data-testid="move-dest-child-1"]');
    expect(selfTarget.classes()).toContain('is-disabled');

    const descTarget = wrapper.find('[data-testid="move-dest-child-1-1"]');
    expect(descTarget.classes()).toContain('is-disabled');

    const validTarget = wrapper.find('[data-testid="move-dest-other-root"]');
    expect(validTarget.classes()).not.toContain('is-disabled');
  });

  it('emite move com targetParentId null ao selecionar raiz', async () => {
    const wrapper = mount(MindMovePageModal, {
      props: {
        modelValue: true,
        pageId: 'child-1',
        pages,
      },
      global: {
        stubs: { Teleport: true, Transition: false },
      },
    });

    await wrapper.find('[data-testid="move-dest-root"]').trigger('click');
    await wrapper.find('[data-testid="confirm-move-btn"]').trigger('click');

    expect(wrapper.emitted('move')?.[0]).toEqual(['child-1', null]);
  });
});

describe('MindSettingsModal — Painel de Configurações em Abas Notion/Docmost', () => {
  it('alterna abas suavemente e dispara eventos de sincronização e exportação', async () => {
    const wrapper = mount(MindSettingsModal, {
      props: {
        modelValue: true,
        workspaceName: 'Mind Test Workspace',
        backendConnected: true,
        activePagesCount: 15,
        deletedPagesCount: 3,
        databaseTasksCount: 8,
      },
      global: {
        stubs: { Teleport: true, Transition: false },
      },
    });

    expect(wrapper.find('[data-testid="settings-panel-general"]').exists()).toBe(true);

    // Switch to Appearance tab
    await wrapper.find('[data-testid="settings-tab-appearance"]').trigger('click');
    expect(wrapper.find('[data-testid="settings-panel-appearance"]').exists()).toBe(true);

    // Switch to Sync tab
    await wrapper.find('[data-testid="settings-tab-sync"]').trigger('click');
    expect(wrapper.find('[data-testid="settings-panel-sync"]').exists()).toBe(true);

    await wrapper.find('[data-testid="sync-vault-action-btn"]').trigger('click');
    expect(wrapper.emitted('sync-server-vault')).toBeTruthy();

    await wrapper.find('[data-testid="export-markdown-action-btn"]').trigger('click');
    expect(wrapper.emitted('export-markdown')).toBeTruthy();

    // Switch to Storage tab
    await wrapper.find('[data-testid="settings-tab-storage"]').trigger('click');
    expect(wrapper.find('[data-testid="settings-panel-storage"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('15');
    expect(wrapper.text()).toContain('Páginas Ativas');
  });
});

describe('MindQuickCaptureModal — Captura Rápida com Seleção de Tags', () => {
  it('emite submit com texto e tag selecionada', async () => {
    const wrapper = mount(MindQuickCaptureModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: { Teleport: true, Transition: false },
      },
    });

    const input = wrapper.find('[data-testid="quick-insight-input"]');
    await input.setValue('Comprar novo SSD');

    const tagBtn = wrapper.find('[data-testid="quick-tag-tarefa"]');
    await tagBtn.trigger('click');

    await wrapper.find('[data-testid="quick-insight-submit"]').trigger('click');

    expect(wrapper.emitted('submit')?.[0]).toEqual(['Comprar novo SSD', ['tarefa']]);
  });
});

describe('MindTreeContextMenu — Ações Rápidas no Nó do Arquivo', () => {
  it('dispara ação selecionada e emite evento', async () => {
    const wrapper = mount(MindTreeContextMenu, {
      props: {
        modelValue: true,
        page: {
          id: 'page-abc',
          title: 'Nota Arquivada',
          isFavorite: false,
          updatedAt: '2026-11-12T15:30:00.000Z',
          authorName: 'Luiz Gustavo Dias Pulz',
        },
        x: 100,
        y: 150,
      },
      global: {
        stubs: { Teleport: true, Transition: false },
      },
    });

    // Valida Header estilo Notion
    expect(wrapper.find('.tree-context-caption').text()).toBe('Página');
    expect(wrapper.find('.tree-context-page-title').text()).toBe('Nota Arquivada');

    // Valida Footer de Auditoria estilo Notion
    expect(wrapper.find('.audit-caption').text()).toBe('Última edição');
    expect(wrapper.find('.audit-author-name').text()).toBe('Luiz Gustavo Dias Pulz');
    expect(wrapper.find('.audit-avatar').text()).toBe('L');

    // Valida divisores de seção
    expect(wrapper.findAll('.mind-dropdown-divider').length).toBeGreaterThan(0);

    // Valida clique e disparo de ação
    const duplicateBtn = wrapper.find('[data-testid="tree-context-action-duplicate"]');
    await duplicateBtn.trigger('click');

    expect(wrapper.emitted('action')?.[0]).toEqual(['duplicate', 'page-abc']);
  });
});
