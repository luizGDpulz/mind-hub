import { describe, it, expect } from 'vitest';
import {
  MarkdownShortcuts,
  TASK_EMPTY_BRACKETS_REGEX,
  TASK_SPACED_BRACKETS_REGEX,
} from './markdown-shortcuts.js';

describe('markdown-shortcuts.ts', () => {
  it('matches empty brackets [] or [ ] followed by space', () => {
    expect(TASK_EMPTY_BRACKETS_REGEX.test('[] ')).toBe(true);
    expect(TASK_EMPTY_BRACKETS_REGEX.test('  [] ')).toBe(true);
    expect(TASK_EMPTY_BRACKETS_REGEX.test('[]')).toBe(false);
    expect(TASK_EMPTY_BRACKETS_REGEX.test('[x] ')).toBe(false);
    expect(TASK_SPACED_BRACKETS_REGEX.test('[ ] ')).toBe(true);
    expect(TASK_SPACED_BRACKETS_REGEX.test('  [ ] ')).toBe(true);
  });

  it('instantiates MarkdownShortcuts extension', () => {
    expect(MarkdownShortcuts.name).toBe('markdownShortcuts');
    expect(MarkdownShortcuts.type).toBe('extension');
  });
});
