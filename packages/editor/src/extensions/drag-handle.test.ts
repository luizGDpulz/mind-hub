import { describe, it, expect, vi, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  GlobalDragHandle,
  calculateHandlePosition,
  findBlockDOMAtCoords,
  getNodePosAtDOM,
} from './drag-handle.js';

function mockRect(
  elem: Element,
  rect: { top: number; left: number; width: number; height: number }
) {
  const domRect = {
    top: rect.top,
    left: rect.left,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => {},
  };
  Object.defineProperty(elem, 'getBoundingClientRect', {
    configurable: true,
    value: () => domRect,
  });
}

describe('GlobalDragHandle Extension', () => {
  const createdEditors: Editor[] = [];

  afterEach(() => {
    while (createdEditors.length > 0) {
      createdEditors.pop()?.destroy();
    }
    document.body.innerHTML = '';
  });

  it('instantiates the extension with default options', () => {
    const ext = GlobalDragHandle.configure({
      dragHandleWidth: 20,
    });
    expect(ext.name).toBe('globalDragHandle');
    expect(ext.options.dragHandleWidth).toBe(20);
  });

  it('calculates handle position correctly relative to mock DOM element', () => {
    const mockElem = document.createElement('div');
    mockElem.style.lineHeight = '24px';
    mockElem.style.paddingTop = '4px';
    document.body.appendChild(mockElem);

    mockRect(mockElem, { top: 100, left: 50, width: 200, height: 24 });

    const pos = calculateHandlePosition(mockElem);
    expect(pos.left).toBe(50);
    expect(pos.top).toBeGreaterThanOrEqual(100);
    expect(pos.height).toBe(24);
  });

  it('detects blocks and fires onPositionChange even after delayed DOM reparenting (Vue EditorContent lifecycle) and left-margin hover', () => {
    const onPositionChange = vi.fn();

    // Simulate @tiptap/vue-3 creating Editor in a temporary detached div BEFORE reparenting
    const tempDetachedMount = document.createElement('div');
    const editor = new Editor({
      element: tempDetachedMount,
      extensions: [
        StarterKit,
        GlobalDragHandle.configure({ onPositionChange }),
      ],
      content: '<h1>Título Principal</h1><p>Primeiro parágrafo</p><ul><li><p>Item da lista</p></li></ul><hr><p>Final</p>',
    });
    createdEditors.push(editor);

    // Later, mount .ProseMirror inside .mind-editor-root > .mind-editor-canvas-container
    const root = document.createElement('div');
    root.className = 'mind-editor-root';
    const canvas = document.createElement('div');
    canvas.className = 'mind-editor-canvas-container';
    root.appendChild(canvas);
    canvas.append(...Array.from(tempDetachedMount.childNodes));
    document.body.appendChild(root);

    mockRect(canvas, { top: 100, left: 200, width: 680, height: 300 });
    mockRect(editor.view.dom, { top: 100, left: 200, width: 680, height: 300 });

    const h1 = editor.view.dom.querySelector('h1')!;
    const p1 = editor.view.dom.querySelector('p')!;
    const li = editor.view.dom.querySelector('li')!;
    const hr = editor.view.dom.querySelector('hr')!;

    mockRect(h1, { top: 100, left: 200, width: 680, height: 36 });
    mockRect(p1, { top: 144, left: 200, width: 680, height: 24 });
    mockRect(li, { top: 176, left: 222, width: 658, height: 24 });
    mockRect(hr, { top: 210, left: 200, width: 680, height: 2 });

    // 1. Hover 45px to the LEFT of the text block (in left gutter margin) aligned with p1
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 155, clientY: 152, bubbles: true })
    );

    expect(onPositionChange).toHaveBeenCalled();
    const p1Call = onPositionChange.mock.calls.at(-1)?.[0];
    expect(p1Call).toBeTruthy();
    expect(p1Call.nodeType).toBe('paragraph');
    expect(p1Call.top).toBeGreaterThanOrEqual(44);
    expect(getNodePosAtDOM(p1, editor.view)).toBe(p1Call.nodePos);

    // 2. Hover 50px to the LEFT of list item
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 150, clientY: 185, bubbles: true })
    );
    const liCall = onPositionChange.mock.calls.at(-1)?.[0];
    expect(liCall.nodeType).toBe('listItem');
    expect(getNodePosAtDOM(li, editor.view)).toBe(liCall.nodePos);

    // 3. Direct block query on <hr> vertical zone and out-of-bounds null check
    expect(findBlockDOMAtCoords({ x: 160, y: 211 }, editor.view)).toBe(hr);
    expect(findBlockDOMAtCoords({ x: 40, y: 150 }, editor.view)).toBeNull();

    // 4. Move cursor far left out of gutter hit width -> should hide (null)
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 40, clientY: 150, bubbles: true })
    );
    expect(onPositionChange.mock.calls.at(-1)?.[0]).toBeNull();
  });
});
