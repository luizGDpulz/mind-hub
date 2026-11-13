import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { Fragment } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

export interface DragHandlePositionPayload {
  top: number;
  left: number;
  nodePos: number;
  nodeType: string;
  textColor?: string | null;
  bgColor?: string | null;
}

export interface DropIndicatorPayload {
  visible: boolean;
  top: number;
}

export interface DragHandleOptions {
  dragHandleWidth: number;
  customSelectors?: string[];
  onPositionChange?: (pos: DragHandlePositionPayload | null) => void;
  onDropIndicatorChange?: (indicator: DropIndicatorPayload | null) => void;
}

const DEFAULT_BLOCK_SELECTORS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'pre',
  'hr',
  '.tableWrapper',
  '[data-node-view-wrapper]',
  '[data-type="callout"]',
  '[data-type="mermaid"]',
  '.mind-block-node',
];

const LEFT_GUTTER_HIT_WIDTH = 120;
const RIGHT_GUTTER_HIT_WIDTH = 32;
const LEFT_DROP_HIT_WIDTH = 140;
const RIGHT_DROP_HIT_WIDTH = 48;
const VERTICAL_GAP_TOLERANCE = 28;
const GUTTER_HANDLE_SIZE = 24;
const PILL_CENTER_MAX_HEIGHT = 112;

function collectBlockCandidates(viewDom: HTMLElement): Element[] {
  const candidates: Element[] = [];
  for (const child of Array.from(viewDom.children)) {
    if (child.matches('ul, ol')) {
      const items = Array.from(child.querySelectorAll('li'));
      if (items.length > 0) {
        candidates.push(...items);
        continue;
      }
    }
    candidates.push(child);
  }
  return candidates;
}

function resolveBlockOwner(elem: Element, viewDom: HTMLElement): Element | null {
  if (!viewDom.contains(elem) || elem === viewDom) {
    return null;
  }

  const owner =
    elem.closest('[data-node-view-wrapper]') ||
    elem.closest('.tableWrapper') ||
    elem.closest('pre') ||
    elem.closest('blockquote') ||
    elem.closest('li');

  if (owner && viewDom.contains(owner) && owner !== viewDom) {
    return owner;
  }

  let cur: Element | null = elem;
  while (cur && cur.parentElement !== viewDom) {
    cur = cur.parentElement;
  }
  return cur;
}

