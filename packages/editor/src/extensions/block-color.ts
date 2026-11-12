import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { BlockColorId, BlockColorOption, BlockColorUpdate } from '../types.js';

export const BLOCK_COLOR_PALETTE: BlockColorOption[] = [
  { id: 'default', label: 'Padrão', textColor: '#111827', backgroundColor: 'transparent' },
  { id: 'gray', label: 'Cinza', textColor: '#6b7280', backgroundColor: '#f1f3f5' },
  { id: 'brown', label: 'Marrom', textColor: '#8d5b4c', backgroundColor: '#f4eeee' },
  { id: 'orange', label: 'Laranja', textColor: '#d9480f', backgroundColor: '#fff4e6' },
  { id: 'yellow', label: 'Amarelo', textColor: '#b07200', backgroundColor: '#fff9db' },
  { id: 'green', label: 'Verde', textColor: '#2b8a3e', backgroundColor: '#ebfbee' },
  { id: 'blue', label: 'Azul', textColor: '#1971c2', backgroundColor: '#e7f5ff' },
  { id: 'purple', label: 'Roxo', textColor: '#7048e8', backgroundColor: '#f3f0ff' },
  { id: 'pink', label: 'Rosa', textColor: '#c2255c', backgroundColor: '#fff0f6' },
  { id: 'red', label: 'Vermelho', textColor: '#c92a2a', backgroundColor: '#fff5f5' },
];

export const BLOCK_COLORABLE_TYPES = [
  'paragraph',
  'heading',
  'listItem',
  'taskItem',
  'blockquote',
  'codeBlock',
  'callout',
] as const;

const VALID_COLOR_IDS = new Set<string>(BLOCK_COLOR_PALETTE.map((c) => c.id));

export function normalizeBlockColorId(value: unknown): BlockColorId | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'default') return null;
  return VALID_COLOR_IDS.has(trimmed) ? (trimmed as BlockColorId) : null;
}

export function getBlockColorOption(id: unknown): BlockColorOption {
  const normalized = normalizeBlockColorId(id);
  return (
    BLOCK_COLOR_PALETTE.find((opt) => opt.id === normalized) ?? BLOCK_COLOR_PALETTE[0]!
  );
}

/**
 * Updates text color and/or background color attributes directly on the block
 * located at `pos` inside the ProseMirror document.
 */
export function applyBlockColorAtPos(
  editor: Editor,
  pos: number,
  update: BlockColorUpdate
): boolean {
  const { state, view } = editor;
  if (pos < 0 || pos >= state.doc.content.size) return false;

  const node = state.doc.nodeAt(pos);
  if (!node) return false;

  const nextAttrs: Record<string, unknown> = { ...node.attrs };

  if (update.textColor !== undefined) {
    nextAttrs.blockTextColor = normalizeBlockColorId(update.textColor);
  }
  if (update.backgroundColor !== undefined) {
    nextAttrs.blockBackgroundColor = normalizeBlockColorId(update.backgroundColor);
  }

  const tr = state.tr.setNodeMarkup(pos, undefined, nextAttrs);
  view.dispatch(tr);
  return true;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockColor: {
      setBlockTextColor: (color: BlockColorId | null) => ReturnType;
      setBlockBackgroundColor: (color: BlockColorId | null) => ReturnType;
      unsetBlockColors: () => ReturnType;
    };
  }
}

export const BlockColor = Extension.create({
  name: 'blockColor',

  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_COLORABLE_TYPES],
        attributes: {
          blockTextColor: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              normalizeBlockColorId(element.getAttribute('data-block-color')),
            renderHTML: (attributes: Record<string, unknown>) => {
              const colorId = normalizeBlockColorId(attributes.blockTextColor);
              if (!colorId) return {};
              return { 'data-block-color': colorId };
            },
          },
          blockBackgroundColor: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              normalizeBlockColorId(element.getAttribute('data-block-bg')),
            renderHTML: (attributes: Record<string, unknown>) => {
              const bgId = normalizeBlockColorId(attributes.blockBackgroundColor);
              if (!bgId) return {};
              return { 'data-block-bg': bgId };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockTextColor:
        (color) =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d >= 1; d--) {
            const node = $from.node(d);
            if ((BLOCK_COLORABLE_TYPES as readonly string[]).includes(node.type.name)) {
              const pos = $from.before(d);
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  blockTextColor: normalizeBlockColorId(color),
                });
              }
              return true;
            }
          }
          return false;
        },

      setBlockBackgroundColor:
        (color) =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d >= 1; d--) {
            const node = $from.node(d);
            if ((BLOCK_COLORABLE_TYPES as readonly string[]).includes(node.type.name)) {
              const pos = $from.before(d);
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  blockBackgroundColor: normalizeBlockColorId(color),
                });
              }
              return true;
            }
          }
          return false;
        },

      unsetBlockColors:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d >= 1; d--) {
            const node = $from.node(d);
            if ((BLOCK_COLORABLE_TYPES as readonly string[]).includes(node.type.name)) {
              const pos = $from.before(d);
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  blockTextColor: null,
                  blockBackgroundColor: null,
                });
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});
