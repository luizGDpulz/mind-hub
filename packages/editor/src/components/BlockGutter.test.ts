import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BlockGutter from './BlockGutter.vue';

describe('BlockGutter.vue', () => {
  it('does not render when visible is false', () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: false },
    });
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);
  });

  it('renders gutter controls (+ and ⠿) when visible is true', () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true, top: 40, left: 10 },
    });
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-gutter-add-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-gutter-handle-btn"]').exists()).toBe(true);
  });

  it('emits addBlock when + button is clicked', async () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true },
    });
    await wrapper.find('[data-testid="block-gutter-add-btn"]').trigger('click');
    expect(wrapper.emitted('addBlock')).toHaveLength(1);
  });

  it('opens block actions popover on grip click and emits action', async () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true },
    });

    expect(wrapper.find('[data-testid="block-actions-popover"]').exists()).toBe(false);

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="block-actions-popover"]').exists()).toBe(true);

    await wrapper.find('[data-testid="action-duplicate"]').trigger('click');
    expect(wrapper.emitted('action')).toBeTruthy();
    expect(wrapper.emitted('action')![0]).toEqual(['duplicate']);
    expect(wrapper.find('[data-testid="block-actions-popover"]').exists()).toBe(false);
  });

  it('emits turnInto when a block conversion option is selected', async () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true },
    });

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="turn-into-h1"]').trigger('click');

    expect(wrapper.emitted('turnInto')).toBeTruthy();
    expect(wrapper.emitted('turnInto')![0]).toEqual(['h1']);
  });
});
