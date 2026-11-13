import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PageCoverBanner from './PageCoverBanner.vue';
import MindPageWorkspace from '../shell/MindPageWorkspace.vue';
import { useMindStore } from '../../stores/mind-store.js';
import { resolveMindAssetUrl } from '../../utils/asset-url.js';

describe('@mind-hub/web — PageCoverBanner & OKF Asset Resolution (Refs #90)', () => {
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

  it('renders image cover, repositions vertically and emits preset/remove events', async () => {
    const wrapper = mount(PageCoverBanner, {
      props: {
        coverUrl: './assets/covers/banner.png',
        coverYPosition: 35,
      },
    });

    const banner = wrapper.find('[data-testid="page-cover-banner"]');
    expect(banner.exists()).toBe(true);
    expect(banner.attributes('style')).toContain('/api/assets/by-path/assets/covers/banner.png');
    expect(banner.attributes('style')).toContain('center 35%');

    // Open cover picker and select a preset
    await wrapper.find('[data-testid="cover-change-btn"]').trigger('click');
    await wrapper.find('[data-testid="cover-preset-preset:sage"]').trigger('click');
    expect(wrapper.emitted('update:coverUrl')?.[0]).toEqual(['preset:sage']);

    // Reposition vertical framing
    await wrapper.find('[data-testid="cover-reposition-btn"]').trigger('click');
    const slider = wrapper.find('[data-testid="cover-y-slider"]');
    await slider.setValue('80');
    await wrapper.find('[data-testid="cover-save-position-btn"]').trigger('click');
    expect(wrapper.emitted('update:coverYPosition')?.[0]).toEqual([80]);

    // Remove cover
    await wrapper.find('[data-testid="cover-remove-btn"]').trigger('click');
    expect(wrapper.emitted('remove')?.length).toBe(1);
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
});
