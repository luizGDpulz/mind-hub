import { Extension, InputRule, wrappingInputRule } from '@tiptap/core';

export const TASK_EMPTY_BRACKETS_REGEX = /^\s*\[\]\s$/;
export const TASK_SPACED_BRACKETS_REGEX = /^\s*\[\s\]\s$/;
export const FRONTMATTER_TRIGGER_REGEX = /^(?:---|—-)$/;

export interface MarkdownShortcutsOptions {
  shouldTriggerFrontmatter?: () => boolean;
  onTriggerFrontmatter?: () => void;
}

export const MarkdownShortcuts = Extension.create<MarkdownShortcutsOptions>({
  name: 'markdownShortcuts',
  priority: 1000,

  addOptions() {
    return {
      shouldTriggerFrontmatter: undefined,
      onTriggerFrontmatter: undefined,
    };
  },

  addInputRules() {
    const rules: InputRule[] = [];

    // Rule: Typing '---' at the very top empty block activates YAML Properties instead of <hr>
    rules.push(
      new InputRule({
        find: FRONTMATTER_TRIGGER_REGEX,
        handler: ({ state, range }) => {
          if (!this.options.shouldTriggerFrontmatter?.()) {
            return null;
          }

          const $from = state.doc.resolve(range.from);
          const isTopFirstBlock =
            $from.depth === 1 &&
            $from.index(0) === 0 &&
            $from.parent.type.name === 'paragraph' &&
            range.from === $from.start(1);

          if (!isTopFirstBlock) {
            return null;
          }

          if (range.to > range.from) {
            state.tr.delete(range.from, range.to);
          }

          const trigger = this.options.onTriggerFrontmatter;
          if (trigger) {
            queueMicrotask(() => trigger());
          }
          return undefined;
        },
      })
    );

    // Rule: '[] ' or '[ ] ' transforms to taskList with taskItem
    if (this.editor.schema.nodes.taskList && this.editor.schema.nodes.taskItem) {
      rules.push(
        wrappingInputRule({
          find: TASK_EMPTY_BRACKETS_REGEX,
          type: this.editor.schema.nodes.taskList,
        }),
        wrappingInputRule({
          find: TASK_SPACED_BRACKETS_REGEX,
          type: this.editor.schema.nodes.taskList,
        })
      );
    }

    return rules;
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!this.options.shouldTriggerFrontmatter?.()) {
          return false;
        }
        const { state, view } = this.editor;
        const { selection } = state;
        const { $from } = selection;
        if (!selection.empty || $from.depth !== 1 || $from.index(0) !== 0) {
          return false;
        }
        if ($from.parent.type.name !== 'paragraph') {
          return false;
        }
        const trimmed = $from.parent.textContent.trim();
        if (!FRONTMATTER_TRIGGER_REGEX.test(trimmed)) {
          return false;
        }
        const from = $from.start(1);
        const to = $from.end(1);
        const tr = state.tr.delete(from, to);
        view.dispatch(tr);
        this.options.onTriggerFrontmatter?.();
        return true;
      },
    };
  },
});
