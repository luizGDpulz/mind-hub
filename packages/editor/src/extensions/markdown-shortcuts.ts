import { Extension, wrappingInputRule } from '@tiptap/core';

export const TASK_EMPTY_BRACKETS_REGEX = /^\s*\[\]\s$/;

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    const rules = [];

    // Rule: '[] ' transforms to taskList with taskItem
    if (this.editor.schema.nodes.taskList && this.editor.schema.nodes.taskItem) {
      rules.push(
        wrappingInputRule({
          find: TASK_EMPTY_BRACKETS_REGEX,
          type: this.editor.schema.nodes.taskList,
        })
      );
    }

    return rules;
  },
});
