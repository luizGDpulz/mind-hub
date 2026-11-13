import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CalloutBlockView from './CalloutBlockView.vue';

describe('CalloutBlockView.vue', () => {
  const defaultProps = {
    node: {
      attrs: {
        type: 'note',
        icon: null,
      },
    },
    updateAttributes: vi.fn(),
  };

  const stubs = {
    NodeViewWrapper: {
      template: '<div class="mind-callout-wrapper" v-bind="$attrs"><slot /></div>',
    },
    NodeViewContent: {
      template: '<div class="mind-callout-content" />',
    },
  };

  it('renders clean Notion-style callout with default lightbulb emoji and light background', () => {
    const wrapper = mount(CalloutBlockView, {
      props: defaultProps,
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="callout-type-btn"]').text()).toContain('💡');
    expect(wrapper.find('[data-testid="callout-dropdown"]').exists()).toBe(false);
    expect(['#f8f9fa', 'rgb(248, 249, 250)']).toContain(
      (wrapper.element as HTMLElement).style.backgroundColor
    );
  });

  it('opens MindIconPicker dropdown to change tone, pick emoji, or pick Lucide icon', async () => {
    const updateAttrsMock = vi.fn();
    const wrapper = mount(CalloutBlockView, {
      props: {
        ...defaultProps,
        updateAttributes: updateAttrsMock,
      },
      global: { stubs },
    });

    await wrapper.find('[data-testid="callout-type-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="callout-dropdown"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mind-icon-picker"]').exists()).toBe(true);

    // Select 'tip' tone
    await wrapper.find('[data-testid="callout-option-tip"]').trigger('click');
    expect(updateAttrsMock).toHaveBeenCalledWith({ type: 'tip' });
    expect(wrapper.find('[data-testid="callout-dropdown"]').exists()).toBe(false);

    // Reopen and pick a Lucide vector icon
    await wrapper.find('[data-testid="callout-type-btn"]').trigger('click');
    await wrapper.find('[data-testid="icon-picker-tab-icons"]').trigger('click');
    await wrapper.find('[data-testid="lucide-option-Rocket"]').trigger('click');
    expect(updateAttrsMock).toHaveBeenCalledWith({ icon: 'lucide:Rocket' });
  });

  it('renders custom emoji or Lucide icon when set', () => {
    const emojiWrapper = mount(CalloutBlockView, {
      props: {
        ...defaultProps,
        node: {
          attrs: {
            type: 'warning',
            icon: '🔥',
          },
        },
      },
      global: { stubs },
    });

    expect(emojiWrapper.find('[data-testid="callout-type-btn"]').text()).toContain('🔥');

    const lucideWrapper = mount(CalloutBlockView, {
      props: {
        ...defaultProps,
        node: {
          attrs: {
            type: 'tip',
            icon: 'lucide:Target',
          },
        },
      },
      global: { stubs },
    });

    expect(lucideWrapper.find('[data-testid="callout-type-btn"] svg').exists()).toBe(true);
  });
});
