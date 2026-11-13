import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PmNode } from '@tiptap/pm/model';
import type {
  BlockColorId,
  BlockColorOption,
  BlockColorUpdate,
  BlockColorValue,
} from '../types.js';

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
  'subpageBlock',
] as const;

const VALID_COLOR_IDS = new Set<string>(BLOCK_COLOR_PALETTE.map((c) => c.id));
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isCustomHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_REGEX.test(value.trim());
}

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  const match = HEX_COLOR_REGEX.exec(trimmed);
  if (!match) return null;
  const raw = match[1]!;
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  return `#${raw}`;
}

export function normalizeBlockColorValue(value: unknown): BlockColorValue | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'default' || trimmed === 'transparent') return null;
  if (VALID_COLOR_IDS.has(trimmed)) {
    return trimmed as BlockColorId;
  }
  return normalizeHexColor(trimmed);
}

export const normalizeBlockColorId = normalizeBlockColorValue;

export function getBlockColorOption(id: unknown): BlockColorOption {
  const normalized = normalizeBlockColorValue(id);
  if (!normalized) return BLOCK_COLOR_PALETTE[0]!;
  const preset = BLOCK_COLOR_PALETTE.find((opt) => opt.id === normalized);
  if (preset) return preset;
  return {
    id: 'default',
    label: normalized,
    textColor: normalized,
    backgroundColor: normalized,
  };
}

export function getBlockColorDisplayHex(value: unknown, kind: 'text' | 'bg'): string {
  const normalized = normalizeBlockColorValue(value);
  if (!normalized) {
    return kind === 'text' ? '#111827' : 'transparent';
  }
  const preset = BLOCK_COLOR_PALETTE.find((opt) => opt.id === normalized);
  if (preset) {
    return kind === 'text' ? preset.textColor : preset.backgroundColor;
  }
  return normalized;
}

/**
 * Updates text color and/or background color attributes for one or more blocks
 * in a single ProseMirror transaction.
 */
export function applyBlockColorAtPositions(
  editor: Editor,
  positions: number[],
  update: BlockColorUpdate
): boolean {
  const { state, view } = editor;
  const uniqueSorted = Array.from(new Set(positions))
    .filter((pos) => pos >= 0 && pos < state.doc.content.size)
    .sort((a, b) => a - b);

  if (uniqueSorted.length === 0) return false;

  const tr = state.tr;
  let modified = false;

  for (const pos of uniqueSorted) {
    const node = tr.doc.nodeAt(pos);
    if (!node) continue;
    const nextAttrs: Record<string, unknown> = { ...node.attrs };
    if (update.textColor !== undefined) {
      nextAttrs.blockTextColor = normalizeBlockColorValue(update.textColor);
    }
    if (update.backgroundColor !== undefined) {
      nextAttrs.blockBackgroundColor = normalizeBlockColorValue(update.backgroundColor);
    }
    tr.setNodeMarkup(pos, undefined, nextAttrs);
    modified = true;
  }

  if (!modified) return false;
  view.dispatch(tr);
  return true;
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
  return applyBlockColorAtPositions(editor, [pos], update);
}

const CONTAINER_PRIORITY_TYPES = new Set(['listItem', 'taskItem', 'callout', 'blockquote']);

function resolveSelectionColorTarget(editorState: Editor['state']): {
  pos: number;
  node: NonNullable<ReturnType<Editor['state']['doc']['nodeAt']>>;
} | null {
  const { $from } = editorState.selection;
  let fallback: { pos: number; node: NonNullable<ReturnType<Editor['state']['doc']['nodeAt']>> } | null = null;

  for (let d = $from.depth; d >= 1; d--) {
    const node = $from.node(d);
    if ((BLOCK_COLORABLE_TYPES as readonly string[]).includes(node.type.name)) {
      const pos = $from.before(d);
      if (CONTAINER_PRIORITY_TYPES.has(node.type.name)) {
        return { pos, node };
      }
      if (!fallback) {
        fallback = { pos, node };
      }
    }
  }
  return fallback;
}

/**
 * After transforming a block via Turn Into, ensures saved block colors sit on the
 * outer block owner (e.g., listItem/taskItem) rather than an inner wrapped paragraph.
 */
