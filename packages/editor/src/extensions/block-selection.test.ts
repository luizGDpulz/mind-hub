import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BlockColor } from './block-color.js';
import {
  BlockSelection,
  deleteBlocksAtPositions,
  duplicateBlocksAtPositions,
  findBlocksIntersectingRect,
  getSelectedBlockPositions,
  isPointInsideTextContent,
  setBlockSelection,
  shouldStartMarqueeFromPoint,
  turnIntoBlocksAtPositions,
} from './block-selection.js';
import { getNodePosAtDOM } from './drag-handle.js';

function setRect(
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

describe('BlockSelection Extension', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
    document.body.innerHTML = '';
  });

  it('distinguishes clicks on letters (text selection) from clicks outside text (marquee start)', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockColor, BlockSelection],
      content: '<p>Palavra</p>',
    });
    editors.push(editor);
    document.body.appendChild(editor.view.dom);

    const p = editor.view.dom.querySelector('p')!;
    setRect(editor.view.dom, { top: 100, left: 200, width: 680, height: 100 });
    setRect(p, { top: 104, left: 200, width: 680, height: 28 });

    // Mock Range.getClientRects for the text node inside <p> covering only [204..260]
    const origCreateRange = document.createRange.bind(document);
    const origSpy = document.createRange;
    document.createRange = () => {
      const r = origCreateRange();
      r.getClientRects = () =>
        [
          {
            top: 106,
            left: 204,
            right: 260,
            bottom: 124,
            width: 56,
            height: 18,
            x: 204,
            y: 106,
            toJSON: () => {},
          },
        ] as unknown as DOMRectList;
      return r;
    };

    try {
      // Point directly on letters -> returns true (text selection wins)
      expect(isPointInsideTextContent(p, 225, 114)).toBe(true);
      expect(shouldStartMarqueeFromPoint(editor.view, p, 225, 114)).toBe(false);

      // Point far to the right of the short word -> outside letters -> marquee allowed
      expect(isPointInsideTextContent(p, 520, 114)).toBe(false);
      expect(shouldStartMarqueeFromPoint(editor.view, p, 520, 114)).toBe(true);

      // Point in outer left margin -> marquee allowed
      expect(shouldStartMarqueeFromPoint(editor.view, editor.view.dom, 140, 114)).toBe(true);
    } finally {
      document.createRange = origSpy;
    }
  });

  it('duplicates, converts (turn into), and deletes groups of selected blocks preserving colors', () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        TaskList,
        TaskItem.configure({ nested: true }),
        BlockColor,
        BlockSelection,
      ],
      content: '<p data-block-bg="green">Primeiro</p><p data-block-color="purple">Segundo</p><p>Terceiro</p>',
    });
    editors.push(editor);

    const ps = Array.from(editor.view.dom.querySelectorAll('p'));
    const p1Pos = getNodePosAtDOM(ps[0]!, editor.view)!;
    const p2Pos = getNodePosAtDOM(ps[1]!, editor.view)!;

    setBlockSelection(editor.view, [p1Pos, p2Pos]);
    expect(getSelectedBlockPositions(editor.state)).toEqual([p1Pos, p2Pos]);

    // Convert both selected paragraphs into an ordered list while preserving colors on each <li>
    const turnRes = turnIntoBlocksAtPositions(editor, [p1Pos, p2Pos], 'orderedList');
    expect(turnRes.converted).toBe(true);
    expect(turnRes.newPositions).toHaveLength(2);
    expect(editor.getHTML()).toBe(
      '<ol><li data-block-bg="green"><p>Primeiro</p></li><li data-block-color="purple"><p>Segundo</p></li></ol><p>Terceiro</p>'
    );

    // Duplicate the two selected list items
    const dupRes = duplicateBlocksAtPositions(editor.view, turnRes.newPositions);
    expect(dupRes.duplicated).toBe(true);
    expect(editor.view.dom.querySelectorAll('ol > li')).toHaveLength(4);

    // Delete duplicated group -> leaves original 2 items + Terceiro
    expect(deleteBlocksAtPositions(editor.view, dupRes.newPositions)).toBe(true);
    expect(editor.view.dom.querySelectorAll('ol > li')).toHaveLength(2);
    expect(getSelectedBlockPositions(editor.state)).toEqual([]);
  });

  it('selects taskItem elements with data-type="taskItem" and horizontalRule (<hr>) dividers via marquee (refs #85)', () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        TaskList,
        TaskItem.configure({ nested: true, HTMLAttributes: { 'data-type': 'taskItem' } }),
        BlockColor,
        BlockSelection,
      ],
      content:
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Item 1</p></li><li data-type="taskItem" data-checked="false"><p>Item 2</p></li></ul><hr><p>Final</p>',
    });
    editors.push(editor);
    document.body.appendChild(editor.view.dom);

    const lis = Array.from(editor.view.dom.querySelectorAll('li'));
    const hr = editor.view.dom.querySelector('hr')!;
    const pFinal = editor.view.dom.querySelector('.ProseMirror > p')!;

    expect(lis).toHaveLength(2);
    expect(lis[0]?.getAttribute('data-type')).toBe('taskItem');
    expect(lis[1]?.getAttribute('data-type')).toBe('taskItem');

    setRect(editor.view.dom, { top: 0, left: 0, width: 680, height: 220 });
    setRect(lis[0]!, { top: 10, left: 0, width: 680, height: 32 });
    setRect(lis[1]!, { top: 48, left: 0, width: 680, height: 32 });
    setRect(hr, { top: 86, left: 0, width: 680, height: 21 });
    setRect(pFinal, { top: 113, left: 0, width: 680, height: 32 });

    // Marquee spanning task item 2 and divider <hr>
    const hits = findBlocksIntersectingRect(editor.view, {
      left: 50,
      top: 52,
      right: 300,
      bottom: 98,
    });
    expect(hits).toHaveLength(2);

    setBlockSelection(editor.view, hits);
    const selectedEls = Array.from(editor.view.dom.querySelectorAll('.mind-block-selected'));
    expect(selectedEls).toHaveLength(2);
    expect(selectedEls[0]?.tagName).toBe('LI');
    expect(selectedEls[1]?.tagName).toBe('HR');

    // Duplicate & delete selected task item + <hr> cleanly
    const dup = duplicateBlocksAtPositions(editor.view, hits);
    expect(dup.duplicated).toBe(true);
    expect(editor.view.dom.querySelectorAll('hr')).toHaveLength(2);

    expect(deleteBlocksAtPositions(editor.view, dup.newPositions)).toBe(true);
    expect(editor.view.dom.querySelectorAll('hr')).toHaveLength(1);
  });
});
