import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MindIconPicker from './MindIconPicker.vue';
import { EMOJI_CATEGORIES, LUCIDE_ICON_CATALOG } from '../extensions/callout-icons.js';

describe('MindIconPicker.vue', () => {
  it('exposes the full Unicode emoji catalog and full Lucide library', () => {
    const totalEmojis = EMOJI_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
    expect(totalEmojis).toBeGreaterThan(1500);
    expect(LUCIDE_ICON_CATALOG.length).toBeGreaterThan(1000);
  });

  it('filters emojis by Portuguese/English keywords and emits select', async () => {
    const wrapper = mount(MindIconPicker, {
      props: {
        modelValue: '💡',
      },
    });

    expect(wrapper.find('[data-testid="mind-icon-picker"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Frase de destaque');

    const search = wrapper.find('[data-testid="icon-picker-search"]');
    await search.setValue('foguete');
    expect(wrapper.find('[data-testid="emoji-option-🚀"]').exists()).toBe(true);

    await wrapper.find('[data-testid="emoji-option-🚀"]').trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['🚀']);
  });

  it('switches to Icons tab, selects color, filters Lucide icons, supports upload and remove actions', async () => {
    const onUploadFile = vi.fn(async () => '/api/assets/uploaded-icon');
    const wrapper = mount(MindIconPicker, {
      props: {
        modelValue: '💡',
        allowRemove: true,
        allowUpload: true,
        onUploadFile,
      },
    });

    await wrapper.find('[data-testid="icon-picker-tab-icons"]').trigger('click');
    expect(wrapper.find('[data-testid="lucide-option-Lightbulb"]').exists()).toBe(true);

    await wrapper.find('[data-testid="icon-color-blue"]').trigger('click');
    await wrapper.find('[data-testid="icon-picker-search"]').setValue('terminal');
    expect(wrapper.find('[data-testid="lucide-option-Terminal"]').exists()).toBe(true);

    await wrapper.find('[data-testid="lucide-option-Terminal"]').trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['lucide:Terminal:blue']);

    await wrapper.find('[data-testid="icon-picker-random"]').trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(2);
    expect(String(wrapper.emitted('select')?.[1]?.[0])).toMatch(/^lucide:/);

    await wrapper.find('[data-testid="icon-picker-tab-upload"]').trigger('click');
    await wrapper.find('[data-testid="icon-upload-url-input"]').setValue('https://example.com/logo.svg');
    await wrapper.find('[data-testid="icon-upload-url-submit"]').trigger('click');
    expect(wrapper.emitted('select')?.[2]).toEqual(['https://example.com/logo.svg']);

    await wrapper.find('[data-testid="icon-picker-remove"]').trigger('click');
    expect(wrapper.emitted('remove')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null]);
  });
});
