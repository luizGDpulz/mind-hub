import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { SlashMenuItem } from '../types.js';

export interface SlashCommandOptions {
  items: SlashMenuItem[];
  onOpen?: (data: { query: string; coords: { top: number; left: number; bottom: number }; range: { from: number; to: number } }) => void;
  onClose?: () => void;
  onUpdate?: (data: { query: string }) => void;
}

export const SlashCommandKey = new PluginKey('slashCommand');

export function filterSlashItems(items: SlashMenuItem[], query: string): SlashMenuItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return items;

  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(clean);
    const descMatch = item.description.toLowerCase().includes(clean);
    const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(clean));
    return titleMatch || descMatch || keywordMatch;
  });
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      items: [],
      onOpen: undefined,
      onClose: undefined,
      onUpdate: undefined,
    };
  },

  addProseMirrorPlugins() {
    let isMenuOpen = false;
    let queryStartIndex = -1;

    return [
      new Plugin({
        key: SlashCommandKey,
        props: {
          handleKeyDown: (view, event) => {
            if (!isMenuOpen) return false;

            if (event.key === 'Escape') {
              isMenuOpen = false;
              queryStartIndex = -1;
              if (this.options.onClose) this.options.onClose();
              return true;
            }

            return false;
          },
          handleTextInput: (view, from, to, text) => {
            const $from = view.state.doc.resolve(from);
            const lineTextBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

            if (text === '/' && (lineTextBefore.length === 0 || lineTextBefore.endsWith(' '))) {
              isMenuOpen = true;
              queryStartIndex = from;
              const coords = view.coordsAtPos(from);

              if (this.options.onOpen) {
                this.options.onOpen({
                  query: '',
                  coords: {
                    top: coords.top,
                    left: coords.left,
                    bottom: coords.bottom,
                  },
                  range: { from, to: from + 1 },
                });
              }
            } else if (isMenuOpen) {
              const query = lineTextBefore.slice(queryStartIndex - $from.start() + 1) + text;
              if (this.options.onUpdate) {
                this.options.onUpdate({ query });
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

export function executeSlashItem(
  editor: Editor,
  item: SlashMenuItem,
  range?: { from: number; to: number }
) {
  if (range) {
    editor.chain().focus().deleteRange(range).run();
  }
  item.action(editor);
}
