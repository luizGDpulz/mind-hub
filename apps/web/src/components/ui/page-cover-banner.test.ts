import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PageCoverBanner from './PageCoverBanner.vue';
import MindPageIcon from './MindPageIcon.vue';
import MindNotePreviewModal from './MindNotePreviewModal.vue';
import MindLibraryView from '../MindLibraryView.vue';
import MindPageWorkspace from '../shell/MindPageWorkspace.vue';
import { useMindStore } from '../../stores/mind-store.js';
import { resolveMindAssetUrl } from '../../utils/asset-url.js';

describe('@mind-hub/web — PageCoverBanner & OKF Asset Resolution (Refs #90, #96, #98, #99)', () => {
  it('resolves relative OKF asset paths into /api/assets/by-path/* URLs', () => {
    expect(resolveMindAssetUrl('./assets/covers/secullum-banner.png')).toBe(
      '/api/assets/by-path/assets/covers/secullum-banner.png',
    );
    expect(resolveMindAssetUrl('../assets/images/diagram.svg')).toBe(
      '/api/assets/by-path/assets/images/diagram.svg',
    );
    expect(resolveMindAssetUrl('/api/assets/asset-123')).toBe('/api/assets/asset-123');
    expect(resolveMindAssetUrl('https://cdn.example.com/cover.jpg')).toBe(
      'https://cdn.example.com/cover.jpg',
    );
  });

  it('renders image cover, repositions vertically via pointer drag and emits preset/remove events', async () => {
    const wrapper = mount(PageCoverBanner, {
      props: {
        coverUrl: './assets/covers/banner.png',
        coverYPosition: 50,
      },
    });

    const banner = wrapper.find('[data-testid="page-cover-banner"]');
    expect(banner.exists()).toBe(true);
    expect(banner.attributes('style')).toContain('/api/assets/by-path/assets/covers/banner.png');
    expect(banner.attributes('style')).toContain('center 50%');

    // Open cover picker and select a preset
    await wrapper.find('[data-testid="cover-change-btn"]').trigger('click');
    await wrapper.find('[data-testid="cover-preset-preset:sage"]').trigger('click');
    expect(wrapper.emitted('update:coverUrl')?.[0]).toEqual(['preset:sage']);

    // Reposition vertical framing via Notion-style pointer drag
    await wrapper.find('[data-testid="cover-reposition-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="cover-reposition-bar"]').text()).toBe(
      'Arraste a imagem para reposicionar',
    );
    await banner.trigger('pointerdown', { clientY: 100 });
    await banner.trigger('pointermove', { clientY: 60 });
    await banner.trigger('pointerup');
    await wrapper.find('[data-testid="cover-save-position-btn"]').trigger('click');
    expect(wrapper.emitted('update:coverYPosition')?.[0]).toEqual([68]);

    // Remove cover
    await wrapper.find('[data-testid="cover-remove-btn"]').trigger('click');
    expect(wrapper.emitted('remove')?.length).toBe(1);
  });

  it('renders blank File icon when note is empty and FileText when note has content (Refs #96)', () => {
    const blankWrapper = mount(MindPageIcon, {
      props: { icon: '', hasContent: false },
    });
    expect(
      blankWrapper.find('[data-testid="mind-page-default-icon"]').attributes('data-icon-variant'),
    ).toBe('blank');

    const filledWrapper = mount(MindPageIcon, {
      props: { icon: '', hasContent: true },
    });
    expect(
      filledWrapper.find('[data-testid="mind-page-default-icon"]').attributes('data-icon-variant'),
    ).toBe('filled');
  });

  it('opens MindNotePreviewModal when creating a child note from sidebar and links inline in parent (Refs #98)', async () => {
    setActivePinia(createPinia());
    const store = useMindStore();
    const parentId = store.activePage!.id;

    const child = await store.createSubpageAndLinkInParent(parentId, { openInModal: true });
    expect(child.title).toBe('Nova Nota');
    expect(store.noteModalPageId).toBe(child.id);

    const parentAfter = store.pages.find((p) => p.id === parentId)!;
    expect(parentAfter.contentMarkdown).toContain(child.id);

    const modalWrapper = mount(MindNotePreviewModal, {
      global: {
        stubs: {
          Teleport: true,
          MindEditor: {
            template: '<div><slot name="before-editor" /></div>',
          },
          MindIconPickerModal: true,
        },
      },
    });

    expect(modalWrapper.find('[data-testid="mind-note-preview-modal"]').exists()).toBe(true);
    expect(modalWrapper.find('[data-testid="note-modal-parent-info"]').text()).toContain(
      parentAfter.title,
    );
    expect(
      (modalWrapper.find('[data-testid="note-modal-title-input"]').element as HTMLInputElement)
        .value,
    ).toBe('Nova Nota');
    expect(modalWrapper.find('[data-testid="note-modal-quickstart"]').exists()).toBe(true);
  });

  it('MindPageWorkspace renders cover banner without static footer subpages section', async () => {
    setActivePinia(createPinia());
    const store = useMindStore();

    const active = store.activePage!;
    await store.updatePageMeta(active.id, {
      icon: '🚀',
      coverUrl: 'preset:sky',
      coverYPosition: 50,
    });

    // Create a child page — workspace must NOT render the legacy static footer section
    await store.createPage(
      {
        title: 'Subpágina Filha',
        parentId: active.id,
        contentMarkdown: '',
        tags: [],
      },
      { select: false },
    );

    const wrapper = mount(MindPageWorkspace, {
      global: {
        stubs: {
          'q-page-container': { template: '<div><slot /></div>' },
          'q-page': { template: '<div><slot /></div>' },
          MindEditor: {
            props: ['modelValue'],
            template: '<div><slot name="title" /></div>',
          },
          DatabaseViewBlock: true,
          DiagramEmbedsBlock: true,
          CleanLoginView: true,
          MindIconPickerModal: true,
        },
      },
    });

    expect(wrapper.find('[data-testid="page-cover-banner"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="page-header-icon"]').classes()).toContain(
      'is-overlapping-cover',
    );
    expect(wrapper.find('[data-testid="subpages-section"]').exists()).toBe(false);
  });

  it('synchronizes inline subpageBlock links when moving, deleting, and restoring notes (Refs #100)', async () => {
    setActivePinia(createPinia());
    const store = useMindStore();

    const parent = store.activePage!;
    const rootNote = await store.createPage(
      {
        title: 'Nota Independente',
        parentId: null,
        contentMarkdown: 'Conteúdo inicial',
        tags: [],
      },
      { select: false },
    );

    // 1. Move rootNote inside parent -> parent must gain inline subpageBlock link
    await store.movePage(rootNote.id, parent.id);
    const parentAfterMoveIn = store.pages.find((p) => p.id === parent.id)!;
    expect(parentAfterMoveIn.contentMarkdown).toContain(rootNote.id);
    expect(store.activeToast?.message).toBe('Moveu 1 nota');

    // 2. Soft-delete rootNote -> inline subpageBlock link must be removed from parent
    await store.softDeletePage(rootNote.id);
    const parentAfterDelete = store.pages.find((p) => p.id === parent.id)!;
    expect(parentAfterDelete.contentMarkdown).not.toContain(rootNote.id);

    // 3. Restore rootNote -> inline subpageBlock link must be restored in parent
    await store.restorePage(rootNote.id);
    const parentAfterRestore = store.pages.find((p) => p.id === parent.id)!;
    expect(parentAfterRestore.contentMarkdown).toContain(rootNote.id);

    // 4. Move rootNote back to root (null) -> inline subpageBlock link must be removed from parent
    await store.movePage(rootNote.id, null);
    const parentAfterMoveOut = store.pages.find((p) => p.id === parent.id)!;
    expect(parentAfterMoveOut.contentMarkdown).not.toContain(rootNote.id);
  });

  it('renders MindLibraryView with insights, hierarchy disclosure and database byte sizes (Refs #101)', async () => {
    setActivePinia(createPinia());

    const wrapper = mount(MindLibraryView);
    expect(wrapper.find('[data-testid="mind-library-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="library-total-db-size"]').text()).toMatch(/B|KB/);
    expect(wrapper.findAll('[data-testid="library-row-size"]').length).toBeGreaterThan(0);

    // Expand parent row in Minhas Notas hierarchy tab
    const expandBtn = wrapper.find('[data-testid="library-expand-page-teste"]');
    expect(expandBtn.exists()).toBe(true);
    await expandBtn.trigger('click');
    expect(wrapper.find('[data-testid="library-row-page-teste-interno"]').exists()).toBe(true);

    // Sort by database size
    await wrapper.find('[data-testid="library-sort-size"]').trigger('click');
    expect(wrapper.find('.col-size').attributes('aria-sort')).toBe('descending');
  });
});
