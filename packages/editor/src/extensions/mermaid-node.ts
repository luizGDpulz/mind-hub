import { Node, mergeAttributes } from '@tiptap/core';

export interface MermaidNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  defaultCode?: string;
}

export const DEFAULT_MERMAID_CODE = `flowchart TD
    Client["Navegador / App"] --> Proxy["Nginx Proxy Manager"]
    Proxy --> Server["Fastify Backend"]
    Server --> DB[("PostgreSQL")]`;

export const MermaidNode = Node.create<MermaidNodeOptions>({
  name: 'mermaid',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      defaultCode: DEFAULT_MERMAID_CODE,
    };
  },

  addAttributes() {
    return {
      code: {
        default: this.options.defaultCode,
        parseHTML: (element) => {
          return element.getAttribute('data-code') || element.textContent || this.options.defaultCode;
        },
        renderHTML: (attributes) => ({
          'data-code': attributes.code,
        }),
      },
      title: {
        default: 'Diagrama Mermaid',
        parseHTML: (element) => element.getAttribute('data-title') || 'Diagrama Mermaid',
        renderHTML: (attributes) => ({
          'data-title': attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
      {
        tag: 'pre.mermaid',
        getAttrs: (node) => {
          if (typeof node === 'string') return false;
          return {
            code: (node as HTMLElement).textContent || this.options.defaultCode,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'mermaid',
        class: 'mind-mermaid-block',
      }),
      ['pre', { class: 'mermaid-code-hidden' }, HTMLAttributes['data-code'] || ''],
    ];
  },
});
