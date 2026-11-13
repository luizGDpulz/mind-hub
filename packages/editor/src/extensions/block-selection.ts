import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { Fragment } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import {
  collapseFullListDeletionRanges,
  collectBlockCandidates,
  getNodePosAtDOM,
  moveBlocksWithResult,
} from './drag-handle.js';

export interface BlockSelectionOptions {
  onSelectionChange?: (positions: number[]) => void;
}

export interface BlockSelectionState {
  positions: number[];
}

export const BlockSelectionPluginKey = new PluginKey<BlockSelectionState>('mindBlockSelection');

const IGNORED_MARQUEE_TARGET_SELECTOR = [
  '.mind-frontmatter-shell',
  '.mind-frontmatter-header',
  '.mind-note-title-bar',
  '.mind-block-gutter-shell',
  '.block-actions-popover',
  '[data-testid="slash-menu-shell"]',
  '[data-testid="page-mention-suggest-popover"]',
  '[data-testid="bubble-formatting-menu"]',
  '.mind-color-picker-shell',
  'button',
  'input',
  'textarea',
  'select',
  'a',
  'label',
].join(', ');

const LIST_CONTAINER_NAMES = new Set(['bulletList', 'orderedList', 'taskList']);

function normalizeValidPositions(doc: PmNode, rawPositions: number[]): number[] {
  const uniqueSorted = Array.from(new Set(rawPositions))
    .filter((pos) => Number.isInteger(pos) && pos >= 0 && pos < doc.content.size)
    .sort((a, b) => a - b);

  const valid: number[] = [];
  let coveredEnd = -1;
  for (const pos of uniqueSorted) {
    if (pos < coveredEnd) continue;
    const node = doc.nodeAt(pos);
    if (!node) continue;
    valid.push(pos);
    coveredEnd = pos + node.nodeSize;
  }
  return valid;
}

function remapSelectedPositions(
  tr: Transaction,
  prevDoc: PmNode,
  prevPositions: number[]
): number[] {
  if (prevPositions.length === 0) return [];
  const mapped: number[] = [];

  for (const pos of prevPositions) {
    const origNode = prevDoc.nodeAt(pos);
    if (!origNode) continue;

    if (origNode.nodeSize === 1) {
      // Leaf atom nodes (e.g., horizontalRule, mermaid): check span survival across markup/edits
      const start = tr.mapping.map(pos, -1);
      const end = tr.mapping.map(pos + 1, 1);
      if (end > start && tr.doc.nodeAt(start)?.type.name === origNode.type.name) {
        mapped.push(start);
      }
      continue;
    }

    // Track a position inside the opening token (`pos + 1`) so `setNodeMarkup` on this block
    // preserves the selection while full deletion of the block drops it cleanly.
    const res = tr.mapping.mapResult(pos + 1, 1);
    if (res.deleted || res.pos < 0 || res.pos > tr.doc.content.size) {
      continue;
    }

    const $resolved = tr.doc.resolve(res.pos);
    let candidatePos: number | null = null;
    for (let d = $resolved.depth; d >= 1; d -= 1) {
      if ($resolved.node(d).type.name === origNode.type.name) {
        candidatePos = $resolved.before(d);
        break;
      }
    }
    if (candidatePos === null && $resolved.depth >= 1) {
      candidatePos = $resolved.before();
    }

    if (candidatePos !== null && tr.doc.nodeAt(candidatePos)) {
      mapped.push(candidatePos);
    }
  }

  return normalizeValidPositions(tr.doc, mapped);
}

export function getSelectedBlockPositions(state: EditorState): number[] {
  return BlockSelectionPluginKey.getState(state)?.positions ?? [];
}

export function setBlockSelection(view: EditorView, positions: number[]): void {
  const normalized = normalizeValidPositions(view.state.doc, positions);
  const current = getSelectedBlockPositions(view.state);
  if (
    normalized.length === current.length &&
    normalized.every((pos, idx) => pos === current[idx])
  ) {
    return;
  }
  const tr = view.state.tr;
  tr.setMeta(BlockSelectionPluginKey, { positions: normalized });
  tr.setMeta('addToHistory', false);
  view.dispatch(tr);
}

export function clearBlockSelection(view: EditorView): void {
  setBlockSelection(view, []);
}

/**
 * Checks whether `(clientX, clientY)` sits directly over rendered letters/text nodes
 * or inline interactive elements inside `blockElem`, so typing/text selection stays untouched.
 */