export function syncBlockColorsAtSelection(editor: Editor, update: BlockColorUpdate): boolean {
  const target = resolveSelectionColorTarget(editor.state);
  if (!target) return false;

  const { state, view } = editor;
  const tr = state.tr;
  const nextAttrs: Record<string, unknown> = { ...target.node.attrs };

  if (update.textColor !== undefined) {
    nextAttrs.blockTextColor = normalizeBlockColorId(update.textColor);
  }
  if (update.backgroundColor !== undefined) {
    nextAttrs.blockBackgroundColor = normalizeBlockColorId(update.backgroundColor);
  }

  tr.setNodeMarkup(target.pos, undefined, nextAttrs);

  if (target.node.type.name === 'listItem' || target.node.type.name === 'taskItem') {
    target.node.descendants((child, relPos) => {
      if (
        child.type.name === 'paragraph' &&
        (child.attrs?.blockTextColor || child.attrs?.blockBackgroundColor)
      ) {
        const childPos = target.pos + 1 + relPos;
        tr.setNodeMarkup(childPos, undefined, {
          ...child.attrs,
          blockTextColor: null,
          blockBackgroundColor: null,
        });
      }
      return true;
    });
  }

  view.dispatch(tr);
  return true;
}

const BLOCK_COLOR_SYNC_PLUGIN_KEY = new PluginKey('mindBlockColorSync');
const LIST_OR_QUOTE_CONTAINERS = new Set(['listItem', 'taskItem', 'blockquote']);

function countNodesOfType(doc: PmNode, typeName: string): number {
  let count = 0;
  doc.descendants((node) => {
    if (node.type.name === typeName) count += 1;
    return true;
  });
  return count;
}

function applyContainerColorHoisting(doc: PmNode, tr: Transaction): boolean {
  let modified = false;

  doc.descendants((node, pos) => {
    if (!LIST_OR_QUOTE_CONTAINERS.has(node.type.name)) {
      return true;
    }

    let hoistedText = normalizeBlockColorId(node.attrs?.blockTextColor);
    let hoistedBg = normalizeBlockColorId(node.attrs?.blockBackgroundColor);
    let containerNeedsUpdate = false;
    const clearChildPositions: Array<{ pos: number; attrs: Record<string, unknown> }> = [];

    let offset = 1;
    for (let i = 0; i < node.childCount; i += 1) {
      const child = node.child(i);
      if (child.type.name === 'paragraph') {
        const childText = normalizeBlockColorId(child.attrs?.blockTextColor);
        const childBg = normalizeBlockColorId(child.attrs?.blockBackgroundColor);
        if (childText || childBg) {
          if (!hoistedText && childText) {
            hoistedText = childText;
            containerNeedsUpdate = true;
          }
          if (!hoistedBg && childBg) {
            hoistedBg = childBg;
            containerNeedsUpdate = true;
          }
          clearChildPositions.push({
            pos: pos + offset,
            attrs: {
              ...child.attrs,
              blockTextColor: null,
              blockBackgroundColor: null,
            },
          });
        }
      }
      offset += child.nodeSize;
    }

    if (containerNeedsUpdate) {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        blockTextColor: hoistedText,
        blockBackgroundColor: hoistedBg,
      });
      modified = true;
    }

    for (const childPatch of clearChildPositions) {
      tr.setNodeMarkup(childPatch.pos, undefined, childPatch.attrs);
      modified = true;
    }

    return true;
  });

  return modified;
}

/**
 * Normalizes loaded HTML/JSON documents so any block colors placed on inner list/quote
 * paragraphs are hoisted onto the outer listItem / taskItem / blockquote container.
 */
export function normalizeContainerBlockColors(editor: Editor): boolean {
  const { state, view } = editor;
  const tr = state.tr;
  const modified = applyContainerColorHoisting(state.doc, tr);
  if (!modified) return false;
  tr.setMeta('mindBlockColorSync', true);
  tr.setMeta('addToHistory', false);
  view.dispatch(tr);
  return true;
}

