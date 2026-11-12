import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { PageReference } from '../types.js';

export interface PageMentionOptions {
  pages: PageReference[];
  HTMLAttributes: Record<string, unknown>;
  onOpen?: (data: { query: string; coords: { top: number; left: number; bottom?: number }; range: { from: number; to: number } }) => void;
  onClose?: () => void;
  onUpdate?: (data: { query: string }) => void;
  onNavigate?: (pageId: string) => void;
}

export const PageMentionKey = new PluginKey('pageMention');

export function filterPages(pages: PageReference[], query: string): PageReference[] {
  const clean = query.trim().toLowerCase().replace(/^@|^\[\[/, '');
  if (!clean) return pages;

  return pages.filter((page) => {
    const titleMatch = page.title.toLowerCase().includes(clean);
    const slugMatch = page.slug?.toLowerCase().includes(clean);
    const summaryMatch = page.summary?.toLowerCase().includes(clean);
    return titleMatch || slugMatch || summaryMatch;
  });
}

export const PageMention = Node.create<PageMentionOptions>({
  name: 'pageMention',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      pages: [],
      HTMLAttributes: {},
      onOpen: undefined,
      onClose: undefined,
      onUpdate: undefined,
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      pageId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-page-id') || '',
        renderHTML: (attributes) => ({ 'data-page-id': attributes.pageId }),
      },
      title: {
        default: 'Página sem título',
        parseHTML: (element) => element.getAttribute('data-title') || 'Página sem título',
        renderHTML: (attributes) => ({ 'data-title': attributes.title }),
      },
      icon: {
        default: '📄',
        parseHTML: (element) => element.getAttribute('data-icon') || '📄',
        renderHTML: (attributes) => ({ 'data-icon': attributes.icon }),
      },
      slug: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-slug') || '',
        renderHTML: (attributes) => ({ 'data-slug': attributes.slug }),
      },
      summary: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-summary') || '',
        renderHTML: (attributes) => ({ 'data-summary': attributes.summary }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="page-mention"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const icon = node.attrs.icon || '📄';
    const title = node.attrs.title || 'Página';

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'pageMention',
        class: 'mind-page-mention-chip',
        tabindex: '0',
      }),
      ['span', { class: 'mention-icon' }, icon],
      ['span', { class: 'mention-title' }, title],
    ];
  },

  addProseMirrorPlugins() {
    let isMenuOpen = false;
    let queryStartIndex = -1;

    return [
      new Plugin({
        key: PageMentionKey,
        props: {
          handleKeyDown: (_view, event) => {
            if (!isMenuOpen) return false;

            if (event.key === 'Escape') {
              isMenuOpen = false;
              queryStartIndex = -1;
              if (this.options.onClose) this.options.onClose();
              return true;
            }

            return false;
          },
          handleTextInput: (view, from, _to, text) => {
            const $from = view.state.doc.resolve(from);
            const lineTextBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

            const isAtTrigger = text === '@' && (lineTextBefore.length === 0 || lineTextBefore.endsWith(' '));
            const isWikiTrigger = text === '[' && lineTextBefore.endsWith('[');

            if (isAtTrigger || isWikiTrigger) {
              isMenuOpen = true;
              queryStartIndex = isWikiTrigger ? from - 1 : from;
              const coords = view.coordsAtPos(from);

              if (this.options.onOpen) {
                this.options.onOpen({
                  query: '',
                  coords: {
                    top: coords.top,
                    left: coords.left,
                    bottom: coords.bottom,
                  },
                  range: {
                    from: queryStartIndex,
                    to: from + 1,
                  },
                });
              }
            } else if (isMenuOpen) {
              const query = lineTextBefore.slice(queryStartIndex - $from.start()) + text;
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
