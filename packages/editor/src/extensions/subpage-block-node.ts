import { Node, mergeAttributes } from '@tiptap/core';
import type { PageReference } from '../types.js';

export interface SubpageBlockAttrs {
  pageId: string;
  title: string;
  icon: string;
  href: string;
  color: string;
  summary?: string;
}

export interface SubpageBlockOptions {
  HTMLAttributes: Record<string, unknown>;
  getPages?: () => PageReference[];
  onNavigate?: (pageId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subpageBlock: {
      insertSubpageBlock: (attrs: Partial<SubpageBlockAttrs>) => ReturnType;
    };
  }
}

export const SubpageBlockNode = Node.create<SubpageBlockOptions>({
  name: 'subpageBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      getPages: () => [],
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      pageId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-page-id') || '',
        renderHTML: (attrs) => ({ 'data-page-id': attrs.pageId }),
      },
      title: {
        default: 'Subpágina',
        parseHTML: (el) => el.getAttribute('data-title') || 'Subpágina',
        renderHTML: (attrs) => ({ 'data-title': attrs.title }),
      },
      icon: {
        default: '📄',
        parseHTML: (el) => el.getAttribute('data-icon') || '📄',
        renderHTML: (attrs) => ({ 'data-icon': attrs.icon }),
      },
      href: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-href') || '',
        renderHTML: (attrs) => ({ 'data-href': attrs.href }),
      },
      color: {
        default: 'default',
        parseHTML: (el) => el.getAttribute('data-color') || 'default',
        renderHTML: (attrs) => ({ 'data-color': attrs.color }),
      },
      summary: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-summary') || '',
        renderHTML: (attrs) => ({ 'data-summary': attrs.summary }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="subpage-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'subpage-block',
      }),
    ];
  },

  addCommands() {
    return {
      insertSubpageBlock:
        (attrs) =>
        ({ commands }) => {
          const pageId = attrs.pageId ?? '';
          return commands.insertContent({
            type: this.name,
            attrs: {
              pageId,
              title: attrs.title ?? 'Subpágina',
              icon: attrs.icon ?? '📄',
              href: attrs.href ?? (pageId ? `#/page/${pageId}` : ''),
              color: attrs.color ?? 'default',
              summary: attrs.summary ?? '',
            },
          });
        },
    };
  },
});
