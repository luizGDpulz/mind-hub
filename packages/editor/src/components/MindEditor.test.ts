import { nextTick } from 'vue';
import { describe, it, expect, afterEach, vi } from 'vitest';
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

  it('renders editor canvas and collapsed frontmatter header, expanding to show tags', async () => {
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
    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="toggle-raw-yaml-mode"]').exists()).toBe(false);

    await wrapper.find('[data-testid="toggle-frontmatter-collapse"]').trigger('click');

    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="toggle-raw-yaml-mode"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('editor');
    expect(
      (wrapper.find('[data-testid="status-property-input"]').element as HTMLInputElement).value
    ).toBe('ativo');
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

  it('applies block text & background color via gutter menu and supports expanded-left D&D indicator', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '<h1>Cabeçalho</h1><p>Bloco colorido</p>',
        enableFrontmatterHeader: false,
      },
      global: {
        stubs: {
          BubbleFormattingMenu: true,
        },
      },
    });

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

    // Hover <p> and open color submenu
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 156, clientY: 150, bubbles: true })
    );
    await nextTick();

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    await nextTick();

    await wrapper.find('[data-testid="text-color-blue"]').trigger('click');
    await nextTick();
    expect(wrapper.find('.ProseMirror p').attributes('data-block-color')).toBe('blue');

    // Re-open menu and apply pastel background highlight
    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    await nextTick();
    await wrapper.find('[data-testid="bg-color-yellow"]').trigger('click');
    await nextTick();
    expect(wrapper.find('.ProseMirror p').attributes('data-block-bg')).toBe('yellow');

    // Simulate left-margin D&D of <p> above <h1>
    const gripBtn = wrapper.find('[data-testid="block-gutter-handle-btn"]').element;
    const mockTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      clearData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    const dragStartEvent = new Event('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(dragStartEvent, 'dataTransfer', { value: mockTransfer });
    gripBtn.dispatchEvent(dragStartEvent);

    const dragOverEvent = new MouseEvent('dragover', {
      clientX: 110,
      clientY: 106,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(dragOverEvent, 'dataTransfer', { value: mockTransfer });
    window.dispatchEvent(dragOverEvent);
    await nextTick();

    expect(wrapper.find('[data-testid="block-drop-indicator"]').exists()).toBe(true);

    const dropEvent = new MouseEvent('drop', {
      clientX: 110,
      clientY: 106,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: mockTransfer });
    window.dispatchEvent(dropEvent);
    await nextTick();

    expect(wrapper.find('[data-testid="block-drop-indicator"]').exists()).toBe(false);
    const firstChild = wrapper.find('.ProseMirror').element.firstElementChild;
    expect(firstChild?.tagName.toLowerCase()).toBe('p');
    expect(firstChild?.textContent).toBe('Bloco colorido');

    wrapper.unmount();
  });

  it('hides YAML properties by default on blank notes until triggered via --- or openProperties', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '<p>--</p>',
        title: '',
        showTitle: true,
        basicBlocksOnly: true,
        frontmatter: {},
      },
      global: {
        stubs: {
          BubbleFormattingMenu: true,
        },
      },
    });

    await nextTick();
    await nextTick();

    // Clean note starts without YAML Propriedades
    expect(wrapper.find('[data-testid="mind-frontmatter-header"]').exists()).toBe(false);
    const blankTitleInput = wrapper.find('[data-testid="mind-note-title-input"]');
    expect(blankTitleInput.exists()).toBe(true);

    // Typing DB/filename Note Title keeps YAML frontmatter clean (does not inject title into YAML)
    await blankTitleInput.setValue('Nota Sem Yaml');
    expect(wrapper.emitted('update:title')?.at(-1)).toEqual(['Nota Sem Yaml']);
    expect(wrapper.emitted('update:frontmatter')).toBeUndefined();

    // Triggering openProperties reveals expanded Propriedades ABOVE the title bar
    await (wrapper.vm as unknown as { openProperties: (focus?: boolean) => Promise<void> }).openProperties(false);
    await nextTick();

    const fmEl = wrapper.find('[data-testid="mind-frontmatter-header"]');
    const titleBarEl = wrapper.find('[data-testid="mind-note-title-bar"]');
    expect(fmEl.exists()).toBe(true);
    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(true);
    expect(
      Boolean(
        fmEl.element.compareDocumentPosition(titleBarEl.element) &
          Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);

    wrapper.unmount();
  });

  it('keeps separate Note Title below collapsed YAML and preserves pill color across list transformations', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '<p>Item colorido</p>',
        title: 'Nota Limpa',
        showTitle: true,
        basicBlocksOnly: true,
        frontmatter: {
          title: 'Nota Limpa',
          tags: [],
          status: 'rascunho',
        },
      },
      global: {
        stubs: {
          BubbleFormattingMenu: true,
        },
      },
    });

    await nextTick();
    await nextTick();

    // Title is rendered separately below collapsed frontmatter
    const fmHeader = wrapper.find('[data-testid="mind-frontmatter-header"]');
    const titleBar = wrapper.find('[data-testid="mind-note-title-bar"]');
    const titleInput = wrapper.find('[data-testid="mind-note-title-input"]');
    expect(fmHeader.exists()).toBe(true);
    expect(titleInput.exists()).toBe(true);
    expect((titleInput.element as HTMLInputElement).value).toBe('Nota Limpa');
    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="toggle-raw-yaml-mode"]').exists()).toBe(false);
    expect(
      Boolean(
        fmHeader.element.compareDocumentPosition(titleBar.element) &
          Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);

    await titleInput.setValue('Novo Título');
    expect(wrapper.emitted('update:title')?.at(-1)).toEqual(['Novo Título']);

    // Hovering paragraph -> apply green pill bg -> turn into ordered list -> color transfers onto <li> pill!
    const canvas = wrapper.find('.mind-editor-canvas-container').element;
    const proseMirror = wrapper.find('.ProseMirror').element;
    const p = proseMirror.querySelector('p')!;
    setRect(canvas, { top: 150, left: 200, width: 680, height: 180 });
    setRect(proseMirror, { top: 150, left: 200, width: 680, height: 180 });
    setRect(p, { top: 152, left: 200, width: 680, height: 32 });

    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 160, clientY: 164, bubbles: true })
    );
    await nextTick();

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('click');
    await wrapper.find('[data-testid="bg-color-green"]').trigger('click');
    await nextTick();

    expect(wrapper.find('.ProseMirror p').attributes('data-block-bg')).toBe('green');

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-turn-into"]').trigger('click');
    await wrapper.find('[data-testid="turn-into-orderedList"]').trigger('click');
    await nextTick();

    const li = wrapper.find('.ProseMirror ol > li');
    expect(li.exists()).toBe(true);
    expect(li.attributes('data-block-bg')).toBe('green');
    expect(li.find('p').attributes('data-block-bg')).toBeUndefined();

    wrapper.unmount();
  });
});
