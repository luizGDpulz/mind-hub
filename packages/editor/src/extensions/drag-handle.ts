import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

export interface DragHandleOptions {
  dragHandleWidth: number;
  customSelectors?: string[];
  onPositionChange?: (
    pos: { top: number; left: number; nodePos: number; nodeType: string } | null
  ) => void;
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

const LEFT_GUTTER_HIT_WIDTH = 110;
const RIGHT_GUTTER_HIT_WIDTH = 32;
const VERTICAL_GAP_TOLERANCE = 28;

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
  viewDom: HTMLElement
): Element | null {
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

  // Second pass: closest block within vertical gap tolerance (margins between blocks / hr)
  let bestMatch: Element | null = null;
  let bestDistance = VERTICAL_GAP_TOLERANCE;
  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const dist = Math.min(
      Math.abs(clientY - rect.top),
      Math.abs(clientY - rect.bottom)
    );
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
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

export function calculateHandlePosition(
  nodeElem: Element,
  editorShellElem?: HTMLElement | null
): { top: number; left: number; height: number } {
  const rect = nodeElem.getBoundingClientRect();
  const shellRect = editorShellElem?.getBoundingClientRect();

  // For NodeViews wrapping inner blocks (e.g. Callout), align with the first line of inner text
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
  const comp = window.getComputedStyle(alignElem);
  const parsedLineHeight = parseInt(comp.lineHeight, 10);
  const lineHeight = isNaN(parsedLineHeight)
    ? (parseInt(comp.fontSize, 10) || 16) * 1.2
    : parsedLineHeight;
  const paddingTop = parseInt(comp.paddingTop, 10) || 0;

  // Align the 20px gutter buttons vertically with first text line (or center on thin <hr>)
  const topOffset =
    alignRect.height > 0 && alignRect.height <= 4
      ? -(20 - alignRect.height) / 2
      : Math.max(0, (lineHeight - 20) / 2) + paddingTop;

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
    };
  },

  addProseMirrorPlugins() {
    let hoveredNodePos: number | null = null;
    let hoveredNodeType = 'paragraph';

    const hideHandle = () => {
      if (this.options.onPositionChange) {
        this.options.onPositionChange(null);
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

      if (view.dom.classList.contains('is-dragging-block')) return;

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
          '[role="dialog"], header, aside, .mind-frontmatter-header, [data-testid="slash-menu-shell"], [data-testid="page-mention-suggest-popover"], [data-testid="bubble-formatting-menu"]'
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
      try {
        const node: PmNode | null = view.state.doc.nodeAt(pos);
        if (!node) {
          hideHandle();
          return;
        }
        nodeType = node.type.name || 'paragraph';
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
        });
      }
    };

    return [
      new Plugin({
        key: GlobalDragHandleKey,
        view: (editorView) => {
          // Attach to window/document instead of view.dom.parentElement because
          // @tiptap/vue-3 constructs EditorView inside a temporary detached div
          // before <EditorContent> reparents .ProseMirror into the DOM.
          const onWindowMouseMove = (event: MouseEvent) => {
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

            try {
              const selection = NodeSelection.create(editorView.state.doc, hoveredNodePos);
              const slice = selection.content();
              const { dom, text } = editorView.serializeForClipboard(slice);

              event.dataTransfer.clearData();
              event.dataTransfer.effectAllowed = 'copyMove';
              event.dataTransfer.setData('text/html', dom.innerHTML);
              event.dataTransfer.setData('text/plain', text);

              const blockDom = editorView.nodeDOM(hoveredNodePos);
              if (blockDom instanceof Element) {
                event.dataTransfer.setDragImage(blockDom, 0, 0);
              }

              editorView.dom.classList.add('is-dragging-block');
              editorView.dispatch(editorView.state.tr.setSelection(selection));
              editorView.dragging = { slice, move: !event.ctrlKey };
              editorView.focus();
            } catch {
              // Ignore if block is not directly NodeSelectable
            }
          };

          const onWindowDragEnd = () => {
            editorView.dom.classList.remove('is-dragging-block');
            editorView.dragging = null;
          };

          window.addEventListener('mousemove', onWindowMouseMove);
          document.addEventListener('mouseleave', onDocumentMouseLeave);
          window.addEventListener('dragstart', onWindowDragStart);
          window.addEventListener('dragend', onWindowDragEnd);

          return {
            destroy: () => {
              window.removeEventListener('mousemove', onWindowMouseMove);
              document.removeEventListener('mouseleave', onDocumentMouseLeave);
              window.removeEventListener('dragstart', onWindowDragStart);
              window.removeEventListener('dragend', onWindowDragEnd);
            },
          };
        },
        props: {
          handleDOMEvents: {
            dragstart: (view) => {
              view.dom.classList.add('is-dragging-block');
              if (
                hoveredNodePos !== null &&
                hoveredNodePos >= 0 &&
                hoveredNodePos < view.state.doc.content.size
              ) {
                try {
                  const tr = view.state.tr.setSelection(
                    NodeSelection.create(view.state.doc, hoveredNodePos)
                  );
                  view.dispatch(tr);
                } catch {
                  // Fallback se o nó não for selecionável diretamente
                }
              }
              return false;
            },
            dragend: (view) => {
              view.dom.classList.remove('is-dragging-block');
              return false;
            },
            drop: (view, event) => {
              view.dom.classList.remove('is-dragging-block');
              const dropCoords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!dropCoords) return false;

              return false;
            },
          },
        },
      }),
    ];
  },
});
