import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/core';
import type { SlashMenuItem } from '../types.js';

export interface SlashCommandOptions {
  items: SlashMenuItem[];
  onOpen?: (data: {
    query: string;
    coords: { top: number; left: number; bottom: number };
    range: { from: number; to: number };
  }) => void;
  onClose?: () => void;
  onUpdate?: (data: { query: string; range: { from: number; to: number } }) => void;
}

export const SlashCommandKey = new PluginKey('slashCommand');

export function filterSlashItems(items: SlashMenuItem[], query: string): SlashMenuItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return items;

  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(clean);
    const descMatch = item.description ? item.description.toLowerCase().includes(clean) : false;
    const subtitleMatch = item.subtitle ? item.subtitle.toLowerCase().includes(clean) : false;
    const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(clean));
    const shortcutMatch = item.shortcut?.toLowerCase().includes(clean);
    return titleMatch || descMatch || subtitleMatch || keywordMatch || shortcutMatch;
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
    let currentQuery = '';

    return [
      new Plugin({
        key: SlashCommandKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet, oldState, newState) {
            if (!isMenuOpen || currentQuery.length > 0 || queryStartIndex < 0) {
              return DecorationSet.empty;
            }

            // Verify queryStartIndex is still valid in doc
            if (queryStartIndex + 1 > newState.doc.content.size) {
              return DecorationSet.empty;
            }

            const charAt = newState.doc.textBetween(queryStartIndex, queryStartIndex + 1);
            if (charAt !== '/') {
              return DecorationSet.empty;
            }

            const widget = Decoration.widget(queryStartIndex + 1, () => {
              const span = document.createElement('span');
              span.className = 'slash-ghost-hint';
              span.textContent = 'Digite para pesquisar';
              return span;
            });

            return DecorationSet.create(newState.doc, [widget]);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleKeyDown: (view, event) => {
            if (!isMenuOpen) return false;

            if (event.key === 'Escape') {
              isMenuOpen = false;
              queryStartIndex = -1;
              currentQuery = '';
              view.dispatch(view.state.tr);
              if (this.options.onClose) this.options.onClose();
              return true;
            }

            if (event.key === 'Backspace') {
              const { selection } = view.state;
              if (selection.empty && selection.from === queryStartIndex + 1 && currentQuery === '') {
                // Backspacing the slash itself closes the menu
                isMenuOpen = false;
                queryStartIndex = -1;
                currentQuery = '';
                if (this.options.onClose) this.options.onClose();
              }
            }

            return false;
          },
          handleTextInput: (view, from, to, text) => {
            const $from = view.state.doc.resolve(from);
            const lineTextBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              '\ufffc'
            );

            if (text === '/' && (lineTextBefore.length === 0 || lineTextBefore.endsWith(' '))) {
              isMenuOpen = true;
              queryStartIndex = from;
              currentQuery = '';
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
              const rawQuery =
                lineTextBefore.slice(queryStartIndex - $from.start() + 1) + text;
              currentQuery = rawQuery;
              if (this.options.onUpdate) {
                this.options.onUpdate({
                  query: rawQuery,
                  range: { from: queryStartIndex, to: from + text.length },
                });
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