export function isPointInsideTextContent(
  blockElem: Element,
  clientX: number,
  clientY: number
): boolean {
  const ownerDoc = blockElem.ownerDocument;
  if (!ownerDoc || typeof ownerDoc.createRange !== 'function') {
    return false;
  }

  const walker = ownerDoc.createTreeWalker(blockElem, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const len = textNode.textContent?.length ?? 0;
    if (len > 0 && textNode.textContent!.trim().length > 0) {
      const range = ownerDoc.createRange();
      range.selectNodeContents(textNode);
      const rects = Array.from(range.getClientRects());
      for (const rect of rects) {
        if (rect.width <= 0 && rect.height <= 0) continue;
        if (
          clientX >= rect.left - 8 &&
          clientX <= rect.right + 8 &&
          clientY >= rect.top - 4 &&
          clientY <= rect.bottom + 4
        ) {
          return true;
        }
      }
    }
    textNode = walker.nextNode();
  }

  return false;
}

/**
 * Determines whether a mousedown outside text content may initiate a Notion-style
 * group marquee selection box (as opposed to normal text caret placement/word selection).
 */
export function shouldStartMarqueeFromPoint(
  view: EditorView,
  targetEl: Element | null,
  clientX: number,
  clientY: number
): boolean {
  if (targetEl?.closest(IGNORED_MARQUEE_TARGET_SELECTOR)) {
    return false;
  }

  const viewRect = view.dom.getBoundingClientRect();
  if (viewRect.width === 0 && viewRect.height === 0) {
    return false;
  }

  // Clicks in outer left/right canvas margins always belong to block selection
  if (clientX < viewRect.left || clientX > viewRect.right) {
    return true;
  }

  const candidates = collectBlockCandidates(view.dom);
  if (candidates.length === 0) {
    return true;
  }

  const firstRect = candidates[0]!.getBoundingClientRect();
  const lastRect = candidates[candidates.length - 1]!.getBoundingClientRect();
  if (clientY < firstRect.top - 4 || clientY > lastRect.bottom + 4) {
    return true;
  }

  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      // Only allow block marquee when starting outside the actual text letters
      return !isPointInsideTextContent(candidate, clientX, clientY);
    }
  }

  return true;
}

export interface ViewportRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function rectsIntersect(a: ViewportRect, b: ViewportRect): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function getCandidateSelectionRect(elem: Element): ViewportRect {
  const rect = elem.getBoundingClientRect();
  if (elem.matches('li')) {
    const nestedList = Array.from(elem.children).find(
      (child) => child.tagName === 'UL' || child.tagName === 'OL'
    );
    if (nestedList) {
      const nestedRect = nestedList.getBoundingClientRect();
      if (nestedRect.height > 0 && nestedRect.top > rect.top) {
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: nestedRect.top,
        };
      }
    }
  }
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

export function findBlocksIntersectingRect(
  view: EditorView,
  selectionRect: ViewportRect
): number[] {
  const candidates = collectBlockCandidates(view.dom);
  const positions: number[] = [];

  for (const elem of candidates) {
    const blockRect = getCandidateSelectionRect(elem);
    if (blockRect.right - blockRect.left === 0 && blockRect.bottom - blockRect.top === 0) {
      continue;
    }
    if (rectsIntersect(selectionRect, blockRect)) {
      const pos = getNodePosAtDOM(elem, view);
      if (pos !== null) {
        positions.push(pos);
      }
    }
  }

  return normalizeValidPositions(view.state.doc, positions);
}

function cleanupEmptyListsInTransaction(tr: Transaction): void {
  const emptyListRanges: Array<{ from: number; to: number }> = [];
  let offset = 0;
  for (let i = 0; i < tr.doc.childCount; i += 1) {
    const child = tr.doc.child(i);
    if (child.childCount === 0 && LIST_CONTAINER_NAMES.has(child.type.name)) {
      emptyListRanges.push({ from: offset, to: offset + child.nodeSize });
    }
    offset += child.nodeSize;
  }
  for (let i = emptyListRanges.length - 1; i >= 0; i -= 1) {
    const r = emptyListRanges[i]!;
    tr.delete(r.from, r.to);
  }
}

/**
 * Deletes all blocks at `positions` in one undoable transaction.
 */
