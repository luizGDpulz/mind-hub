import { describe, it, expect, vi, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  GlobalDragHandle,
  calculateHandlePosition,
  findBlockDOMAtCoords,
  getNodePosAtDOM,
  resolveDropTarget,
  moveBlockAtPos,
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

  it('calculates handle position vertically centered on separate block pills and list items', () => {
    const mockElem = document.createElement('div');
    document.body.appendChild(mockElem);

    mockRect(mockElem, { top: 100, left: 50, width: 200, height: 24 });

    const pos = calculateHandlePosition(mockElem);
    expect(pos.left).toBe(50);
    expect(pos.top).toBe(100);
    expect(pos.height).toBe(24);

    // 32px pill height with 24px gutter -> centered at +4px offset
    const pillLi = document.createElement('li');
    document.body.appendChild(pillLi);
    mockRect(pillLi, { top: 200, left: 60, width: 500, height: 32 });
    const pillPos = calculateHandlePosition(pillLi);
    expect(pillPos.top).toBe(204);

    // Nested list inside <li> only centers on the parent <li> own line height (excluding sublist)
    const nestedUl = document.createElement('ul');
    pillLi.appendChild(nestedUl);
    mockRect(pillLi, { top: 200, left: 60, width: 500, height: 96 });
    mockRect(nestedUl, { top: 232, left: 84, width: 476, height: 64 });
    const nestedPos = calculateHandlePosition(pillLi);
    expect(nestedPos.top).toBe(204);
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

  it('resolves drop targets across expanded left margin with dynamic top/bottom placement', () => {
    const canvas = document.createElement('div');
    canvas.className = 'mind-editor-canvas-container';
    document.body.appendChild(canvas);

    const editor = new Editor({
      element: canvas,
      extensions: [StarterKit],
      content: '<h1>Título</h1><p>Segundo bloco</p>',
    });
    createdEditors.push(editor);

    mockRect(canvas, { top: 100, left: 200, width: 680, height: 200 });
    mockRect(editor.view.dom, { top: 100, left: 200, width: 680, height: 200 });

    const h1 = editor.view.dom.querySelector('h1')!;
    const p = editor.view.dom.querySelector('p')!;
    mockRect(h1, { top: 100, left: 200, width: 680, height: 36 });
    mockRect(p, { top: 144, left: 200, width: 680, height: 24 });

    // 90px to the left of proseMirror (inside LEFT_DROP_HIT_WIDTH = 140) on top half of <p>
    const topTarget = resolveDropTarget(editor.view, 110, 148, canvas);
    expect(topTarget).not.toBeNull();
    expect(topTarget?.placement).toBe('before');
    expect(topTarget?.lineTop).toBe(42);
    expect(topTarget?.targetPos).toBe(getNodePosAtDOM(p, editor.view));

    // Bottom half of <p>
    const bottomTarget = resolveDropTarget(editor.view, 110, 162, canvas);
    expect(bottomTarget?.placement).toBe('after');
    expect(bottomTarget?.lineTop).toBe(70);

    // Beyond 140px left threshold -> null
    expect(resolveDropTarget(editor.view, 20, 150, canvas)).toBeNull();
  });

  it('moves blocks safely before/after targets and across list boundaries', () => {
    const editor = new Editor({
      extensions: [StarterKit],
      content: '<h1>Primeiro</h1><p>Solto</p><ul><li><p>Item 1</p></li></ul>',
    });
    createdEditors.push(editor);

    const h1 = editor.view.dom.querySelector('h1')!;
    const p = editor.view.dom.querySelector('h1 + p')!;
    const li = editor.view.dom.querySelector('li')!;

    const h1Pos = getNodePosAtDOM(h1, editor.view)!;
    const pPos = getNodePosAtDOM(p, editor.view)!;
    const liPos = getNodePosAtDOM(li, editor.view)!;

    // Dropping onto own boundary is a no-op
    expect(moveBlockAtPos(editor.view, pPos, h1Pos, 'after')).toBe(false);

    // Move standalone paragraph before <h1>
    expect(moveBlockAtPos(editor.view, pPos, h1Pos, 'before')).toBe(true);
    const firstChild = editor.state.doc.child(0);
    expect(firstChild.type.name).toBe('paragraph');
    expect(firstChild.textContent).toBe('Solto');

    // Move first paragraph ("Solto") after the bulletList by targeting listItem inside <ul>
    const updatedLiPos = getNodePosAtDOM(editor.view.dom.querySelector('li')!, editor.view)!;
    expect(moveBlockAtPos(editor.view, 0, updatedLiPos, 'after')).toBe(true);
    const lastChild = editor.state.doc.lastChild!;
    expect(lastChild.type.name).toBe('paragraph');
    expect(lastChild.textContent).toBe('Solto');
    expect(liPos).toBeGreaterThan(0);
  });
});
