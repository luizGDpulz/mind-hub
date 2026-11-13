import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MindIconPicker from './MindIconPicker.vue';

describe('MindIconPicker.vue', () => {
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

  it('switches to Icons tab, filters Lucide icons, supports random and remove actions', async () => {
    const wrapper = mount(MindIconPicker, {
      props: {
        modelValue: '💡',
        allowRemove: true,
      },
    });

    await wrapper.find('[data-testid="icon-picker-tab-icons"]').trigger('click');
    expect(wrapper.find('[data-testid="lucide-option-Lightbulb"]').exists()).toBe(true);

    await wrapper.find('[data-testid="icon-picker-search"]').setValue('terminal');
    expect(wrapper.find('[data-testid="lucide-option-Terminal"]').exists()).toBe(true);

    await wrapper.find('[data-testid="lucide-option-Terminal"]').trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['lucide:Terminal']);

    await wrapper.find('[data-testid="icon-picker-random"]').trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(2);
    expect(String(wrapper.emitted('select')?.[1]?.[0])).toMatch(/^lucide:/);

    await wrapper.find('[data-testid="icon-picker-remove"]').trigger('click');
    expect(wrapper.emitted('remove')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null]);
  });
});