export function deleteBlocksAtPositions(view: EditorView, rawPositions: number[]): boolean {
  const { state } = view;
  const positions = normalizeValidPositions(state.doc, rawPositions);
  if (positions.length === 0) return false;

  const tr = state.tr;
  const ranges: Array<{ from: number; to: number }> = [];
  for (const pos of positions) {
    const node = state.doc.nodeAt(pos);
    if (node) {
      ranges.push({ from: pos, to: pos + node.nodeSize });
    }
  }
  const deleteRanges = collapseFullListDeletionRanges(state.doc, ranges);
  for (let i = deleteRanges.length - 1; i >= 0; i -= 1) {
    const r = deleteRanges[i]!;
    tr.delete(r.from, r.to);
  }

  cleanupEmptyListsInTransaction(tr);

  if (tr.doc.childCount === 0 && state.schema.nodes.paragraph) {
    tr.insert(0, state.schema.nodes.paragraph.create());
  }

  const safeCursor = Math.min(Math.max(1, positions[0]!), Math.max(1, tr.doc.content.size - 1));
  if (tr.doc.content.size >= 2) {
    tr.setSelection(Selection.near(tr.doc.resolve(safeCursor)));
  }

  tr.setMeta(BlockSelectionPluginKey, { positions: [] });
  view.dispatch(tr);
  return true;
}

/**
 * Duplicates one or multiple selected blocks immediately after the last selected block
 * and shifts the block selection onto the duplicated blocks.
 */
export function duplicateBlocksAtPositions(
  view: EditorView,
  rawPositions: number[]
): { duplicated: boolean; newPositions: number[] } {
  const { state } = view;
  const { doc } = state;
  const positions = normalizeValidPositions(doc, rawPositions);
  if (positions.length === 0) return { duplicated: false, newPositions: [] };

  interface DupEntry {
    pos: number;
    node: PmNode;
    parentListPos: number | null;
    parentListType: PmNode['type'] | null;
  }

  const entries: DupEntry[] = [];
  for (const pos of positions) {
    const node = doc.nodeAt(pos);
    if (!node) continue;
    const $pos = doc.resolve(pos);
    const inList =
      $pos.depth >= 1 &&
      LIST_CONTAINER_NAMES.has($pos.parent.type.name) &&
      (node.type.name === 'listItem' || node.type.name === 'taskItem');
    entries.push({
      pos,
      node,
      parentListPos: inList ? $pos.before($pos.depth) : null,
      parentListType: inList ? $pos.parent.type : null,
    });
  }

  if (entries.length === 0) return { duplicated: false, newPositions: [] };

  const firstListPos = entries[0]!.parentListPos;
  const allSameList =
    firstListPos !== null && entries.every((e) => e.parentListPos === firstListPos);

  const tr = state.tr;
  let insertPos: number;
  const clonedNodes: PmNode[] = [];

  if (allSameList) {
    const lastEntry = entries[entries.length - 1]!;
    insertPos = lastEntry.pos + lastEntry.node.nodeSize;
    for (const entry of entries) {
      clonedNodes.push(entry.node.type.create(entry.node.attrs, entry.node.content, entry.node.marks));
    }
  } else {
    const lastEntry = entries[entries.length - 1]!;
    const $last = doc.resolve(lastEntry.pos);
    insertPos =
      $last.depth >= 1 ? $last.after(1) : lastEntry.pos + lastEntry.node.nodeSize;

    let i = 0;
    while (i < entries.length) {
      const entry = entries[i]!;
      if (!entry.parentListType) {
        clonedNodes.push(entry.node.type.create(entry.node.attrs, entry.node.content, entry.node.marks));
        i += 1;
        continue;
      }
      const listType = entry.parentListType;
      const groupItems: PmNode[] = [
        entry.node.type.create(entry.node.attrs, entry.node.content, entry.node.marks),
      ];
      let j = i + 1;
      while (j < entries.length && entries[j]!.parentListType === listType) {
        const nxt = entries[j]!;
        groupItems.push(nxt.node.type.create(nxt.node.attrs, nxt.node.content, nxt.node.marks));
        j += 1;
      }
      clonedNodes.push(listType.create(null, Fragment.fromArray(groupItems)));
      i = j;
    }
  }

  const fragment = Fragment.fromArray(clonedNodes);
  tr.insert(insertPos, fragment);

  const newPositions: number[] = [];
  let cursor = insertPos;
  for (const inserted of clonedNodes) {
    if (LIST_CONTAINER_NAMES.has(inserted.type.name)) {
      let itemOffset = cursor + 1;
      for (let k = 0; k < inserted.childCount; k += 1) {
        newPositions.push(itemOffset);
        itemOffset += inserted.child(k).nodeSize;
      }
    } else {
      newPositions.push(cursor);
    }
    cursor += inserted.nodeSize;
  }

  tr.setMeta(BlockSelectionPluginKey, { positions: newPositions });
  view.dispatch(tr);
  return { duplicated: true, newPositions };
}

