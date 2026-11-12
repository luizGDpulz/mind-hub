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

  it('renders default note callout with label and pastel background', () => {
    const wrapper = mount(CalloutBlockView, {
      props: defaultProps,
      global: {
        stubs: {
          NodeViewWrapper: {
            template: '<div class="mind-callout-wrapper"><slot /></div>',
          },
          NodeViewContent: {
            template: '<div class="mind-callout-content" />',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Nota');
    expect(wrapper.find('[data-testid="callout-dropdown"]').exists()).toBe(false);
  });

  it('opens dropdown and allows selecting another callout type', async () => {
    const updateAttrsMock = vi.fn();
    const wrapper = mount(CalloutBlockView, {
      props: {
        ...defaultProps,
        updateAttributes: updateAttrsMock,
      },
      global: {
        stubs: {
          NodeViewWrapper: {
            template: '<div class="mind-callout-wrapper"><slot /></div>',
          },
          NodeViewContent: {
            template: '<div class="mind-callout-content" />',
          },
        },
      },
    });

    // Click to open dropdown
    await wrapper.find('[data-testid="callout-type-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="callout-dropdown"]').exists()).toBe(true);

    // Select 'tip'
    await wrapper.find('[data-testid="callout-option-tip"]').trigger('click');
    expect(updateAttrsMock).toHaveBeenCalledWith({ type: 'tip' });
    expect(wrapper.find('[data-testid="callout-dropdown"]').exists()).toBe(false);
  });

  it('renders custom emoji icon when set', () => {
    const wrapper = mount(CalloutBlockView, {
      props: {
        ...defaultProps,
        node: {
          attrs: {
            type: 'warning',
            icon: '🔥',
          },
        },
      },
      global: {
        stubs: {
          NodeViewWrapper: {
            template: '<div class="mind-callout-wrapper"><slot /></div>',
          },
          NodeViewContent: {
            template: '<div class="mind-callout-content" />',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('🔥');
    expect(wrapper.text()).toContain('Aviso');
  });
});

