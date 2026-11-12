import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { Editor } from '@tiptap/core';
import BubbleFormattingMenu from './BubbleFormattingMenu.vue';

describe('BubbleFormattingMenu.vue', () => {
  function createMockEditor() {
    const chainMock = {
      focus: vi.fn().mockReturnThis(),
      setParagraph: vi.fn().mockReturnThis(),
      toggleHeading: vi.fn().mockReturnThis(),
      toggleBulletList: vi.fn().mockReturnThis(),
      toggleTaskList: vi.fn().mockReturnThis(),
      toggleBlockquote: vi.fn().mockReturnThis(),
      toggleCallout: vi.fn().mockReturnThis(),
      toggleCodeBlock: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      toggleItalic: vi.fn().mockReturnThis(),
      toggleUnderline: vi.fn().mockReturnThis(),
      toggleStrike: vi.fn().mockReturnThis(),
      toggleCode: vi.fn().mockReturnThis(),
      unsetAllMarks: vi.fn().mockReturnThis(),
      clearNodes: vi.fn().mockReturnThis(),
      setLink: vi.fn().mockReturnThis(),
      unsetLink: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };

    return {
      isEditable: true,
      state: {
        selection: {
          empty: false,
        },
      },
      isActive: vi.fn().mockReturnValue(false),
      getAttributes: vi.fn().mockReturnValue({}),
      chain: vi.fn().mockReturnValue(chainMock),
      _chainMock: chainMock,
    };
  }

  const BubbleMenuStub = {
    template: '<div><slot /></div>',
  };

  it('renders toolbar buttons and executes toggleBold on click', async () => {
    const mockEditor = createMockEditor();
    const wrapper = mount(BubbleFormattingMenu, {
      props: {
        editor: mockEditor as unknown as Editor,
      },
      global: {
        stubs: {
          BubbleMenu: BubbleMenuStub,
        },
      },
    });

    expect(wrapper.find('[data-testid="bubble-formatting-menu"]').exists()).toBe(true);

    const boldBtn = wrapper.find('[data-testid="format-bold"]');
    await boldBtn.trigger('click');

    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockEditor._chainMock.toggleBold).toHaveBeenCalled();
    expect(mockEditor._chainMock.run).toHaveBeenCalled();
  });

  it('opens turn-into dropdown and changes block to Heading 1', async () => {
    const mockEditor = createMockEditor();
    const wrapper = mount(BubbleFormattingMenu, {
      props: {
        editor: mockEditor as unknown as Editor,
      },
      global: {
        stubs: {
          BubbleMenu: BubbleMenuStub,
        },
      },
    });

    expect(wrapper.find('[data-testid="bubble-turn-into-dropdown"]').exists()).toBe(false);

    await wrapper.find('[data-testid="bubble-turn-into-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="bubble-turn-into-dropdown"]').exists()).toBe(true);

    await wrapper.find('[data-testid="turn-into-h1"]').trigger('click');
    expect(mockEditor._chainMock.toggleHeading).toHaveBeenCalledWith({ level: 1 });
    expect(wrapper.find('[data-testid="bubble-turn-into-dropdown"]').exists()).toBe(false);
  });

  it('opens link popover and applies link URL', async () => {
    const mockEditor = createMockEditor();
    const wrapper = mount(BubbleFormattingMenu, {
      props: {
        editor: mockEditor as unknown as Editor,
      },
      global: {
        stubs: {
          BubbleMenu: BubbleMenuStub,
        },
      },
    });

    await wrapper.find('[data-testid="format-link"]').trigger('click');
    expect(wrapper.find('[data-testid="inline-link-popover"]').exists()).toBe(true);

    const input = wrapper.find('[data-testid="link-url-input"]');
    await input.setValue('https://pulz.dev.br');
    await wrapper.find('[data-testid="link-confirm-btn"]').trigger('click');

    expect(mockEditor._chainMock.setLink).toHaveBeenCalledWith({ href: 'https://pulz.dev.br' });
    expect(wrapper.find('[data-testid="inline-link-popover"]').exists()).toBe(false);
  });
});