/**
 * Moves a contiguous or non-contiguous group of selected blocks one step up or down.
 */
export function moveSelectedBlocksStep(
  view: EditorView,
  rawPositions: number[],
  direction: 'up' | 'down'
): { moved: boolean; newPositions: number[] } {
  const { doc } = view.state;
  const positions = normalizeValidPositions(doc, rawPositions);
  if (positions.length === 0) return { moved: false, newPositions: [] };

  const candidates = collectBlockCandidates(view.dom)
    .map((el) => getNodePosAtDOM(el, view))
    .filter((p): p is number => p !== null);

  if (candidates.length === 0) {
    return { moved: false, newPositions: [] };
  }

  if (direction === 'up') {
    const firstSelected = positions[0]!;
    const idx = candidates.indexOf(firstSelected);
    if (idx <= 0) return { moved: false, newPositions: [] };
    const targetPos = candidates[idx - 1]!;
    return moveBlocksWithResult(view, positions, targetPos, 'before');
  }

  const lastSelected = positions[positions.length - 1]!;
  const idx = candidates.indexOf(lastSelected);
  if (idx < 0 || idx >= candidates.length - 1) return { moved: false, newPositions: [] };
  const targetPos = candidates[idx + 1]!;
  return moveBlocksWithResult(view, positions, targetPos, 'after');
}

function extractBlockInlineAndColors(node: PmNode): {
  inlineContent: Fragment;
  textContent: string;
  blockTextColor: string | null;
  blockBackgroundColor: string | null;
} {
  const blockTextColor = (node.attrs?.blockTextColor as string | null) ?? null;
  const blockBackgroundColor = (node.attrs?.blockBackgroundColor as string | null) ?? null;

  if (node.isTextblock) {
    return {
      inlineContent: node.content,
      textContent: node.textContent,
      blockTextColor,
      blockBackgroundColor,
    };
  }

  let foundTextblock: PmNode | null = null;
  node.descendants((child) => {
    if (!foundTextblock && child.isTextblock) {
      foundTextblock = child;
      return false;
    }
    return true;
  });

  if (foundTextblock) {
    const tb = foundTextblock as PmNode;
    return {
      inlineContent: tb.content,
      textContent: tb.textContent,
      blockTextColor: blockTextColor ?? (tb.attrs?.blockTextColor as string | null) ?? null,
      blockBackgroundColor:
        blockBackgroundColor ?? (tb.attrs?.blockBackgroundColor as string | null) ?? null,
    };
  }

  return {
    inlineContent: Fragment.empty,
    textContent: node.textContent,
    blockTextColor,
    blockBackgroundColor,
  };
}

/**
 * Converts one or more selected blocks to `targetType` while preserving text and block colors.
 */
