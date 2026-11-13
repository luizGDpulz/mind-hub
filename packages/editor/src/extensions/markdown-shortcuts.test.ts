import { describe, it, expect, afterEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  MarkdownShortcuts,
  FRONTMATTER_TRIGGER_REGEX,
  TASK_EMPTY_BRACKETS_REGEX,
  TASK_SPACED_BRACKETS_REGEX,
} from './markdown-shortcuts.js';

describe('markdown-shortcuts.ts', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
  });

  it('matches empty brackets [] or [ ] followed by space and frontmatter --- regex', () => {
    expect(TASK_EMPTY_BRACKETS_REGEX.test('[] ')).toBe(true);
    expect(TASK_EMPTY_BRACKETS_REGEX.test('  [] ')).toBe(true);
    expect(TASK_EMPTY_BRACKETS_REGEX.test('[]')).toBe(false);
    expect(TASK_EMPTY_BRACKETS_REGEX.test('[x] ')).toBe(false);
    expect(TASK_SPACED_BRACKETS_REGEX.test('[ ] ')).toBe(true);
    expect(TASK_SPACED_BRACKETS_REGEX.test('  [ ] ')).toBe(true);
    expect(FRONTMATTER_TRIGGER_REGEX.test('---')).toBe(true);
    expect(FRONTMATTER_TRIGGER_REGEX.test('—-')).toBe(true);
    expect(FRONTMATTER_TRIGGER_REGEX.test('--')).toBe(false);
  });

  it('triggers frontmatter callback when typing --- at the first top-level block without properties', async () => {
    let propertiesActive = false;
    const onTriggerFrontmatter = vi.fn(() => {
      propertiesActive = true;
    });

    const editor = new Editor({
      extensions: [
        StarterKit,
        MarkdownShortcuts.configure({
          shouldTriggerFrontmatter: () => !propertiesActive,
          onTriggerFrontmatter,
        }),
      ],
      content: '<p>--</p>',
    });
    editors.push(editor);

    // Simulate typing the 3rd '-' at pos 3 (end of '--') via ProseMirror textInput handler
    const handled = editor.view.someProp('handleTextInput', (fn) =>
      fn(editor.view, 3, 3, '-', () => editor.state.tr)
    );
    expect(handled).toBe(true);
    await Promise.resolve();

    expect(onTriggerFrontmatter).toHaveBeenCalledTimes(1);
    expect(editor.getHTML()).toBe('<p></p>');

    // Once properties are already active, typing --- acts as a normal HorizontalRule <hr>
    editor.commands.setContent('<p>--</p>');
    const handledSecond = editor.view.someProp('handleTextInput', (fn) =>
      fn(editor.view, 3, 3, '-', () => editor.state.tr)
    );
    expect(handledSecond).toBe(true);
    expect(editor.getHTML()).toContain('<hr>');
    expect(onTriggerFrontmatter).toHaveBeenCalledTimes(1);
  });
});
