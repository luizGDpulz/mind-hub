import { nextTick } from 'vue';
import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MindEditor from './MindEditor.vue';

function setRect(
  el: Element,
  rect: { top: number; left: number; width: number; height: number }
) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      top: rect.top,
      left: rect.left,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => {},
    }),
  });
}

describe('MindEditor.vue', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

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

  it('shows the lateral block gutter on real EditorContent mount when hovering text OR left margin', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '<h1>Cabeçalho</h1><p>Segundo bloco</p>',
        enableFrontmatterHeader: false,
      },
      global: {
        stubs: {
          BubbleFormattingMenu: true,
        },
      },
    });

    // Wait for @tiptap/vue-3 EditorContent nextTick mount
    await nextTick();
    await nextTick();

    const canvas = wrapper.find('.mind-editor-canvas-container').element;
    const proseMirror = wrapper.find('.ProseMirror').element;
    const h1 = proseMirror.querySelector('h1')!;
    const p = proseMirror.querySelector('p')!;

    setRect(canvas, { top: 100, left: 200, width: 680, height: 200 });
    setRect(proseMirror, { top: 100, left: 200, width: 680, height: 200 });
    setRect(h1, { top: 100, left: 200, width: 680, height: 34 });
    setRect(p, { top: 142, left: 200, width: 680, height: 24 });

    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);

    // Hover in the LEFT margin (44px left of proseMirror) aligned with the second block <p>
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 156, clientY: 150, bubbles: true })
    );
    await nextTick();

    const gutterShell = wrapper.find('[data-testid="block-gutter-shell"]');
    expect(gutterShell.exists()).toBe(true);
    expect(gutterShell.find('[data-testid="block-gutter-add-btn"]').exists()).toBe(true);
    expect(gutterShell.find('[data-testid="block-gutter-handle-btn"]').exists()).toBe(true);

    // Move onto the gutter shell itself -> stays visible!
    const gutterBtn = gutterShell.find('[data-testid="block-gutter-handle-btn"]').element;
    gutterBtn.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 158, clientY: 150, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(true);

    // Open block menu, then hover h1 -> target stays locked while popover is open
    await gutterShell.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="block-actions-popover"]').exists()).toBe(true);
    const styleBefore = wrapper.find('[data-testid="block-gutter-shell"]').attributes('style');

    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 250, clientY: 112, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').attributes('style')).toBe(
      styleBefore
    );

    // Move far away after closing menu -> hides cleanly
    await wrapper.find('[data-testid="action-duplicate"]').trigger('click');
    await nextTick();
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 20, clientY: 150, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
