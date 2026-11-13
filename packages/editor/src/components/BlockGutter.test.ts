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

  it('opens Transformar em submenu and emits turnInto when an option is selected', async () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true, nodeType: 'paragraph' },
    });

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="submenu-turn-into"]').exists()).toBe(false);

    await wrapper.find('[data-testid="menu-trigger-turn-into"]').trigger('click');
    expect(wrapper.find('[data-testid="submenu-turn-into"]').exists()).toBe(true);

    await wrapper.find('[data-testid="turn-into-h1"]').trigger('click');

    expect(wrapper.emitted('turnInto')).toBeTruthy();
    expect(wrapper.emitted('turnInto')![0]).toEqual(['h1']);
  });

  it('opens left-aligned Cor submenu with text/bg subselections, quick-access recent colors, and custom picker', async () => {
    window.localStorage.clear();
    const wrapper = mount(BlockGutter, {
      props: { visible: true, nodeTextColor: 'blue', nodeBgColor: 'yellow' },
    });

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    const popover = wrapper.find('[data-testid="block-actions-popover"]');
    expect(popover.exists()).toBe(true);
    expect(popover.classes()).not.toContain('is-flipped-right');

    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    expect(wrapper.find('[data-testid="submenu-color"]').exists()).toBe(true);

    // Open Text Color subselection
    await wrapper.find('[data-testid="submenu-color-text-trigger"]').trigger('mouseenter');
    expect(wrapper.find('[data-testid="submenu-color-text"]').exists()).toBe(true);
    await wrapper.find('[data-testid="text-color-purple"]').trigger('click');
    expect(wrapper.emitted('setColor')![0]).toEqual([{ textColor: 'purple' }]);

    // Re-open -> quick-access recent text color appears at top of Cor menu
    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    expect(wrapper.find('[data-testid="quick-last-text-color"]').exists()).toBe(true);

    // Open Background Color subselection & apply custom hex via MindColorPicker
    await wrapper.find('[data-testid="submenu-color-bg-trigger"]').trigger('mouseenter');
    expect(wrapper.find('[data-testid="submenu-color-bg"]').exists()).toBe(true);
    await wrapper.find('[data-testid="bg-color-green"]').trigger('click');
    expect(wrapper.emitted('setColor')![1]).toEqual([{ backgroundColor: 'green' }]);

    // Test custom picker (no native <input type="color">)
    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    await wrapper.find('[data-testid="submenu-color-text-trigger"]').trigger('mouseenter');
    await wrapper.find('[data-testid="custom-text-color-trigger"]').trigger('click');
    expect(wrapper.find('[data-testid="mind-color-picker"]').exists()).toBe(true);
    expect(wrapper.find('input[type="color"]').exists()).toBe(false);

    const hexInput = wrapper.find('[data-testid="picker-hex-input"]');
    await hexInput.setValue('#2f9e44');
    await wrapper.find('[data-testid="picker-apply-btn"]').trigger('click');
    expect(wrapper.emitted('setColor')![2]).toEqual([{ textColor: '#2f9e44' }]);

    // Quick access now exposes both recent text & background colors
    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    expect(wrapper.find('[data-testid="quick-last-text-color"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="quick-last-bg-color"]').exists()).toBe(true);
    await wrapper.find('[data-testid="quick-last-bg-color"]').trigger('click');
    expect(wrapper.emitted('setColor')![3]).toEqual([{ backgroundColor: 'green' }]);
  });

  it('shows group label when multiple blocks are selected', async () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true, selectedCount: 3 },
    });
    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    expect(wrapper.text()).toContain('3 blocos selecionados');
    expect(wrapper.find('[data-testid="action-delete"]').text()).toContain('Excluir 3 blocos');
  });

  it('filters actions, transformations, and colors via search input', async () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true },
    });

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    const input = wrapper.find('[data-testid="block-menu-search-input"]');
    await input.setValue('roxo');

    const results = wrapper.find('[data-testid="block-menu-search-results"]');
    expect(results.exists()).toBe(true);
    expect(results.find('[data-testid="text-color-purple"]').exists()).toBe(true);
    expect(results.find('[data-testid="bg-color-purple"]').exists()).toBe(true);
  });

  it('restricts Transformar em submenu to basic markdown blocks when basicBlocksOnly is true', async () => {
    const wrapper = mount(BlockGutter, {
      props: { visible: true, basicBlocksOnly: true },
    });

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-turn-into"]').trigger('click');

    expect(wrapper.find('[data-testid="turn-into-orderedList"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="turn-into-blockquote"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="turn-into-callout"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="turn-into-callout"]').text()).toContain('Frase de destaque');
    expect(wrapper.find('[data-testid="turn-into-mermaid"]').exists()).toBe(false);
  });
});