export function turnIntoBlocksAtPositions(
  editor: Editor,
  rawPositions: number[],
  targetType: string
): { converted: boolean; newPositions: number[] } {
  const { state, view } = editor;
  const { doc, schema } = state;
  const positions = normalizeValidPositions(doc, rawPositions);
  if (positions.length === 0) return { converted: false, newPositions: [] };

  const sourceNodes = positions
    .map((pos) => ({ pos, node: doc.nodeAt(pos) }))
    .filter((item): item is { pos: number; node: PmNode } => Boolean(item.node));

  if (sourceNodes.length === 0) return { converted: false, newPositions: [] };

  const paragraphType = schema.nodes.paragraph;
  if (!paragraphType) return { converted: false, newPositions: [] };

  const convertedNodes: PmNode[] = [];

  if (targetType === 'bulletList' || targetType === 'orderedList' || targetType === 'taskList') {
    const listContainerType = schema.nodes[targetType];
    const itemType = targetType === 'taskList' ? schema.nodes.taskItem : schema.nodes.listItem;
    if (!listContainerType || !itemType) return { converted: false, newPositions: [] };

    const listItems: PmNode[] = [];
    for (const { node } of sourceNodes) {
      const info = extractBlockInlineAndColors(node);
      const pNode = paragraphType.create(null, info.inlineContent);
      const itemAttrs: Record<string, unknown> = {
        blockTextColor: info.blockTextColor,
        blockBackgroundColor: info.blockBackgroundColor,
      };
      if (targetType === 'taskList') {
        itemAttrs.checked = Boolean(node.attrs?.checked);
      }
      listItems.push(itemType.create(itemAttrs, Fragment.from(pNode)));
    }
    convertedNodes.push(listContainerType.create(null, Fragment.fromArray(listItems)));
  } else {
    for (const { node } of sourceNodes) {
      const info = extractBlockInlineAndColors(node);
      const colorAttrs = {
        blockTextColor: info.blockTextColor,
        blockBackgroundColor: info.blockBackgroundColor,
      };

      if (targetType === 'h1' || targetType === 'h2' || targetType === 'h3' || targetType === 'h4') {
        const headingType = schema.nodes.heading;
        if (!headingType) continue;
        const level = Number(targetType.slice(1));
        convertedNodes.push(
          headingType.create({ level, ...colorAttrs }, info.inlineContent)
        );
      } else if (targetType === 'blockquote' && schema.nodes.blockquote) {
        const pNode = paragraphType.create(null, info.inlineContent);
        convertedNodes.push(schema.nodes.blockquote.create(colorAttrs, Fragment.from(pNode)));
      } else if (targetType === 'codeBlock' && schema.nodes.codeBlock) {
        const textNode = info.textContent ? schema.text(info.textContent) : null;
        convertedNodes.push(
          schema.nodes.codeBlock.create(colorAttrs, textNode ? Fragment.from(textNode) : Fragment.empty)
        );
      } else if (targetType === 'callout' && schema.nodes.callout) {
        const pNode = paragraphType.create(null, info.inlineContent);
        convertedNodes.push(schema.nodes.callout.create(colorAttrs, Fragment.from(pNode)));
      } else {
        convertedNodes.push(paragraphType.create(colorAttrs, info.inlineContent));
      }
    }
  }

  if (convertedNodes.length === 0) return { converted: false, newPositions: [] };

  const firstEntry = sourceNodes[0]!;
  const lastEntry = sourceNodes[sourceNodes.length - 1]!;
  const $first = doc.resolve(firstEntry.pos);
  const $last = doc.resolve(lastEntry.pos);

  const isTargetList =
    targetType === 'bulletList' || targetType === 'orderedList' || targetType === 'taskList';

  // Determine exact replace range. When converting listItems inside an existing list into
  // non-list blocks (or when all items of a list are converted), split/replace carefully at top-level.
  const firstInList =
    $first.depth >= 1 && LIST_CONTAINER_NAMES.has($first.parent.type.name);
  const lastInList =
    $last.depth >= 1 && LIST_CONTAINER_NAMES.has($last.parent.type.name);

  const tr = state.tr;
  let insertBasePos: number;
  let nodesToActuallyInsert: PmNode[] = convertedNodes;

  if (isTargetList && firstInList && lastInList && $first.before($first.depth) === $last.before($last.depth)) {
    // Replace contiguous items inside same list container cleanly when targeting a compatible list item
    const targetItemFragment = Fragment.fromArray(
      convertedNodes.flatMap((c) => {
        const items: PmNode[] = [];
        for (let idx = 0; idx < c.childCount; idx += 1) items.push(c.child(idx));
        return items;
      })
    );
    const parentNode = $first.parent;
    if (parentNode.type.name === targetType) {
      const replaceFrom = firstEntry.pos;
      const replaceTo = lastEntry.pos + lastEntry.node.nodeSize;
      tr.replaceWith(replaceFrom, replaceTo, targetItemFragment);
      insertBasePos = replaceFrom;
      nodesToActuallyInsert = [];
      for (let idx = 0; idx < targetItemFragment.childCount; idx += 1) {
        nodesToActuallyInsert.push(targetItemFragment.child(idx));
      }
    } else {
      // Switching list type (e.g. bulletList -> orderedList): replace full top-level slice or split
      const topPos = $first.before(1);
      const topNode = doc.nodeAt(topPos)!;
      if (sourceNodes.length === topNode.childCount) {
        tr.replaceWith(topPos, topPos + topNode.nodeSize, Fragment.fromArray(convertedNodes));
        insertBasePos = topPos;
      } else {
        // Delete selected items and insert new list right after parent list
        for (let i = sourceNodes.length - 1; i >= 0; i -= 1) {
          const item = sourceNodes[i]!;
          tr.delete(item.pos, item.pos + item.node.nodeSize);
        }
        cleanupEmptyListsInTransaction(tr);
        insertBasePos = tr.mapping.map(topPos + topNode.nodeSize, -1);
        tr.insert(insertBasePos, Fragment.fromArray(convertedNodes));
      }
    }
  } else {
    // Delete all source blocks back-to-front, clean empty lists, then insert at mapped start boundary
    const anchorTarget =
      firstInList && !isTargetList
        ? $first.index(1) === 0
          ? $first.before(1)
          : $first.after(1)
        : firstEntry.pos;

    const deleteRanges = collapseFullListDeletionRanges(
      doc,
      sourceNodes.map((item) => ({ from: item.pos, to: item.pos + item.node.nodeSize }))
    );
    for (let i = deleteRanges.length - 1; i >= 0; i -= 1) {
      const r = deleteRanges[i]!;
      tr.delete(r.from, r.to);
    }
    cleanupEmptyListsInTransaction(tr);

    insertBasePos = tr.mapping.map(anchorTarget, -1);
    const $mapped = tr.doc.resolve(insertBasePos);
    if ($mapped.depth >= 1) {
      insertBasePos = $mapped.after(1);
    }

    tr.insert(insertBasePos, Fragment.fromArray(convertedNodes));
  }

  const newPositions: number[] = [];
  let cursor = insertBasePos;
  for (const node of nodesToActuallyInsert) {
    if (LIST_CONTAINER_NAMES.has(node.type.name)) {
      let itemOffset = cursor + 1;
      for (let k = 0; k < node.childCount; k += 1) {
        newPositions.push(itemOffset);
        itemOffset += node.child(k).nodeSize;
      }
    } else {
      newPositions.push(cursor);
    }
    cursor += node.nodeSize;
  }

  if (newPositions.length > 0 && newPositions[0]! < tr.doc.content.size) {
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(newPositions[0]! + 1, tr.doc.content.size))));
  }

  const preserveGroup = sourceNodes.length > 1;
  tr.setMeta(BlockSelectionPluginKey, { positions: preserveGroup ? newPositions : [] });
  view.dispatch(tr);

  return { converted: true, newPositions };
}

