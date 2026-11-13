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

    // Typing in ProseMirror hides the gutter until a real mousemove happens again
    proseMirror.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);

    // Same-coord synthetic mousemove while typing stays suppressed
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 158, clientY: 150, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);

    // Moving the mouse to a new position restores the gutter
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 156, clientY: 152, bubbles: true })
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
    await wrapper.find('[data-testid="submenu-color-text-trigger"]').trigger('mouseenter');
    await nextTick();

    await wrapper.find('[data-testid="text-color-blue"]').trigger('click');
    await nextTick();
    expect(wrapper.find('.ProseMirror p').attributes('data-block-color')).toBe('blue');

    // Re-open menu and apply pastel background highlight
    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    await nextTick();
    await wrapper.find('[data-testid="submenu-color-bg-trigger"]').trigger('mouseenter');
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

    expect(wrapper.find('[data-testid="block-drop-indicator"]').exists()).toBe(false);
    expect(wrapper.find('.ProseMirror p[data-block-dragging="true"]').classes()).toContain(
      'mind-block-dragging-source'
    );
    expect(wrapper.find('.ProseMirror h1[data-drop-placement="before"]').classes()).toContain(
      'mind-block-drop-before'
    );

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
    expect(wrapper.find('.ProseMirror [data-block-dragging="true"]').exists()).toBe(false);
    expect(wrapper.find('.ProseMirror [data-drop-placement]').exists()).toBe(false);
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
    await wrapper.find('[data-testid="submenu-color-bg-trigger"]').trigger('mouseenter');
    await nextTick();
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

  it('supports Notion-style marquee group selection from outside blocks, group color/turn-into/D&D and group delete', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '<p>Bloco A</p><p>Bloco B</p><p>Bloco C</p>',
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

    const root = wrapper.find('[data-testid="mind-editor-root"]').element;
    const canvas = wrapper.find('.mind-editor-canvas-container').element;
    const proseMirror = wrapper.find('.ProseMirror').element;
    const paragraphs = Array.from(proseMirror.querySelectorAll('p'));
    expect(paragraphs).toHaveLength(3);

    setRect(root, { top: 80, left: 100, width: 880, height: 300 });
    setRect(canvas, { top: 100, left: 200, width: 680, height: 240 });
    setRect(proseMirror, { top: 100, left: 200, width: 680, height: 240 });
    setRect(paragraphs[0]!, { top: 104, left: 200, width: 680, height: 28 });
    setRect(paragraphs[1]!, { top: 138, left: 200, width: 680, height: 28 });
    setRect(paragraphs[2]!, { top: 172, left: 200, width: 680, height: 28 });

    // 1. Marquee drag starting in the left margin outside blocks covering Bloco A and Bloco B
    root.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 140, clientY: 102, button: 0, bubbles: true })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 280, clientY: 152, bubbles: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="mind-marquee-box"]').exists()).toBe(true);
    const selected = proseMirror.querySelectorAll('.mind-block-selected');
    expect(selected).toHaveLength(2);
    expect(selected[0]?.textContent).toBe('Bloco A');
    expect(selected[1]?.textContent).toBe('Bloco B');

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 280, clientY: 152, bubbles: true }));
    await nextTick();
    expect(wrapper.find('[data-testid="mind-marquee-box"]').exists()).toBe(false);
    expect(proseMirror.querySelectorAll('.mind-block-selected')).toHaveLength(2);

    // 2. Hover Bloco A gutter -> apply background color to BOTH selected blocks via group action
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 156, clientY: 116, bubbles: true })
    );
    await nextTick();

    await wrapper.find('[data-testid="block-gutter-handle-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="block-actions-popover"]').text()).toContain('2 blocos selecionados');

    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('click');
    await wrapper.find('[data-testid="submenu-color-bg-trigger"]').trigger('mouseenter');
    await nextTick();
    await wrapper.find('[data-testid="bg-color-blue"]').trigger('click');
    await nextTick();

    const updatedParagraphs = Array.from(proseMirror.querySelectorAll('p'));
    expect(updatedParagraphs[0]?.getAttribute('data-block-bg')).toBe('blue');
    expect(updatedParagraphs[1]?.getAttribute('data-block-bg')).toBe('blue');
    expect(updatedParagraphs[2]?.getAttribute('data-block-bg')).toBeNull();

    // 3. Drag the group [Bloco A, Bloco B] together below Bloco C
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

    const dropEvent = new MouseEvent('drop', {
      clientX: 120,
      clientY: 194,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: mockTransfer });
    window.dispatchEvent(dropEvent);
    await nextTick();

    const reordered = Array.from(proseMirror.querySelectorAll('p')).map((el) => el.textContent);
    expect(reordered).toEqual(['Bloco C', 'Bloco A', 'Bloco B']);
    expect(proseMirror.querySelectorAll('.mind-block-selected')).toHaveLength(2);

    // 4. Press Delete -> deletes the entire selected group cleanly
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();

    const remaining = Array.from(proseMirror.querySelectorAll('p')).map((el) => el.textContent);
    expect(remaining).toEqual(['Bloco C']);
    expect(proseMirror.querySelectorAll('.mind-block-selected')).toHaveLength(0);

    wrapper.unmount();
  });

  it('prevents native text selection during marquee drag, keeps BubbleFormattingMenu disabled, and focuses on empty click', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '<p>Teste</p><p>Linha 2</p>',
        enableFrontmatterHeader: false,
      },
      global: {
        stubs: {
          BubbleFormattingMenu: {
            name: 'BubbleFormattingMenu',
            props: ['editor', 'disabled'],
            template:
              '<div data-testid="bubble-formatting-stub" :data-disabled="String(Boolean(disabled))" />',
          },
        },
      },
    });

    await nextTick();
    await nextTick();

    const root = wrapper.find('[data-testid="mind-editor-root"]').element;
    const canvas = wrapper.find('.mind-editor-canvas-container').element;
    const proseMirror = wrapper.find('.ProseMirror').element;
    const paragraphs = Array.from(proseMirror.querySelectorAll('p'));

    setRect(root, { top: 80, left: 100, width: 880, height: 300 });
    setRect(canvas, { top: 100, left: 200, width: 680, height: 220 });
    setRect(proseMirror, { top: 100, left: 200, width: 680, height: 220 });
    setRect(paragraphs[0]!, { top: 104, left: 200, width: 680, height: 28 });
    setRect(paragraphs[1]!, { top: 138, left: 200, width: 680, height: 28 });

    // Hover gutter before marquee -> visible initially
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 156, clientY: 112, buttons: 0, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(true);

    const mdEvent = new MouseEvent('mousedown', {
      clientX: 140,
      clientY: 108,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    root.dispatchEvent(mdEvent);
    await nextTick();

    expect(mdEvent.defaultPrevented).toBe(true);
    expect(root.classList.contains('is-marquee-selecting')).toBe(true);
    // Pressing down hides gutter immediately
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="bubble-formatting-stub"]').attributes('data-disabled')).toBe(
      'true'
    );

    // Drag across the gutter lane and letters: gutter stays hidden throughout marquee drag
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 158, clientY: 144, buttons: 1, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);

    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 280, clientY: 150, buttons: 1, bubbles: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(false);
    expect(proseMirror.querySelectorAll('.mind-block-selected')).toHaveLength(2);
    expect(wrapper.find('[data-testid="bubble-formatting-stub"]').attributes('data-disabled')).toBe(
      'true'
    );
    expect(window.getSelection()?.toString() ?? '').toBe('');

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 280, clientY: 150, bubbles: true }));
    await nextTick();
    expect(root.classList.contains('is-marquee-selecting')).toBe(false);
    // Remains disabled while block group selection is active
    expect(wrapper.find('[data-testid="bubble-formatting-stub"]').attributes('data-disabled')).toBe(
      'true'
    );

    // Only after mouse button is released and user hovers block/gutter does gutter return
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 158, clientY: 144, buttons: 0, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="block-gutter-shell"]').exists()).toBe(true);

    // Clicking empty margin without dragging clears block selection and places caret without marquee
    const emptyClickDown = new MouseEvent('mousedown', {
      clientX: 140,
      clientY: 148,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    root.dispatchEvent(emptyClickDown);
    expect(emptyClickDown.defaultPrevented).toBe(true);

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 141, clientY: 148, bubbles: true }));
    await nextTick();

    expect(proseMirror.querySelectorAll('.mind-block-selected')).toHaveLength(0);
    expect(wrapper.find('[data-testid="mind-marquee-box"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="bubble-formatting-stub"]').attributes('data-disabled')).toBe(
      'false'
    );

    wrapper.unmount();
  });

  it('includes Frase de destaque under Blocos básicos in / slash menu and inserts a callout', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '<p></p>',
        basicBlocksOnly: true,
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

    const editor = wrapper.findComponent({ name: 'EditorContent' }).props('editor');
    editor.view.coordsAtPos = () => ({ top: 120, left: 200, bottom: 140, right: 205 });

    editor.view.someProp('handleTextInput', (fn: (...args: unknown[]) => unknown) => {
      fn(editor.view, 1, 1, '/');
      return false;
    });
    editor.view.dispatch(editor.view.state.tr.insertText('/', 1));
    await nextTick();

    const slashShell = wrapper.find('[data-testid="slash-menu-shell"]');
    expect(slashShell.exists()).toBe(true);
    expect(slashShell.text()).toContain('Blocos básicos');
    expect(slashShell.text()).toContain('Frase de destaque');

    await wrapper.find('[data-testid="slash-item"][data-item-id="callout"]').trigger('click');
    await nextTick();

    const calloutEl = wrapper.find('.ProseMirror .mind-callout-wrapper');
    expect(calloutEl.exists()).toBe(true);
    expect(calloutEl.attributes('data-callout-type')).toBe('note');
    expect(calloutEl.find('[data-testid="callout-type-btn"]').text()).toContain('💡');

    wrapper.unmount();
  });

  it('renders empty block placeholder only when focused and hides it when blurred or block-selected', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: '',
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
    const proseMirror = wrapper.find('.ProseMirror').element as HTMLElement;

    expect(canvas.classList.contains('is-canvas-focused')).toBe(false);

    proseMirror.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();

    expect(canvas.classList.contains('is-canvas-focused')).toBe(true);
    const emptyP = proseMirror.querySelector('p.is-empty');
    expect(emptyP).toBeTruthy();
    expect(emptyP?.getAttribute('data-placeholder')).toBe('Pressione / para inserir blocos');

    // Blur hides placeholder
    proseMirror.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    await nextTick();
    expect(canvas.classList.contains('is-canvas-focused')).toBe(false);

    wrapper.unmount();
  });

  it('renders custom #title slot below FrontmatterHeader and keeps empty properties hidden until opened', async () => {
    const wrapper = mount(MindEditor, {
      props: {
        modelValue: '',
        frontmatter: {},
      },
      slots: {
        title: '<h1 data-testid="slotted-db-title">Título do Banco</h1>',
      },
      global: {
        stubs: {
          EditorContent: {
            template: '<div class="mind-editor-content-stub"><slot /></div>',
          },
          BubbleFormattingMenu: true,
        },
      },
    });

    expect(wrapper.find('[data-testid="mind-frontmatter-header"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="slotted-db-title"]').text()).toBe('Título do Banco');

    await wrapper.vm.openProperties(false);
    await nextTick();

    const rootEl = wrapper.find('[data-testid="mind-editor-root"]').element;
    const childrenIds = Array.from(rootEl.children).map(
      (el) => el.getAttribute('data-testid') || el.className,
    );
    const fmIdx = childrenIds.indexOf('mind-frontmatter-header');
    const titleIdx = childrenIds.indexOf('slotted-db-title');
    const canvasIdx = childrenIds.indexOf('mind-editor-canvas-container');

    expect(fmIdx).toBeGreaterThanOrEqual(0);
    expect(titleIdx).toBeGreaterThan(fmIdx);
    expect(canvasIdx).toBeGreaterThan(titleIdx);

    wrapper.unmount();
  });
});