function buildBlockColorSyncTransaction(
  transactions: readonly Transaction[],
  oldState: EditorState,
  newState: EditorState
): Transaction | null {
  if (!transactions.some((t) => t.docChanged)) return null;
  if (transactions.some((t) => t.getMeta('mindBlockColorSync'))) return null;

  const tr = newState.tr;
  let modified = false;

  // Preserve color back onto top-level paragraph when a colored listItem/blockquote is unwrapped
  const { $from: $oldFrom } = oldState.selection;
  for (let d = $oldFrom.depth; d >= 1; d -= 1) {
    const oldNode = $oldFrom.node(d);
    if (!LIST_OR_QUOTE_CONTAINERS.has(oldNode.type.name)) continue;

    const oldText = normalizeBlockColorId(oldNode.attrs?.blockTextColor);
    const oldBg = normalizeBlockColorId(oldNode.attrs?.blockBackgroundColor);
    if (!oldText && !oldBg) break;

    const oldCount = countNodesOfType(oldState.doc, oldNode.type.name);
    const newCount = countNodesOfType(newState.doc, oldNode.type.name);

    if (newCount < oldCount) {
      const { $from: $newFrom } = newState.selection;
      if ($newFrom.depth === 1 && $newFrom.parent.type.name === 'paragraph') {
        const newPara = $newFrom.parent;
        if (!newPara.attrs?.blockTextColor && !newPara.attrs?.blockBackgroundColor) {
          tr.setNodeMarkup($newFrom.before(1), undefined, {
            ...newPara.attrs,
            blockTextColor: oldText,
            blockBackgroundColor: oldBg,
          });
          modified = true;
        }
      }
    }
    break;
  }

  if (applyContainerColorHoisting(tr.doc, tr)) {
    modified = true;
  }

  if (!modified) return null;
  tr.setMeta('mindBlockColorSync', true);
  return tr;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockColor: {
      setBlockTextColor: (color: BlockColorValue | null) => ReturnType;
      setBlockBackgroundColor: (color: BlockColorValue | null) => ReturnType;
      unsetBlockColors: () => ReturnType;
    };
  }
}

export const BlockColor = Extension.create({
  name: 'blockColor',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: BLOCK_COLOR_SYNC_PLUGIN_KEY,
        appendTransaction: (transactions, oldState, newState) =>
          buildBlockColorSyncTransaction(transactions, oldState, newState),
      }),
    ];
  },

  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_COLORABLE_TYPES],
        attributes: {
          blockTextColor: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              normalizeBlockColorValue(element.getAttribute('data-block-color')),
            renderHTML: (attributes: Record<string, unknown>) => {
              const colorVal = normalizeBlockColorValue(attributes.blockTextColor);
              if (!colorVal) return {};
              if (isCustomHexColor(colorVal)) {
                return { 'data-block-color': colorVal, style: `color: ${colorVal};` };
              }
              return { 'data-block-color': colorVal };
            },
          },
          blockBackgroundColor: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              normalizeBlockColorValue(element.getAttribute('data-block-bg')),
            renderHTML: (attributes: Record<string, unknown>) => {
              const bgVal = normalizeBlockColorValue(attributes.blockBackgroundColor);
              if (!bgVal) return {};
              if (isCustomHexColor(bgVal)) {
                return { 'data-block-bg': bgVal, style: `background-color: ${bgVal};` };
              }
              return { 'data-block-bg': bgVal };
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
          const target = resolveSelectionColorTarget(state);
          if (!target) return false;
          if (dispatch) {
            tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              blockTextColor: normalizeBlockColorId(color),
            });
          }
          return true;
        },

      setBlockBackgroundColor:
        (color) =>
        ({ state, tr, dispatch }) => {
          const target = resolveSelectionColorTarget(state);
          if (!target) return false;
          if (dispatch) {
            tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              blockBackgroundColor: normalizeBlockColorId(color),
            });
          }
          return true;
        },

      unsetBlockColors:
        () =>
        ({ state, tr, dispatch }) => {
          const target = resolveSelectionColorTarget(state);
          if (!target) return false;
          if (dispatch) {
            tr.setNodeMarkup(target.pos, undefined, {
              ...target.node.attrs,
              blockTextColor: null,
              blockBackgroundColor: null,
            });
          }
          return true;
        },
    };
  },
});
