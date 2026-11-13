import {
  Node,
  mergeAttributes,
  wrappingInputRule,
  findParentNode,
} from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import type { CalloutType, CalloutAttributes } from '../types.js';

export interface CalloutNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: Partial<CalloutAttributes>) => ReturnType;
      unsetCallout: () => ReturnType;
      toggleCallout: (attributes?: Partial<CalloutAttributes>) => ReturnType;
      updateCalloutType: (type: CalloutType) => ReturnType;
      updateCalloutIcon: (icon: string | null) => ReturnType;
    };
  }
}

export function normalizeCalloutType(type?: string | null): CalloutType {
  if (!type) return 'note';
  const clean = type.toLowerCase().trim();
  switch (clean) {
    case 'tip':
    case 'dica':
    case 'success':
    case 'sucesso':
      return 'tip';
    case 'important':
    case 'importante':
      return 'important';
    case 'warning':
    case 'alerta':
    case 'aviso':
      return 'warning';
    case 'caution':
    case 'danger':
    case 'perigo':
    case 'cuidado':
      return 'caution';
    case 'note':
    case 'nota':
    case 'info':
    case 'informacao':
    default:
      return 'note';
  }
}

/**
 * Serializes a callout to GitHub / Obsidian Admonition Markdown format:
 * > [!NOTE]
 * > Content line 1
 * > Content line 2
 */
export function calloutToMarkdown(type: CalloutType, content: string): string {
  const label = type.toUpperCase();
  const lines = content.split('\n');
  const formattedLines = lines.map((line) => (line.length > 0 ? `> ${line}` : '>'));
  return `> [!${label}]\n${formattedLines.join('\n')}`;
}

/**
 * Parses a GitHub / Obsidian Admonition or ::: fenced block into Callout data
 */
export function parseMarkdownCallout(
  text: string
): { type: CalloutType; content: string } | null {
  const trimmed = text.trim();

  // Pattern 1: > [!NOTE] or > [!TIP]
  const admonitionMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*\n)?([\s\S]*)$/i);
  if (admonitionMatch) {
    const rawType = admonitionMatch[1] ?? 'NOTE';
    const rawContent = admonitionMatch[2] ?? '';
    const cleanContent = rawContent
      .split('\n')
      .map((line) => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim();

    return {
      type: normalizeCalloutType(rawType),
      content: cleanContent,
    };
  }

  // Pattern 2: :::note ... :::
  const fencedMatch = trimmed.match(/^:::([a-zA-Z0-9_-]+)\s*\n([\s\S]+?)\n?:::$/);
  if (fencedMatch) {
    const rawType = fencedMatch[1] ?? 'note';
    const rawContent = fencedMatch[2] ?? '';
    return {
      type: normalizeCalloutType(rawType),
      content: rawContent.trim(),
    };
  }

  return null;
}

export const CalloutNode = Node.create<CalloutNodeOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'note',
        parseHTML: (element) =>
          normalizeCalloutType(element.getAttribute('data-callout-type')),
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
        }),
      },
      icon: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-callout-icon'),
        renderHTML: (attributes) => {
          if (!attributes.icon) return {};
          return {
            'data-callout-icon': attributes.icon,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
      {
        tag: 'blockquote',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const text = el.textContent?.trim() || '';
          const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
          if (match && match[1]) {
            return {
              type: normalizeCalloutType(match[1]),
            };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': this.name,
          class: 'mind-callout-block',
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },

      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },

      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },

      updateCalloutType:
        (type: CalloutType) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, {
            type: normalizeCalloutType(type),
          });
        },

      updateCalloutIcon:
        (icon: string | null) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, {
            icon: icon || null,
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        if (!selection.empty) return false;

        const { $from } = selection;
        if ($from.parentOffset !== 0) return false;

        const calloutDepth = $from.depth - 1;
        if (calloutDepth >= 0) {
          const calloutNode = $from.node(calloutDepth);
          if (
            calloutNode.type === this.type &&
            calloutNode.childCount === 1 &&
            calloutNode.firstChild?.content.size === 0
          ) {
            const calloutPos = $from.before(calloutDepth);
            const { tr } = state;
            tr.delete(calloutPos, calloutPos + calloutNode.nodeSize);
            tr.setSelection(TextSelection.near(tr.doc.resolve(calloutPos), -1));
            view.dispatch(tr);
            return true;
          }
        }

        const previousPosition = $from.before($from.depth) - 1;
        if (previousPosition < 1) return false;

        const previousPos = state.doc.resolve(previousPosition);
        if (!previousPos?.parent) return false;

        const previousNode = previousPos.parent;
        const parentNode = findParentNode(() => true)(selection);
        if (!parentNode) return false;

        const { node, pos, depth } = parentNode;
        if (depth !== 1) return false;

        if (node.type !== this.type && previousNode.type === this.type) {
          const { content, nodeSize } = node;
          const { tr } = state;
          tr.delete(pos, pos + nodeSize);
          tr.setSelection(TextSelection.near(tr.doc.resolve(previousPosition - 1)));
          tr.insert(previousPosition - 1, content);
          view.dispatch(tr);
          return true;
        }

        return false;
      },

      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        if (!selection.empty) return false;

        const { $from } = selection;
        const calloutDepth = $from.depth - 1;
        if (calloutDepth < 0) return false;

        const calloutNode = $from.node(calloutDepth);
        if (calloutNode.type !== this.type) return false;
        if ($from.parent.content.size !== 0) return false;
        if ($from.index(calloutDepth) !== calloutNode.childCount - 1) {
          return false;
        }

        const paragraphType = state.schema.nodes.paragraph;
        if (!paragraphType) return false;

        const containerDepth = calloutDepth - 1;
        const container = $from.node(containerDepth);
        const indexAfter = $from.indexAfter(containerDepth);
        if (!container.canReplaceWith(indexAfter, indexAfter, paragraphType)) {
          return false;
        }

        const calloutEnd = $from.after(calloutDepth);
        const paragraph = paragraphType.create();
        const { tr } = state;

        if (calloutNode.childCount === 1) {
          tr.insert(calloutEnd, paragraph);
          tr.setSelection(TextSelection.create(tr.doc, calloutEnd + 1));
        } else {
          tr.delete($from.before(), $from.after());
          const insertPos = tr.mapping.map(calloutEnd);
          tr.insert(insertPos, paragraph);
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        }

        view.dispatch(tr);
        return true;
      },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^:::([a-zA-Z0-9_-]+)?[\s\n]$/,
        type: this.type,
        getAttributes: (match) => ({
          type: normalizeCalloutType(match[1]),
        }),
      }),
      wrappingInputRule({
        find: /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i,
        type: this.type,
        getAttributes: (match) => ({
          type: normalizeCalloutType(match[1]),
        }),
      }),
    ];
  },
});
