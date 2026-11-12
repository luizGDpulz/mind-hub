import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MindEditor from './MindEditor.vue';

describe('MindEditor.vue', () => {
  it('renders editor canvas and frontmatter header', () => {
    const wrapper = mount(MindEditor, {
      props: {
        modelValue: '<p>Olá mundo do Mind Hub</p>',
        frontmatter: {
          title: 'Arquitetura do Editor',
          tags: ['editor', 'tiptap'],
          status: 'ativo',
        },
      },
      global: {
        stubs: {
          EditorContent: {
            template: '<div class="mind-editor-content-stub"><slot /></div>',
          },
          BubbleFormattingMenu: {
            template: '<div class="bubble-menu-stub" />',
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="mind-editor-root"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mind-frontmatter-header"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('editor');
    expect(wrapper.text()).toContain('ativo');
  });

  it('emits save event on Ctrl+S keydown', async () => {
    const wrapper = mount(MindEditor, {
      props: {
        modelValue: '<p>Conteúdo</p>',
      },
      global: {
        stubs: {
          EditorContent: true,
          BubbleFormattingMenu: true,
        },
      },
    });

    await wrapper.find('[data-testid="mind-editor-root"]').trigger('keydown', {
      key: 's',
      ctrlKey: true,
    });

    expect(wrapper.emitted('save')).toBeTruthy();
  });

  it('hides frontmatter header when enableFrontmatterHeader is false', () => {
    const wrapper = mount(MindEditor, {
      props: {
        modelValue: '<p>Sem header</p>',
        enableFrontmatterHeader: false,
        frontmatter: { title: 'Oculto' },
      },
      global: {
        stubs: {
          EditorContent: true,
          BubbleFormattingMenu: true,
        },
      },
    });

    expect(wrapper.find('[data-testid="mind-frontmatter-header"]').exists()).toBe(false);
  });
});