export const BlockSelection = Extension.create<BlockSelectionOptions>({
  name: 'blockSelection',

  addOptions() {
    return {
      onSelectionChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const onSelectionChange = this.options.onSelectionChange;

    return [
      new Plugin<BlockSelectionState>({
        key: BlockSelectionPluginKey,
        state: {
          init: () => ({ positions: [] }),
          apply: (tr, value, oldState) => {
            const meta = tr.getMeta(BlockSelectionPluginKey) as BlockSelectionState | undefined;
            if (meta) {
              const next = normalizeValidPositions(tr.doc, meta.positions);
              onSelectionChange?.(next);
              return { positions: next };
            }
            if (tr.docChanged && value.positions.length > 0) {
              const next = remapSelectedPositions(tr, oldState.doc, value.positions);
              onSelectionChange?.(next);
              return { positions: next };
            }
            return value;
          },
        },
        props: {
          decorations: (state) => {
            const selected = BlockSelectionPluginKey.getState(state)?.positions ?? [];
            if (selected.length === 0) return DecorationSet.empty;

            const decos: Decoration[] = [];
            for (const pos of selected) {
              const node = state.doc.nodeAt(pos);
              if (!node) continue;
              decos.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: 'mind-block-selected',
                  'data-block-selected': 'true',
                })
              );
            }
            return DecorationSet.create(state.doc, decos);
          },
          handleKeyDown: (view, event) => {
            const selected = getSelectedBlockPositions(view.state);
            if (selected.length === 0) return false;

            if (event.key === 'Escape') {
              clearBlockSelection(view);
              return true;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
              event.preventDefault();
              deleteBlocksAtPositions(view, selected);
              return true;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
              event.preventDefault();
              duplicateBlocksAtPositions(view, selected);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
