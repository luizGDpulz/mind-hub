import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  BlockColor,
  BLOCK_COLOR_PALETTE,
  applyBlockColorAtPos,
  normalizeBlockColorId,
  normalizeContainerBlockColors,
} from './block-color.js';

describe('BlockColor Extension', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
  });

  it('defines light-theme pastel palette options and normalizes invalid ids', () => {
    expect(BLOCK_COLOR_PALETTE.length).toBe(10);
    expect(normalizeBlockColorId('default')).toBeNull();
    expect(normalizeBlockColorId('BLUE')).toBe('blue');
    expect(normalizeBlockColorId('unknown')).toBeNull();
  });

  it('applies and parses block text & background color attributes cleanly', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockColor],
      content: '<p>Linha colorida</p><h2>Título</h2>',
    });
    editors.push(editor);

    expect(applyBlockColorAtPos(editor, 0, { textColor: 'purple', backgroundColor: 'yellow' })).toBe(
      true
    );

    const html = editor.getHTML();
    expect(html).toContain('data-block-color="purple"');
    expect(html).toContain('data-block-bg="yellow"');

    // Reset back to default
    expect(applyBlockColorAtPos(editor, 0, { textColor: 'default', backgroundColor: null })).toBe(
      true
    );
    const resetHtml = editor.getHTML();
    expect(resetHtml).not.toContain('data-block-color');
    expect(resetHtml).not.toContain('data-block-bg');
  });

  it('supports editor commands for current selection block color', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockColor],
      content: '<p>Bloco focado</p>',
    });
    editors.push(editor);

    editor.chain().setTextSelection(2).setBlockBackgroundColor('blue').setBlockTextColor('red').run();
    const attrs = editor.state.doc.nodeAt(0)?.attrs;
    expect(attrs?.blockBackgroundColor).toBe('blue');
    expect(attrs?.blockTextColor).toBe('red');

    editor.chain().unsetBlockColors().run();
    const cleared = editor.state.doc.nodeAt(0)?.attrs;
    expect(cleared?.blockBackgroundColor).toBeNull();
    expect(cleared?.blockTextColor).toBeNull();
  });

  it('applies colors to outer listItem pill (covering marker + text) when cursor is inside a list item', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockColor],
      content: '<ol><li><p>Primeiro</p></li><li><p>Segundo</p></li></ol>',
    });
    editors.push(editor);

    // Cursor inside first <li><p>Primeiro</p></li>
    editor.chain().setTextSelection(4).setBlockBackgroundColor('green').setBlockTextColor('green').run();

    const html = editor.getHTML();
    expect(html).toContain('<li data-block-color="green" data-block-bg="green"><p>Primeiro</p></li>');
  });

  it('hoists paragraph pill color onto <li> when toggled into bullet/ordered/task list and restores on unwrap', () => {
    const editor = new Editor({
      extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), BlockColor],
      content: '<p data-block-bg="purple" data-block-color="purple">Item colorido</p>',
    });
    editors.push(editor);

    // Toggling bullet list wraps <p> into <li>, plugin automatically hoists color to <li>
    editor.chain().setTextSelection(3).toggleBulletList().run();
    expect(editor.getHTML()).toContain(
      '<ul><li data-block-color="purple" data-block-bg="purple"><p>Item colorido</p></li></ul>'
    );

    // Toggling off restores color cleanly onto top-level <p>
    editor.chain().toggleBulletList().run();
    expect(editor.getHTML()).toBe(
      '<p data-block-color="purple" data-block-bg="purple">Item colorido</p>'
    );

    // Switching to task list also hoists onto taskItem
    editor.chain().toggleTaskList().run();
    expect(editor.getHTML()).toContain('data-block-bg="purple"');
    expect(editor.getHTML()).not.toContain('<p data-block-bg="purple">');
  });

  it('normalizes legacy HTML where child paragraph inside listItem held block color', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockColor],
      content: '<ul><li><p data-block-bg="blue">Legado</p></li></ul>',
    });
    editors.push(editor);

    expect(normalizeContainerBlockColors(editor)).toBe(true);
    expect(editor.getHTML()).toBe('<ul><li data-block-bg="blue"><p>Legado</p></li></ul>');
  });
});