function findClosestBlockByVerticalScan(
  clientY: number,
  viewDom: HTMLElement,
  tolerance = VERTICAL_GAP_TOLERANCE
): Element | null {
  const candidates = collectBlockCandidates(viewDom);

  // First pass: exact vertical containment (iterate in reverse so nested list items win)
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    if (!candidate) continue;
    const rect = candidate.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (clientY >= rect.top && clientY <= rect.bottom) {
      return candidate;
    }
  }

  // Second pass: closest block within vertical tolerance
  let bestMatch: Element | null = null;
  let bestDistance = tolerance;
  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const dist = Math.min(
      Math.abs(clientY - rect.top),
      Math.abs(clientY - rect.bottom)
    );
    if (dist <= bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

export interface ResolvedDropTarget {
  targetPos: number;
  placement: 'before' | 'after';
  lineTop: number;
}

/**
 * Resolves the target block & vertical edge ('before' | 'after') during block dragging,
 * projecting across an expanded left margin so dragging along the gutter feels effortless.
 */
export function resolveDropTarget(
  view: EditorView,
  clientX: number,
  clientY: number,
  shellElem?: HTMLElement | null
): ResolvedDropTarget | null {
  const viewRect = view.dom.getBoundingClientRect();
  if (viewRect.width === 0 && viewRect.height === 0) return null;

  if (
    clientX < viewRect.left - LEFT_DROP_HIT_WIDTH ||
    clientX > viewRect.right + RIGHT_DROP_HIT_WIDTH ||
    clientY < viewRect.top - 36 ||
    clientY > viewRect.bottom + 64
  ) {
    return null;
  }

  const clampedY = Math.min(Math.max(clientY, viewRect.top + 2), viewRect.bottom - 2);
  let targetDOM = findBlockDOMAtCoords({ x: clientX, y: clampedY }, view);

  if (!targetDOM) {
    targetDOM = findClosestBlockByVerticalScan(clientY, view.dom, Number.POSITIVE_INFINITY);
  }
  if (!targetDOM) return null;

  const targetPos = getNodePosAtDOM(targetDOM, view);
  if (targetPos === null) return null;

  const targetNode = view.state.doc.nodeAt(targetPos);
  if (!targetNode) return null;

  const blockRect = targetDOM.getBoundingClientRect();
  let placement: 'before' | 'after';
  if (clientY < blockRect.top) {
    placement = 'before';
  } else if (clientY > blockRect.bottom) {
    placement = 'after';
  } else {
    placement = clientY < blockRect.top + blockRect.height / 2 ? 'before' : 'after';
  }

  const lineY = placement === 'before' ? blockRect.top - 2 : blockRect.bottom + 2;
  const shellRect = shellElem?.getBoundingClientRect();
  const lineTop = shellRect ? lineY - shellRect.top : lineY + window.scrollY;

  return {
    targetPos,
    placement,
    lineTop,
  };
}

/**
 * Moves a block from `sourcePos` to before/after `targetPos` safely in a single transaction,
 * automatically adapting cross-list boundaries (e.g. dropping paragraph next to list item).
 */
export function moveBlockAtPos(
  view: EditorView,
  sourcePos: number,
  targetPos: number,
  placement: 'before' | 'after'
): boolean {
  const { state } = view;
  const { doc } = state;

  const sourceNode = doc.nodeAt(sourcePos);
  const targetNode = doc.nodeAt(targetPos);
  if (!sourceNode || !targetNode) return false;

  const sourceFrom = sourcePos;
  const sourceTo = sourcePos + sourceNode.nodeSize;
  let insertPos = placement === 'before' ? targetPos : targetPos + targetNode.nodeSize;

  // No-op if dropping onto its own boundary
  if (insertPos >= sourceFrom && insertPos <= sourceTo) {
    return false;
  }

  const isSourceListItem =
    sourceNode.type.name === 'listItem' || sourceNode.type.name === 'taskItem';
  let nodeToInsert: PmNode = sourceNode;

  const $rawInsert = doc.resolve(insertPos);
  if (!isSourceListItem && $rawInsert.depth >= 1) {
    // Climb out of list container when dropping a top-level block beside a list item
    for (let d = $rawInsert.depth; d >= 1; d--) {
      if (
        $rawInsert.parent.canReplace(
          $rawInsert.index(),
          $rawInsert.index(),
          Fragment.from(nodeToInsert)
        )
      ) {
        break;
      }
      insertPos = placement === 'before' ? $rawInsert.before(d) : $rawInsert.after(d);
    }
  } else if (isSourceListItem && $rawInsert.depth === 0) {
    // Wrap standalone listItem/taskItem in its parent list container when moved outside a list
    const $source = doc.resolve(sourceFrom);
    if ($source.depth >= 1) {
      nodeToInsert = $source.parent.type.create(null, sourceNode);
    }
  }

  const tr = state.tr;
  tr.delete(sourceFrom, sourceTo);
  const mappedInsertPos = tr.mapping.map(insertPos, -1);
  const $mapped = tr.doc.resolve(mappedInsertPos);
  const index = $mapped.index();

  if (!$mapped.parent.canReplace(index, index, Fragment.from(nodeToInsert))) {
    return false;
  }

  tr.insert(mappedInsertPos, nodeToInsert);
  const $placed = tr.doc.resolve(Math.min(mappedInsertPos + 1, tr.doc.content.size));
  tr.setSelection(Selection.near($placed));
  tr.scrollIntoView();
  view.dispatch(tr);
  return true;
}

export function findBlockDOMAtCoords(
  coords: { x: number; y: number },
  view: EditorView,
  extraSelectors: string[] = []
): Element | null {
  const allSelectors = [...DEFAULT_BLOCK_SELECTORS, ...extraSelectors].join(', ');
  const viewRect = view.dom.getBoundingClientRect();
  if (viewRect.width === 0 && viewRect.height === 0) {
    return null;
  }

  // Only detect blocks when cursor is within horizontal and vertical bounds of the editor + left margin
  if (
    coords.x < viewRect.left - LEFT_GUTTER_HIT_WIDTH ||
    coords.x > viewRect.right + RIGHT_GUTTER_HIT_WIDTH ||
    coords.y < viewRect.top - 8 ||
    coords.y > viewRect.bottom + 12
  ) {
    return null;
  }

  const comp = window.getComputedStyle(view.dom);
  const paddingLeft = parseFloat(comp.paddingLeft) || 0;
  const paddingRight = parseFloat(comp.paddingRight) || 0;
  const contentLeft = viewRect.left + paddingLeft + 12;
  const contentRight = Math.max(contentLeft, viewRect.right - paddingRight - 12);

  // Project horizontal sample coordinate inside the editor text column when cursor is in left margin
  const sampleX = Math.min(Math.max(coords.x, contentLeft), contentRight);

  if (typeof document.elementsFromPoint === 'function') {
    const elements = document.elementsFromPoint(sampleX, coords.y);
    for (const elem of elements) {
      if (elem === view.dom) continue;
      if (elem.closest('.ProseMirror') !== view.dom) continue;
      const owner = resolveBlockOwner(elem, view.dom);
      if (owner && (owner.matches(allSelectors) || owner.parentElement === view.dom)) {
        return owner;
      }
    }
  }

  return findClosestBlockByVerticalScan(coords.y, view.dom);
}

function resolveListOwnPillHeight(liElem: Element): number {
  const liRect = liElem.getBoundingClientRect();
  const nestedList = Array.from(liElem.children).find(
    (child) => child.tagName === 'UL' || child.tagName === 'OL'
  );
  if (!nestedList) {
    return liRect.height;
  }
  const nestedRect = nestedList.getBoundingClientRect();
  if (nestedRect.height > 0 && nestedRect.top > liRect.top) {
    return nestedRect.top - liRect.top;
  }
  return liRect.height;
}

export function calculateHandlePosition(
  nodeElem: Element,
  editorShellElem?: HTMLElement | null
): { top: number; left: number; height: number } {
  const rect = nodeElem.getBoundingClientRect();
  const shellRect = editorShellElem?.getBoundingClientRect();

  // For NodeViews wrapping inner blocks (e.g. Callout), align with the first inner text pill
  let alignElem: Element = nodeElem;
  if (nodeElem.hasAttribute('data-node-view-wrapper')) {
    const innerTextBlock = nodeElem.querySelector('p, h1, h2, h3, h4, li');
    if (innerTextBlock) {
      alignElem = innerTextBlock;
    }
  } else if (nodeElem.classList.contains('tableWrapper')) {
    const firstRow = nodeElem.querySelector('th, td, tr');
    if (firstRow) {
      alignElem = firstRow;
    }
  }

  const alignRect = alignElem.getBoundingClientRect();
  const pillHeight = alignElem.matches('li')
    ? resolveListOwnPillHeight(alignElem)
    : alignRect.height;

  let topOffset: number;
  if (pillHeight > 0 && pillHeight <= 4) {
    // Thin horizontal divider (<hr>): center vertically across line
    topOffset = -(GUTTER_HANDLE_SIZE - pillHeight) / 2;
  } else if (pillHeight > 0 && pillHeight <= PILL_CENTER_MAX_HEIGHT) {
    // Treat each normal block as a separate pill and center the gutter vertically in it
    topOffset = Math.max(0, (pillHeight - GUTTER_HANDLE_SIZE) / 2);
  } else {
    // Very tall multi-line / code blocks: keep gutter centered on the first line
    const comp = window.getComputedStyle(alignElem);
    const parsedLineHeight = parseFloat(comp.lineHeight);
    const lineHeight = isNaN(parsedLineHeight)
      ? (parseFloat(comp.fontSize) || 16) * 1.2
      : parsedLineHeight;
    const paddingTop = parseFloat(comp.paddingTop) || 0;
    topOffset = Math.max(0, (lineHeight - GUTTER_HANDLE_SIZE) / 2) + paddingTop;
  }

  if (shellRect) {
    return {
      top: alignRect.top - shellRect.top + topOffset,
      left: rect.left - shellRect.left,
      height: rect.height,
    };
  }

  return {
    top: alignRect.top + window.scrollY + topOffset,
    left: rect.left + window.scrollX,
    height: rect.height,
  };
}

function resolveValidBlockPos(
  rawPos: number,
  nodeElem: Element,
  view: EditorView
): number | null {
  const { doc } = view.state;
  if (rawPos < 0 || rawPos > doc.content.size) {
    return null;
  }

  const $pos = doc.resolve(rawPos);
  if (nodeElem.matches('li')) {
    for (let d = $pos.depth; d >= 1; d--) {
      const ancestor = $pos.node(d);
      if (ancestor.type.name === 'listItem' || ancestor.type.name === 'taskItem') {
        return $pos.before(d);
      }
    }
  }

  if ($pos.depth >= 1) {
    return $pos.before(1);
  }

  if ($pos.nodeAfter) {
    return rawPos;
  }

  if ($pos.nodeBefore) {
    const candidate = rawPos - $pos.nodeBefore.nodeSize;
    if (candidate >= 0 && doc.nodeAt(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getNodePosAtDOM(nodeElem: Element, view: EditorView): number | null {
  if (nodeElem.parentNode) {
    try {
      const siblings = Array.from(nodeElem.parentNode.childNodes);
      const childIndex = siblings.indexOf(nodeElem);
      if (childIndex >= 0) {
        const idxPos = view.posAtDOM(nodeElem.parentNode, childIndex);
        const directNode = view.state.doc.nodeAt(idxPos);
        if (directNode) {
          const domForPos = view.nodeDOM(idxPos);
          if (domForPos === nodeElem) {
            return idxPos;
          }
        }
      }
    } catch {
      // Fallback below
    }
  }

  try {
    const directPos = view.posAtDOM(nodeElem, 0);
    const resolved = resolveValidBlockPos(directPos, nodeElem, view);
    if (resolved !== null) {
      return resolved;
    }
  } catch {
    // Fallback to coordinates below
  }

  const rect = nodeElem.getBoundingClientRect();
  const posAtCoords = view.posAtCoords({
    left: rect.left + Math.min(15, Math.max(1, rect.width / 2)),
    top: rect.top + Math.min(5, Math.max(1, rect.height / 2)),
  });

  if (posAtCoords) {
    const candidate = posAtCoords.inside >= 0 ? posAtCoords.inside : posAtCoords.pos;
    const resolved = resolveValidBlockPos(candidate, nodeElem, view);
    if (resolved !== null) {
      return resolved;
    }
  }

  return null;
}

export const GlobalDragHandleKey = new PluginKey('globalDragHandle');

export const GlobalDragHandle = Extension.create<DragHandleOptions>({
  name: 'globalDragHandle',

  addOptions() {
    return {
      dragHandleWidth: 24,
      customSelectors: [],
      onPositionChange: undefined,
      onDropIndicatorChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    let hoveredNodePos: number | null = null;
    let hoveredNodeType = 'paragraph';
    let activeDragSourcePos: number | null = null;
    let activeDropTarget: ResolvedDropTarget | null = null;
    let lastMouseX: number | null = null;
    let lastMouseY: number | null = null;
    let suppressedByTyping = false;

    const hideHandle = () => {
      if (this.options.onPositionChange) {
        this.options.onPositionChange(null);
      }
    };

    const clearDropIndicator = () => {
      activeDropTarget = null;
      if (this.options.onDropIndicatorChange) {
        this.options.onDropIndicatorChange(null);
      }
    };

    const updateHandleFromPoint = (
      view: EditorView,
      clientX: number,
      clientY: number,
      eventTarget: Element | null
    ) => {
      if (!view.dom.isConnected) return;

      if (!view.editable) {
        hideHandle();
        return;
      }

      if (activeDragSourcePos !== null || view.dom.classList.contains('is-dragging-block')) return;

      const editorRoot = view.dom.closest('.mind-editor-root');

      // Keep the active block locked while hovering the gutter controls or an open popover
      const gutterOrPopover = eventTarget?.closest(
        '.mind-block-gutter-shell, .block-actions-popover'
      );
      if (gutterOrPopover && (!editorRoot || editorRoot.contains(gutterOrPopover))) {
        return;
      }

      // Hide when cursor moves over obstructing UI chrome above/outside the prose surface
      if (
        eventTarget?.closest(
          '[role="dialog"], header, aside, .mind-frontmatter-header, .mind-frontmatter-shell, .mind-note-title-bar, [data-testid="slash-menu-shell"], [data-testid="page-mention-suggest-popover"], [data-testid="bubble-formatting-menu"]'
        )
      ) {
        hideHandle();
        return;
      }

      const target = findBlockDOMAtCoords(
        { x: clientX, y: clientY },
        view,
        this.options.customSelectors
      );

      if (!target) {
        hideHandle();
        return;
      }

      const pos = getNodePosAtDOM(target, view);
      if (pos === null || pos < 0 || pos > view.state.doc.content.size) {
        hideHandle();
        return;
      }

      let nodeType: string;
      let textColor: string | null;
      let bgColor: string | null;
      try {
        const node: PmNode | null = view.state.doc.nodeAt(pos);
        if (!node) {
          hideHandle();
          return;
        }
        nodeType = node.type.name || 'paragraph';
        textColor = (node.attrs?.blockTextColor as string | null) ?? null;
        bgColor = (node.attrs?.blockBackgroundColor as string | null) ?? null;
      } catch {
        hideHandle();
        return;
      }

      hoveredNodePos = pos;
      hoveredNodeType = nodeType;

      if (this.options.onPositionChange) {
        const shell = (view.dom.closest('.mind-editor-canvas-container') ||
          view.dom.parentElement) as HTMLElement | null;
        const calculated = calculateHandlePosition(target, shell);
        this.options.onPositionChange({
          top: calculated.top,
          left: calculated.left,
          nodePos: pos,
          nodeType: hoveredNodeType,
          textColor,
          bgColor,
        });
      }
    };

    return [
      new Plugin({
        key: GlobalDragHandleKey,
        view: (editorView) => {
          const resetDragState = () => {
            activeDragSourcePos = null;
            editorView.dom.classList.remove('is-dragging-block');
            editorView.dragging = null;
            clearDropIndicator();
          };

          // Attach to window/document instead of view.dom.parentElement because
          // @tiptap/vue-3 constructs EditorView inside a temporary detached div
          // before <EditorContent> reparents .ProseMirror into the DOM.
          const onWindowMouseMove = (event: MouseEvent) => {
            if (
              suppressedByTyping &&
              event.clientX === lastMouseX &&
              event.clientY === lastMouseY
            ) {
              return;
            }
            suppressedByTyping = false;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            const targetEl = event.target instanceof Element ? event.target : null;
            updateHandleFromPoint(editorView, event.clientX, event.clientY, targetEl);
          };

          const onDocumentMouseLeave = () => {
            hideHandle();
          };

          const onWindowDragStart = (event: DragEvent) => {
            const targetEl = event.target instanceof Element ? event.target : null;
            const gripBtn = targetEl?.closest('.gutter-grip-btn');
            if (!gripBtn || !event.dataTransfer) return;

            const editorRoot = editorView.dom.closest('.mind-editor-root');
            if (editorRoot && !editorRoot.contains(gripBtn)) return;
            if (hoveredNodePos === null) return;

            const node = editorView.state.doc.nodeAt(hoveredNodePos);
            if (!node) return;

            activeDragSourcePos = hoveredNodePos;

            try {
              event.dataTransfer.clearData();
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('application/x-mind-block', String(hoveredNodePos));
              event.dataTransfer.setData('text/plain', node.textContent || '');

              const blockDom = editorView.nodeDOM(hoveredNodePos);
              if (blockDom instanceof Element) {
                event.dataTransfer.setDragImage(blockDom, 16, 12);
              }

              // Defer class change one frame so browser snapshots full-opacity drag image first
              window.requestAnimationFrame(() => {
                if (activeDragSourcePos !== null) {
                  editorView.dom.classList.add('is-dragging-block');
                }
              });
            } catch {
              resetDragState();
            }
          };

          const onWindowDragOver = (event: DragEvent) => {
            if (activeDragSourcePos === null) return;
            if (!editorView.editable || !editorView.dom.isConnected) return;

            const shell = (editorView.dom.closest('.mind-editor-canvas-container') ||
              editorView.dom.parentElement) as HTMLElement | null;
            const resolved = resolveDropTarget(editorView, event.clientX, event.clientY, shell);

            if (!resolved) {
              clearDropIndicator();
              return;
            }

            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = 'move';
            }

            activeDropTarget = resolved;
            if (this.options.onDropIndicatorChange) {
              this.options.onDropIndicatorChange({
                visible: true,
                top: resolved.lineTop,
              });
            }
          };

          const onWindowDrop = (event: DragEvent) => {
            if (activeDragSourcePos === null) return;
            if (!editorView.editable || !editorView.dom.isConnected) {
              resetDragState();
              return;
            }

            const shell = (editorView.dom.closest('.mind-editor-canvas-container') ||
              editorView.dom.parentElement) as HTMLElement | null;
            const resolved =
              resolveDropTarget(editorView, event.clientX, event.clientY, shell) ??
              activeDropTarget;

            if (resolved) {
              event.preventDefault();
              event.stopPropagation();
              moveBlockAtPos(
                editorView,
                activeDragSourcePos,
                resolved.targetPos,
                resolved.placement
              );
            }

            resetDragState();
            hideHandle();
          };

          const onWindowDragEnd = () => {
            resetDragState();
          };

          window.addEventListener('mousemove', onWindowMouseMove);
          document.addEventListener('mouseleave', onDocumentMouseLeave);
          window.addEventListener('dragstart', onWindowDragStart);
          window.addEventListener('dragover', onWindowDragOver);
          window.addEventListener('drop', onWindowDrop, true);
          window.addEventListener('dragend', onWindowDragEnd);

          return {
            destroy: () => {
              window.removeEventListener('mousemove', onWindowMouseMove);
              document.removeEventListener('mouseleave', onDocumentMouseLeave);
              window.removeEventListener('dragstart', onWindowDragStart);
              window.removeEventListener('dragover', onWindowDragOver);
              window.removeEventListener('drop', onWindowDrop, true);
              window.removeEventListener('dragend', onWindowDragEnd);
            },
          };
        },
        props: {
          handleDOMEvents: {
            keydown: (_view, event) => {
              if (
                !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'].includes(event.key) &&
                !event.ctrlKey &&
                !event.metaKey
              ) {
                suppressedByTyping = true;
                hideHandle();
              }
              return false;
            },
            input: () => {
              suppressedByTyping = true;
              hideHandle();
              return false;
            },
            dragover: (view, event) => {
              if (activeDragSourcePos !== null) {
                event.preventDefault();
                return true;
              }
              return false;
            },
            drop: (view, event) => {
              if (activeDragSourcePos !== null) {
                event.preventDefault();
                return true;
              }
              view.dom.classList.remove('is-dragging-block');
              return false;
            },
          },
        },
      }),
    ];
  },
});
